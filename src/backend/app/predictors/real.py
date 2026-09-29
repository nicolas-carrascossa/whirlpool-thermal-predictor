"""Real predictor: one trained model per `key_area`, routed by the manifest.

Implements the `Predictor` protocol (`app/predictors/base.py`) — the single
seam the API layer talks to. It is the only predictor: the offline mock demo
of Fases 0/1 was retired once the trained artifacts took over.

Routing. Each area is served by a fixed algorithm, chosen by the performance it
showed in that area. **The mapping is not hardcoded here**: it lives in
`models/manifest.json` and is exposed to the front-end in
`Metadata.area_algorithms`. Changing the algorithm of an area is a re-export,
not a deploy.

Encoding dictionaries. The 7 variables are categorical, ordinally encoded after
spelling standardisation. The dictionary is read PER ARTIFACT from the manifest
and applied by the model that is going to answer — never a global one. A global
de-para is unsafe by construction: one algorithm collapsing a category is enough
for the codes to stop matching, and the error comes out as a plausible number
with no exception at all. (Both notebooks now fold "Aluminium Plate" into
"Aluminium "; they did not always, which is exactly why this is per artifact.)
A category outside the dictionary is handled in two different ways, because
there are two different situations:

- value outside the canonical options of the contract -> `ContractError` (422),
  same as the mock. The request is wrong.
- value that IS canonical but that a given area never saw in training (its
  `dropna` removed the runs carrying it) -> that AREA is omitted from the
  response, and the others answer normally. Failing the whole request because
  one of seven areas cannot answer would throw away six valid predictions; the
  interface already renders an area without data in grey.

Sensor expansion. `tratamento_final_dos_dados.ipynb` fuses `IGBT 1`..`IGBT 16`
into a single `IGBT` column, so the `IPC Comp` model outputs 22 values for 37
thermocouples. The manifest records that expansion in `sensor_expansion`, and
the value is replicated across the 16 — a team decision, not an inferred
distribution. Sensors with no model (dropped by coverage, or excluded from the
dataset) simply do not appear in the response.
"""

from __future__ import annotations

import json
import warnings
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from typing import Any

import logging

from app.config import get_settings
from app.copy_pt import KEY_AREA_COPY, VARIABLE_COPY
from app.data import (
    ALGORITHM_LABELS,
    CONFIG_FIELDS,
    Dataset,
    load_dataset,
)
from app.predictors.base import ContractError
from app.predictors.codec import canonical_config_key, fnv1a, js_json_stringify, round2
from app.schemas import (
    CONTRACT_VERSION,
    AlgorithmMeta,
    ArchitectureMeta,
    AreaMetrics,
    AreaValidation,
    KeyAreaMeta,
    Metadata,
    MetricsResponse,
    PredictionRequest,
    PredictionResponse,
    SensorMeta,
    SensorPrediction,
    StoveConfig,
    ValidationPoint,
    ValidationRun,
    VariableMeta,
)

MANIFEST_NAME = "manifest.json"

logger = logging.getLogger(__name__)


def _iso_utc(moment: datetime) -> str:
    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=timezone.utc)
    moment = moment.astimezone(timezone.utc)
    return moment.strftime("%Y-%m-%dT%H:%M:%S.") + f"{moment.microsecond // 1000:03d}Z"


class RealPredictor:
    """Routes each requested `key_area` to its trained artifact."""

    def __init__(
        self,
        model_dir: Path | None = None,
        dataset: Dataset | None = None,
        now: Any = None,
    ) -> None:
        self.model_dir = Path(model_dir or get_settings().model_dir)
        self.dataset = dataset or load_dataset()
        self.now = now or (lambda: datetime.now(timezone.utc))
        self.manifest = self._load_manifest()
        self.model_version = str(self.manifest.get("model_set_version", "models-dev"))
        self._areas: dict[str, dict[str, Any]] = self.manifest.get("areas", {})
        #: Loaded artifacts, memoised: 7 models is too much to reload per call.
        self._models: dict[str, Any] = {}
        self._used_variables = self._variables_used_by_models()
        self._warn_on_sklearn_mismatch()

    def _variables_used_by_models(self) -> set[str]:
        """Variables the ARTIFACTS actually use — read, never assumed.

        `IGNORED_FIELDS` records hypothesis H2, which excluded `losses` and
        `board_position` from the Fase 1 MOCK. The trained models are a
        different story: `export_models.py` fits all 7 columns, and in
        `IPC Cooling` and `IPC Comp` `losses` is the single most important
        variable (0.49 and 0.40 of the importance). Reusing the mock's constant
        here made the interface label as "informativo — não usado pelo modelo"
        exactly the variable that dominates two areas' predictions, and made
        `compute_reliability` call two different configurations identical.

        A variable counts as used when at least one area's model splits on it
        (importance > 0). Zero importance everywhere means no output depends on
        it, which is the honest definition of ignored — and it re-derives
        itself at each export instead of drifting from the artifacts.
        """
        trained = set(self.manifest.get("variables") or CONFIG_FIELDS)
        used = {
            variable
            for entry in self._areas.values()
            for variable, importance in (entry.get("feature_importance") or {}).items()
            if importance > 0
        }
        return used & trained

    # --- manifest ----------------------------------------------------------

    def _load_manifest(self) -> dict[str, Any]:
        path = self.model_dir / MANIFEST_NAME
        if not path.exists():
            raise RuntimeError(
                f"Manifesto de modelos não encontrado em {path}. "
                "Rode `python scripts/export_models.py` ou aponte MODEL_DIR para o "
                "diretório dos artefatos."
            )
        with path.open("r", encoding="utf-8") as handle:
            return json.load(handle)

    def _warn_on_sklearn_mismatch(self) -> None:
        """A joblib artifact is sensitive to the version that produced it.

        sklearn only emits an `InconsistentVersionWarning` at load time, which
        is easy to miss in logs — so the mismatch is announced at startup.
        """
        trained_with = self.manifest.get("sklearn_version")
        if not trained_with:
            return
        try:
            import sklearn
        except ImportError:  # pragma: no cover - dependency is pinned
            return
        if sklearn.__version__ != trained_with:
            warnings.warn(
                f"Artefatos treinados com scikit-learn {trained_with}, mas a versão "
                f"carregada é {sklearn.__version__}. As predições podem divergir; "
                "reexporte os modelos ou fixe a versão de treino.",
                RuntimeWarning,
                stacklevel=2,
            )

    # --- artifacts ---------------------------------------------------------

    def _model_for(self, key_area: str) -> Any:
        """Loads (once) the artifact of an area."""
        if key_area in self._models:
            return self._models[key_area]
        entry = self._areas.get(key_area)
        if not entry:
            raise ContractError(
                f'Não há modelo treinado para a área "{key_area}".', "key_areas", key_area
            )
        from joblib import load

        path = self.model_dir / entry["artifact"]
        if not path.exists():
            raise RuntimeError(f"Artefato ausente: {path}")
        model = load(path)
        self._models[key_area] = model
        return model

    # --- encoding ----------------------------------------------------------

    def _to_training(self, key_area: str, config: dict[str, str]) -> dict[str, str]:
        """Canonical contract spelling -> spelling used when training that area.

        The two are NOT the same, and inverse of each other: `build_registry.py`
        canonicalises "To Back" -> "To back" and strips trailing spaces for the
        API, while the notebooks canonicalise "To back" -> "To Back" and keep
        "Aluminium ". The correspondence is resolved once at export time and
        recorded per area in `canonical_to_training`; here it is a lookup.

        An option missing from the table is one this area never saw in training
        (its `dropna` removed the runs that carried it) — `_encode` turns that
        into a 422 rather than a plausible, wrong number.
        """
        table: dict[str, dict[str, str]] = self._areas[key_area].get("canonical_to_training", {})
        return {
            field: table.get(field, {}).get(value, value) for field, value in config.items()
        }

    def _encode(self, key_area: str, config: dict[str, str]) -> list[int]:
        """Encodes the config with the dictionary OF THE MODEL that will answer.

        Applies the same spelling fixes recorded at training time, then the
        ordinal dictionary. Anything outside it is a contract violation.
        """
        entry = self._areas[key_area]
        encoding: dict[str, dict[str, int]] = entry["encoding"]
        trained = self._to_training(key_area, config)

        row: list[int] = []
        for field in CONFIG_FIELDS:
            value = trained[field]
            table = encoding.get(field, {})
            if value not in table:
                accepted = ", ".join(sorted(table))
                raise ContractError(
                    f'Valor inválido para "{field}": "{config[field]}". '
                    f"O modelo de {key_area} conhece apenas: {accepted}.",
                    field,
                    config[field],
                )
            row.append(table[value])
        return row

    # --- reliability -------------------------------------------------------

    def compute_reliability(self, key_area: str, config: dict[str, str]) -> str:
        """Hamming distance to the training combinations OF THAT AREA.

        Same rule as the mock (`mock.compute_reliability`), but measured against
        the configurations the area's own model actually saw — and in the
        TRAINING spelling, since the canonical options of the contract and the
        spelling used at training are not the same string (see `_to_training`).
        """
        train_configs = self._areas[key_area].get("train_configs") or []
        if not train_configs:
            return "out_of_domain"
        trained = self._to_training(key_area, config)
        # Sobre as variaveis que os modelos USAM, nao sobre as 5 da H2: com 5,
        # duas configuracoes que diferem so em `losses` eram classificadas como
        # "interpolacao" (combinacao vista no treino) embora o modelo devolva
        # numeros diferentes para elas.
        fields = sorted(self._used_variables)
        best = len(fields)
        for run in train_configs:
            distance = sum(1 for field in fields if run.get(field) != trained[field])
            best = min(best, distance)
            if best == 0:
                break
        if best == 0:
            return "interpolation"
        return "moderate_extrapolation" if best == 1 else "out_of_domain"

    # --- validation --------------------------------------------------------

    def validate_config(self, config: dict[str, str]) -> None:
        """Same canonical-options check as the mock, before any encoding."""
        for field in CONFIG_FIELDS:
            value = config.get(field)
            options = self.dataset.options_for(field)
            if not isinstance(value, str):
                raise ContractError(
                    f'O campo "{field}" é obrigatório e deve ser um texto.', field, value
                )
            if options and value not in options:
                raise ContractError(
                    f'Valor inválido para "{field}": "{value}". '
                    f"Valores aceitos: {', '.join(options)}.",
                    field,
                    value,
                )

    # --- metadata ----------------------------------------------------------

    def _algorithm_metas(self) -> list[AlgorithmMeta]:
        metas: list[AlgorithmMeta] = []
        for code, label in ALGORITHM_LABELS.items():
            entry = self.manifest.get("algorithms", {}).get(code, {})
            serves = [a for a, alg in self.area_algorithms.items() if alg == code]
            available = all((self.model_dir / self._areas[a]["artifact"]).exists() for a in serves)
            metas.append(
                AlgorithmMeta(
                    code=code,  # type: ignore[arg-type]
                    label_pt=entry.get("label_pt", label),
                    available=bool(serves) and available,
                    model_version=entry.get("model_version", self.model_version),
                    trained_at=entry.get("trained_at"),
                )
            )
        return metas

    @property
    def area_algorithms(self) -> dict[str, str]:
        return dict(self.manifest.get("area_algorithms") or {})

    def get_metadata(self) -> Metadata:
        sensors = self.dataset.sensors
        return Metadata(
            contract_version=CONTRACT_VERSION,
            architectures=[
                ArchitectureMeta(code="BR", available=True, label_pt="Brasil"),
                ArchitectureMeta(
                    code="MX", available=False, label_pt="México (sem dados de treino)"
                ),
            ],
            variables=[
                VariableMeta(
                    name=name,
                    label_pt=VARIABLE_COPY.get(name, {}).get("label_pt", name),
                    help_pt=VARIABLE_COPY.get(name, {}).get("help_pt", ""),
                    options=self.dataset.options_for(name),
                    used_by_model=name in self._used_variables,
                )
                for name in CONFIG_FIELDS
            ],
            sensors=[
                SensorMeta(
                    tc_number=s["tc_number"],
                    tc_name=s["tc_name"],
                    key_area=s["key_area"],
                    active_limit_c=s["active_limit_c"],
                    is_monitor=s["is_monitor"],
                    monitor_reference_c=s["monitor_reference_c"],
                )
                for s in sensors
            ],
            key_areas=[
                KeyAreaMeta(
                    name=name,
                    label_pt=KEY_AREA_COPY.get(name, {}).get("label_pt", name),
                    n_sensors=sum(1 for s in sensors if s["key_area"] == name),
                )
                for name in self.dataset.key_areas
            ],
            reference_config=StoveConfig(**self._reference_config()),
            algorithms=self._algorithm_metas(),
            area_algorithms=self.area_algorithms,  # type: ignore[arg-type]
        )

    def _reference_config(self) -> dict[str, str]:
        """Most frequent run configuration — the demo's initial preset.

        Read from `sensor_stats.json` (same source as the mock), NOT from the
        manifest's `train_configs`: the preset has to be in the canonical
        spelling of the contract, which is the one the interface offers in
        `variables[].options`.
        """
        counts: dict[str, dict[str, Any]] = {}
        for run in self.dataset.run_configs:
            if any(not isinstance(run.get(f), str) for f in CONFIG_FIELDS):
                continue
            config = {f: run[f] for f in CONFIG_FIELDS}
            key = canonical_config_key(config)
            slot = counts.setdefault(key, {"n": 0, "config": config})
            slot["n"] += 1
        if not counts:
            raise ContractError("Nenhuma configuração de referência disponível.", "config", None)
        ranked = sorted(counts.items(), key=lambda kv: (-kv[1]["n"], kv[0]))
        return dict(ranked[0][1]["config"])

    # --- metrics -----------------------------------------------------------

    def get_metrics(self, key_areas: list[str] | None = None) -> MetricsResponse:
        """Validation metrics per area, straight from the manifest."""
        wanted = [a for a in self._areas if not key_areas or a in key_areas]
        unknown = [a for a in (key_areas or []) if a not in self._areas]
        if unknown:
            raise ContractError(
                f"Área desconhecida: {', '.join(unknown)}.", "key_areas", unknown
            )
        areas = []
        for name in wanted:
            entry = self._areas[name]
            m = entry["metrics"]
            areas.append(
                AreaMetrics(
                    key_area=name,
                    algorithm=entry["algorithm"],
                    mae=round(m["mae"], 4),
                    rmse=round(m["rmse"], 4),
                    r2=round(m["r2"], 4),
                    mape_pct=round(m["mape_pct"], 4),
                    within_ten_pct_rate=round(m["within_ten_pct_rate"], 4),
                    feature_importance=entry["feature_importance"],
                    # Pares previsto/real ja resolvidos aos termopares pelo
                    # script de exportacao — aqui e eco, nao derivacao, para a
                    # API e o mock offline servirem os mesmos pontos. So a
                    # config crua de cada ensaio fica de fora: ela existe no
                    # manifesto para auditoria, e o cliente nao tem uso para ela.
                    validation=AreaValidation(
                        runs=[
                            ValidationRun(label=run["label"])
                            for run in entry["validation"]["runs"]
                        ],
                        points=[
                            ValidationPoint.model_validate(p)
                            for p in entry["validation"]["points"]
                        ],
                    ),
                )
            )
        return MetricsResponse(
            model_version=self.model_version,
            areas=areas,
            generated_at=_iso_utc(self.now()),
        )

    # --- prediction --------------------------------------------------------

    def predict(
        self,
        req: PredictionRequest,
        raw_targets: dict[str, Any] | None = None,
    ) -> PredictionResponse:
        config = req.config.model_dump()
        self.validate_config(config)

        # `request_id` hashes the body exactly as it arrived, plus the model set
        # version: reprocessing with new artifacts yields a different id.
        targets_json = js_json_stringify(raw_targets if raw_targets is not None else {})
        request_hash = fnv1a(
            f"{req.architecture}|{canonical_config_key(config)}|{targets_json}"
            f"|{self.model_version}"
        )
        request_id = f"req-{format(request_hash, 'x').rjust(8, '0')}"

        available = req.architecture == "BR"
        response = PredictionResponse(
            request_id=request_id,
            model_version=self.model_version,
            architecture=req.architecture,
            architecture_available=available,
            # Derivado dos artefatos, nao da constante da H2: hoje os 7
            # modelos usam as 7 variaveis, entao a lista sai vazia.
            ignored_fields=[f for f in CONFIG_FIELDS if f not in self._used_variables],
            predictions=[],
            algorithm_by_area={},
            generated_at=_iso_utc(self.now()),
        )
        if not available:
            return response

        wanted_areas = set((req.targets.key_areas if req.targets else None) or [])
        wanted_sensors = set((req.targets.sensors if req.targets else None) or [])
        filtering = bool(wanted_areas) or bool(wanted_sensors)

        sensors_by_number = {s["tc_number"]: s for s in self.dataset.sensors}
        # Only the areas actually asked for get their artifact loaded.
        areas_to_run = [
            area
            for area in self._areas
            if not filtering
            or area in wanted_areas
            or any(sensors_by_number.get(n, {}).get("key_area") == area for n in wanted_sensors)
        ]

        predictions: list[SensorPrediction] = []
        self.skipped_areas: dict[str, str] = {}
        for area in areas_to_run:
            try:
                predictions.extend(
                    self._predict_area(
                        area, config, sensors_by_number, wanted_areas, wanted_sensors, filtering
                    )
                )
            except ContractError as error:
                # Categoria canonica que ESTA area nunca viu: a area sai da
                # resposta, as demais respondem. Registrado para o log/servidor.
                self.skipped_areas[area] = error.message
                logger.info(
                    "area %s omitida da predicao: %s", area, error.message
                )

        predictions.sort(key=lambda p: p.tc_number)
        response.predictions = predictions
        response.algorithm_by_area = {p.key_area: p.algorithm for p in predictions}
        return response

    def _predict_area(
        self,
        area: str,
        config: dict[str, str],
        sensors_by_number: dict[int, dict[str, Any]],
        wanted_areas: set[str],
        wanted_sensors: set[int],
        filtering: bool,
    ) -> list[SensorPrediction]:
        entry = self._areas[area]
        algorithm = entry["algorithm"]
        model = self._model_for(area)
        row = self._encode(area, config)
        values = model.predict([row])[0]

        reliability = self.compute_reliability(area, config)
        mae_by_target: dict[str, float] = entry["metrics"].get("mae_by_target", {})
        expansion: dict[str, list[int]] = entry["sensor_expansion"]

        out: list[SensorPrediction] = []
        for index, target in enumerate(entry["targets"]):
            temp_c = round2(float(values[index]))
            # Margin from the real validation error of THIS target — areas side
            # by side can carry margins from different algorithms, as expected.
            error_margin_c = round2(float(mae_by_target.get(target, entry["metrics"]["mae"])))
            error_margin_pct = round2((error_margin_c / temp_c) * 100 if temp_c > 0 else 0)

            for tc_number in expansion.get(target, []):
                sensor = sensors_by_number.get(tc_number)
                if sensor is None:
                    continue
                included = (
                    True
                    if not filtering
                    else area in wanted_areas or tc_number in wanted_sensors
                )
                if not included:
                    continue

                limit = sensor["active_limit_c"]
                has_limit = isinstance(limit, (int, float)) and not isinstance(limit, bool)
                out.append(
                    SensorPrediction(
                        tc_number=tc_number,
                        tc_name=sensor["tc_name"],
                        key_area=area,
                        temp_c=temp_c,
                        error_margin_c=error_margin_c,
                        error_margin_pct=error_margin_pct,
                        active_limit_c=limit if has_limit else None,
                        exceeds_limit=bool(temp_c > limit) if has_limit else False,
                        limit_ratio=round2(temp_c / limit) if has_limit else None,
                        is_monitor=sensor["is_monitor"],
                        monitor_reference_c=sensor["monitor_reference_c"],
                        reliability=reliability,  # type: ignore[arg-type]
                        algorithm=algorithm,  # type: ignore[arg-type]
                    )
                )
        return out


@lru_cache
def load_real_predictor() -> RealPredictor:
    return RealPredictor()
