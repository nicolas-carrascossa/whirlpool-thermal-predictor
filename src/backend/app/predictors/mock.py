"""Python port of `src/frontend/src/sources/LocalMockSource.ts`.

Bit-for-bit equivalent: same FNV-1a 32-bit hash, same mulberry32 PRNG (32-bit
wraparound and `Math.imul` semantics reproduced explicitly), same clamping and
the same `Math.round(v * 100) / 100` rounding. Parity against the TypeScript
implementation is asserted by `tests/test_parity.py` over the fixture
`src/contracts/fixtures/mock_parity_v1.json`.

It is not a model: it is a deterministic generator calibrated by the real
dataset statistics and by the H1/H3/H4 signals. Fase 3 replaces it with
`app/predictors/real.py` behind the very same protocol.
"""

from __future__ import annotations

import json
import math
from datetime import datetime, timezone
from typing import Any, Callable

from app.copy_pt import KEY_AREA_COPY, VARIABLE_COPY
from app.data import (
    ALGORITHM_LABELS,
    CONFIG_FIELDS,
    IGNORED_FIELDS,
    MODEL_FIELDS,
    Dataset,
    load_dataset,
)
from app.predictors.base import ContractError
from app.schemas import (
    AlgorithmMeta,
    CONTRACT_VERSION,
    ArchitectureMeta,
    KeyAreaMeta,
    Metadata,
    PredictionRequest,
    PredictionResponse,
    SensorMeta,
    SensorPrediction,
    StoveConfig,
    VariableMeta,
)

MODEL_VERSION = "mock-0.1.0"

UINT32 = 0xFFFFFFFF


# ---------------------------------------------------------------------------
# JavaScript arithmetic primitives
# ---------------------------------------------------------------------------


def imul(a: int, b: int) -> int:
    """`Math.imul` as an unsigned 32-bit value (bit pattern is identical)."""
    return (a * b) & UINT32


def fnv1a(text: str) -> int:
    """FNV-1a over UTF-16 code units (JS `charCodeAt`), returned as uint32."""
    h = 0x811C9DC5
    for unit in _utf16_code_units(text):
        h = (h ^ unit) & UINT32
        h = imul(h, 0x01000193)
    return h & UINT32


def _utf16_code_units(text: str) -> list[int]:
    """Code units exactly as `String.prototype.charCodeAt` yields them."""
    units: list[int] = []
    for char in text:
        code = ord(char)
        if code > 0xFFFF:  # astral plane -> surrogate pair
            code -= 0x10000
            units.append(0xD800 + (code >> 10))
            units.append(0xDC00 + (code & 0x3FF))
        else:
            units.append(code)
    return units


def mulberry32(seed: int) -> Callable[[], float]:
    """Port of the mulberry32 PRNG used by the TypeScript mock."""
    state = seed & UINT32

    def next_float() -> float:
        nonlocal state
        state = (state + 0x6D2B79F5) & UINT32
        t = state
        t = imul(t ^ (t >> 15), t | 1)
        t = (t ^ (t + imul(t ^ (t >> 7), t | 61))) & UINT32
        return ((t ^ (t >> 14)) & UINT32) / 4294967296

    return next_float


def js_round(value: float) -> float:
    """`Math.round`: half rounds towards +Infinity (Python's round does not)."""
    floor = math.floor(value)
    return float(floor + 1) if value - floor >= 0.5 else float(floor)


def round2(value: float) -> float:
    return js_round(value * 100) / 100


def js_json_stringify(value: Any) -> str:
    """`JSON.stringify` for the plain JSON subset used by `request_id`."""
    return json.dumps(
        _js_numbers(value), ensure_ascii=False, separators=(",", ":"), allow_nan=False
    )


def _js_numbers(value: Any) -> Any:
    """JS prints `1.0` as `1`; normalize integral floats before dumping."""
    if isinstance(value, bool):
        return value
    if isinstance(value, float) and value.is_integer():
        return int(value)
    if isinstance(value, dict):
        return {k: _js_numbers(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_js_numbers(v) for v in value]
    return value


# ---------------------------------------------------------------------------
# Canonical keys
# ---------------------------------------------------------------------------


def canonical_config_key(config: dict[str, str]) -> str:
    return "|".join(f"{f}={config[f]}" for f in CONFIG_FIELDS)


def canonical_model_key(config: dict[str, str]) -> str:
    """Only the 5 model variables feed the seed, so `losses` and
    `board_position` provably cannot change a prediction (H2)."""
    return "|".join(f"{f}={config[f]}" for f in MODEL_FIELDS)


# ---------------------------------------------------------------------------
# Area multipliers (H1/H4)
# ---------------------------------------------------------------------------


def area_multiplier(config: dict[str, str], key_area: str) -> float:
    m = 1.0

    # housing (H4) — open housing heats the power electronics
    if config["housing"] in ("Open", "Open - Updated"):
        gain = 1.08 if config["housing"] == "Open" else 1.06
        m *= gain if key_area in ("IPC Comp", "IPC Cooling") else 0.98

    # deflector_hole (H1) — redistributes heat, does not remove it
    if config["deflector_hole"] == "Open":
        if key_area in ("IPC Comp", "IPC Cooling", "Oven HMI"):
            m *= 1.05
        elif key_area in ("Main Vent Sys", "Mainback"):
            m *= 0.95

    # blower_direction — "To back" hurts both electronics areas
    if config["blower_direction"] == "To back":
        if key_area in ("IPC Comp", "IPC Cooling"):
            m *= 1.05

    # material_coil_support — conduction around the heating element
    if key_area == "Coil Temps":
        if config["material_coil_support"] == "Plastic":
            m *= 1.04
        elif config["material_coil_support"] == "Aluminium Plate":
            m *= 0.98

    # losses and board_position: no effect (H2).
    return m


# ---------------------------------------------------------------------------
# Predictor
# ---------------------------------------------------------------------------


class MockPredictor:
    """Implements `app.predictors.base.Predictor`."""

    model_version = MODEL_VERSION

    def __init__(
        self,
        dataset: Dataset | None = None,
        now: Callable[[], datetime] | None = None,
    ) -> None:
        self.dataset = dataset or load_dataset()
        self.now = now or (lambda: datetime.now(timezone.utc))
        self.reference_config = self._pick_reference_config()

    # --- reliability -------------------------------------------------------

    def compute_reliability(self, config: dict[str, str]) -> tuple[int, str, str | None]:
        """Minimum Hamming distance to the training combinations (5 variables)."""
        best = len(MODEL_FIELDS)
        best_run: str | None = None
        for run in self.dataset.run_configs:
            d = sum(1 for f in MODEL_FIELDS if run.get(f) != config[f])
            if d < best:
                best = d
                best_run = run["run_id"]
                if d == 0:
                    break
        reliability = (
            "interpolation"
            if best == 0
            else "moderate_extrapolation"
            if best == 1
            else "out_of_domain"
        )
        return best, reliability, best_run

    # --- reference config --------------------------------------------------

    def _pick_reference_config(self) -> dict[str, str]:
        counts: dict[str, dict[str, Any]] = {}
        for run in self.dataset.run_configs:
            if any(not isinstance(run.get(f), str) for f in CONFIG_FIELDS):
                continue
            config = {f: run[f] for f in CONFIG_FIELDS}
            key = canonical_config_key(config)
            entry = counts.get(key)
            if entry:
                entry["n"] += 1
            else:
                counts[key] = {"n": 1, "config": config}
        if not counts:
            raise ContractError("Nenhuma configuração de referência disponível.", "config", None)
        # Ties broken by the canonical key, so the reference config is stable.
        ranked = sorted(counts.items(), key=lambda kv: (-kv[1]["n"], kv[0]))
        return dict(ranked[0][1]["config"])

    # --- validation --------------------------------------------------------

    def validate_config(self, config: dict[str, str]) -> None:
        for field in CONFIG_FIELDS:
            value = config.get(field)
            options = self.dataset.options_for(field)
            if not isinstance(value, str):
                raise ContractError(
                    f'O campo "{field}" é obrigatório e deve ser um texto.', field, value
                )
            if value not in options:
                raise ContractError(
                    f'Valor inválido para "{field}": "{value}". '
                    f"Valores aceitos: {', '.join(options)}.",
                    field,
                    value,
                )

    # --- metadata ----------------------------------------------------------

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
                    used_by_model=name not in IGNORED_FIELDS,
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
            reference_config=StoveConfig(**self.reference_config),
            algorithms=self._algorithm_metas(),
            area_algorithms=dict(self.dataset.area_algorithms),
        )

    def _algorithm_metas(self) -> list[AlgorithmMeta]:
        """Algorithm metas from the manifest; `available=False` in mock mode,
        since no real artifact is loaded."""
        metas: list[AlgorithmMeta] = []
        for code, label in ALGORITHM_LABELS.items():
            entry = self.dataset.algorithms.get(code, {})
            metas.append(
                AlgorithmMeta(
                    code=code,  # type: ignore[arg-type]
                    label_pt=entry.get("label_pt", label),
                    available=False,
                    model_version=entry.get("model_version", MODEL_VERSION),
                    trained_at=entry.get("trained_at"),
                )
            )
        return metas

    # --- prediction --------------------------------------------------------

    def predict(
        self,
        req: PredictionRequest,
        raw_targets: dict[str, Any] | None = None,
    ) -> PredictionResponse:
        config = req.config.model_dump()
        self.validate_config(config)

        targets_json = js_json_stringify(raw_targets if raw_targets is not None else {})
        seed = fnv1a(f"{req.architecture}|{canonical_model_key(config)}")
        request_hash = fnv1a(
            f"{req.architecture}|{canonical_config_key(config)}|{targets_json}"
        )
        request_id = f"req-{format(request_hash, 'x').rjust(8, '0')}"

        available = req.architecture == "BR"
        base = PredictionResponse(
            request_id=request_id,
            model_version=MODEL_VERSION,
            architecture=req.architecture,
            architecture_available=available,
            ignored_fields=list(IGNORED_FIELDS),
            predictions=[],
            algorithm_by_area={},
            generated_at=_iso_utc(self.now()),
        )
        if not available:
            return base

        _, reliability, _ = self.compute_reliability(config)
        rand = mulberry32(seed)

        wanted_areas = (req.targets.key_areas if req.targets else None) or []
        wanted_sensors = (req.targets.sensors if req.targets else None) or []
        filtering = bool(wanted_areas) or bool(wanted_sensors)

        predictions: list[SensorPrediction] = []
        for sensor in self.dataset.sensors:
            stat = self.dataset.per_sensor.get(str(sensor["tc_number"]))
            # Noise is consumed for EVERY sensor, in the fixed order, so that
            # filtering targets never changes the returned values.
            noise_unit = rand() * 2 - 1
            if not stat:
                continue

            included = (
                True
                if not filtering
                else sensor["key_area"] in wanted_areas
                or sensor["tc_number"] in wanted_sensors
            )
            if not included:
                continue

            by_run_case = stat.get("by_run_case") or {}
            entry = by_run_case.get(config["run_case"])
            base_temp = entry["mean"] if entry else stat["mean"]
            adjusted = base_temp * area_multiplier(config, sensor["key_area"])
            noisy = adjusted + noise_unit * 0.25 * stat["std"]
            temp_c = round2(min(max(noisy, stat["min"] * 0.9), stat["max"] * 1.1))

            error_margin_c = round2(max(0.5 * stat["std"], 1))
            error_margin_pct = round2((error_margin_c / temp_c) * 100 if temp_c > 0 else 0)

            limit = sensor["active_limit_c"]
            has_limit = isinstance(limit, (int, float)) and not isinstance(limit, bool)

            predictions.append(
                SensorPrediction(
                    tc_number=sensor["tc_number"],
                    tc_name=sensor["tc_name"],
                    key_area=sensor["key_area"],
                    temp_c=temp_c,
                    error_margin_c=error_margin_c,
                    error_margin_pct=error_margin_pct,
                    active_limit_c=limit if has_limit else None,
                    exceeds_limit=bool(temp_c > limit) if has_limit else False,
                    limit_ratio=round2(temp_c / limit) if has_limit else None,
                    is_monitor=sensor["is_monitor"],
                    monitor_reference_c=sensor["monitor_reference_c"],
                    reliability=reliability,
                    # The mock has no two models: it echoes the manifest mapping,
                    # so the interface exercises the same code path as `real`.
                    algorithm=self.dataset.algorithm_for(sensor["key_area"]),  # type: ignore[arg-type]
                )
            )

        base.predictions = predictions
        base.algorithm_by_area = {
            p.key_area: p.algorithm for p in predictions
        }
        return base


def _iso_utc(moment: datetime) -> str:
    """ISO-8601 with milliseconds and a `Z`, like JS `Date.toISOString()`."""
    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=timezone.utc)
    moment = moment.astimezone(timezone.utc)
    return moment.strftime("%Y-%m-%dT%H:%M:%S.") + f"{moment.microsecond // 1000:03d}Z"
