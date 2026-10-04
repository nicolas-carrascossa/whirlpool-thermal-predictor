"""Real predictor (MODEL_MODE=real): routing, slicing, dictionaries and log.

These tests need the artifacts produced by `scripts/export_models.py`; without
`models/manifest.json` the whole module is skipped, so a fresh clone does not
fail before the first export.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from app.predictors.base import ContractError
from app.schemas import PredictionRequest

REPO_ROOT = Path(__file__).resolve().parents[3]
MODEL_DIR = REPO_ROOT / "models"

pytestmark = pytest.mark.skipif(
    not (MODEL_DIR / "manifest.json").exists(),
    reason="artefatos ausentes; rode `python scripts/export_models.py`",
)


@pytest.fixture(scope="module")
def engine():
    from app.predictors.real import RealPredictor

    return RealPredictor(model_dir=MODEL_DIR)


@pytest.fixture(scope="module")
def config(engine) -> dict[str, str]:
    return engine._reference_config()


@pytest.fixture(scope="module")
def manifest() -> dict:
    return json.loads((MODEL_DIR / "manifest.json").read_text(encoding="utf-8"))


def test_every_area_is_served_by_the_algorithm_in_the_manifest(engine, config, manifest) -> None:
    """Each of the 7 areas answers with the algorithm the manifest declares."""
    expected = manifest["area_algorithms"]
    assert len(expected) == 7

    response = engine.predict(PredictionRequest(architecture="BR", config=config))
    for area, algorithm in response.algorithm_by_area.items():
        assert algorithm == expected[area], area
    # Every prediction carries its own provenance, not only the summary map.
    for prediction in response.predictions:
        assert prediction.algorithm == expected[prediction.key_area]


def test_model_version_is_the_set_version(engine, config, manifest) -> None:
    response = engine.predict(PredictionRequest(architecture="BR", config=config))
    assert response.model_version == manifest["model_set_version"]


def test_request_id_changes_with_the_model_set(engine, config) -> None:
    """Reprocessing with new artifacts must not reuse the previous id."""
    first = engine.predict(PredictionRequest(architecture="BR", config=config)).request_id
    original = engine.model_version
    try:
        engine.model_version = "models-9.9.9"
        second = engine.predict(PredictionRequest(architecture="BR", config=config)).request_id
    finally:
        engine.model_version = original
    assert first != second


def test_area_slice_is_honoured(engine, config) -> None:
    response = engine.predict(
        PredictionRequest(architecture="BR", config=config, targets={"key_areas": ["Oven HMI"]})
    )
    assert response.predictions
    assert {p.key_area for p in response.predictions} == {"Oven HMI"}


def test_sensor_slice_is_more_specific_than_area(engine, config) -> None:
    """Same semantics as the mock: an explicit sensor list wins."""
    response = engine.predict(
        PredictionRequest(architecture="BR", config=config, targets={"sensors": [1, 36]})
    )
    assert sorted(p.tc_number for p in response.predictions) == [1, 36]


def test_empty_targets_returns_every_modelled_sensor(engine, config) -> None:
    response = engine.predict(PredictionRequest(architecture="BR", config=config))
    assert len(response.predictions) == 74  # 77 - Oven RTD - 2 sem cobertura


def test_igbts_share_the_consolidated_value(engine, config) -> None:
    """`IGBT 1`..`IGBT 16` were fused at training; the value is replicated."""
    response = engine.predict(
        PredictionRequest(architecture="BR", config=config, targets={"key_areas": ["IPC Comp"]})
    )
    igbts = [p for p in response.predictions if p.tc_name.strip().startswith("IGBT ")]
    assert len(igbts) == 16
    assert len({p.temp_c for p in igbts}) == 1


def test_value_outside_canonical_options_is_422_in_portuguese(engine, config) -> None:
    broken = dict(config, housing="Inexistente")
    with pytest.raises(ContractError) as exc:
        engine.predict(PredictionRequest(architecture="BR", config=broken))
    assert 'Valor inválido para "housing"' in exc.value.message
    assert exc.value.field == "housing"


def test_canonical_option_unknown_to_one_area_skips_only_that_area(engine, config, manifest) -> None:
    """A valid option that a single area never saw removes that area, not the call."""
    unmapped = {
        area: fields
        for area, entry in manifest["areas"].items()
        if (fields := entry.get("unmapped_options"))
    }
    if not unmapped:
        pytest.skip("nenhuma área com opção canônica ausente no treino")

    area, fields = next(iter(unmapped.items()))
    field, values = next(iter(fields.items()))
    response = engine.predict(
        PredictionRequest(architecture="BR", config=dict(config, **{field: values[0]}))
    )
    assert area not in response.algorithm_by_area
    assert response.predictions, "as demais áreas têm de responder"
    assert area in engine.skipped_areas


def test_every_catalog_option_reaches_every_area_model(engine, config, manifest) -> None:
    """Toda opcao que o catalogo oferece tem de ser aceita pelo modelo de TODAS as areas.

    Se os CSVs de treino perdem linhas (por exemplo, descarte de run inteiro por
    um unico alvo nulo), categorias inteiras somem do dicionario de uma area e
    ela passa a ser omitida da resposta em silencio. O que o usuario pode
    escolher precisa poder chegar a cada modelo.
    """
    unmapped = {
        area: entry["unmapped_options"]
        for area, entry in manifest["areas"].items()
        if entry.get("unmapped_options")
    }
    assert not unmapped, f"opcoes do catalogo sem categoria de treino: {unmapped}"

    for variable in manifest["variables"]:
        for option in engine.dataset.options_for(variable):
            for area in manifest["areas"]:
                engine._encode(area, dict(config, **{variable: option}))


def test_area_that_cannot_encode_an_option_is_skipped_not_guessed(config) -> None:
    """A rede de seguranca continua valendo: area que nao conhece a opcao sai da resposta.

    O cenario e montado em memoria (um preditor proprio, com uma categoria
    removida do dicionario de uma area), porque os artefatos exportados hoje
    cobrem todas as opcoes do catalogo e o teste acima garante que seguem assim.
    """
    from app.predictors.real import RealPredictor

    isolated = RealPredictor(model_dir=MODEL_DIR)
    area, variable, option = "IPC Comp", "deflector_hole", "Open"
    entry = isolated._areas[area]
    trained = entry["canonical_to_training"][variable].pop(option)
    del entry["encoding"][variable][trained]

    response = isolated.predict(
        PredictionRequest(architecture="BR", config=dict(config, **{variable: option}))
    )
    assert area not in response.algorithm_by_area
    assert response.predictions, "as demais áreas têm de responder"
    assert area in isolated.skipped_areas


def test_each_area_carries_its_own_encoding(manifest) -> None:
    """The dictionary is per artifact, never global.

    A global de-para is unsafe by construction: one algorithm collapsing a
    category is enough for the codes to stop matching, and the error comes out
    as a plausible number with no exception at all. Each area therefore ships
    its own `encoding` and its own canonical -> training table.
    """
    for area, entry in manifest["areas"].items():
        assert entry["encoding"], area
        assert entry["canonical_to_training"], area
        # Toda categoria de treino tem de ser alcançável por alguma opção
        # canônica; senão o modelo tem um nível que a interface não sabe pedir.
        #
        # Exceção conhecida: o marcador de ausência de dado. `build_registry.py`
        # trata `losses = "Não informado"` como dado faltante e o deixa fora das
        # opções canônicas, mas ele continua sendo uma categoria literal nos CSVs
        # por área. O modelo guarda um código para ele que nunca é solicitado —
        # inofensivo, porque treino e inferência usam o mesmo dicionário.
        missing_markers = {"Não informado", "Nao Informado"}
        for variable, table in entry["canonical_to_training"].items():
            unreachable = set(entry["encoding"][variable]) - set(table.values()) - missing_markers
            assert not unreachable, f"{area}.{variable}: {unreachable}"


def test_material_is_consistent_across_every_area(engine, config, manifest) -> None:
    """"Aluminium Plate" é normalizado para "Aluminium" nos 7 modelos.

    O glossário do parceiro documenta só 2 níveis e o valor aparece em 1 run de
    56 (ver `documents/extras/hipotese_material_sem_correcao_E17.md`). Antes desta
    normalização, escolhê-lo fazia 4 áreas tratarem como Aluminium, 2 usarem
    uma categoria treinada com um único run, e `IPC Comp` sumir da resposta.
    """
    for entry in manifest["areas"].values():
        assert set(entry["encoding"]["material_coil_support"]) == {"Aluminium ", "Plastic "}

    aluminium = engine.predict(
        PredictionRequest(architecture="BR", config=dict(config, material_coil_support="Aluminium"))
    )
    plate = engine.predict(
        PredictionRequest(
            architecture="BR", config=dict(config, material_coil_support="Aluminium Plate")
        )
    )
    plastic = engine.predict(
        PredictionRequest(architecture="BR", config=dict(config, material_coil_support="Plastic"))
    )

    # Mesmo material: mesmas áreas, mesmas temperaturas.
    assert set(plate.algorithm_by_area) == set(aluminium.algorithm_by_area)
    assert len(plate.predictions) == len(aluminium.predictions)
    by_tc = {p.tc_number: p.temp_c for p in aluminium.predictions}
    assert all(by_tc[p.tc_number] == p.temp_c for p in plate.predictions)

    # Material de fato distinto continua mudando a predição.
    plastic_by_tc = {p.tc_number: p.temp_c for p in plastic.predictions}
    assert any(by_tc[tc] != temp for tc, temp in plastic_by_tc.items())


def test_metrics_carry_the_algorithm_of_each_area(engine, manifest) -> None:
    metrics = engine.get_metrics()
    assert len(metrics.areas) == 7
    for row in metrics.areas:
        assert row.algorithm == manifest["area_algorithms"][row.key_area]
        assert set(row.feature_importance) == set(manifest["variables"])
    filtered = engine.get_metrics(["Oven HMI"])
    assert [a.key_area for a in filtered.areas] == ["Oven HMI"]


def test_metrics_carry_the_measured_pairs_of_each_area(engine, manifest) -> None:
    """A dispersão e o mapa de calor leem daqui; antes liam dado simulado."""
    metrics = engine.get_metrics()
    for row in metrics.areas:
        entry = manifest["areas"][row.key_area]
        n_runs = entry["metrics"]["n_test"]
        assert len(row.validation.runs) == n_runs, row.key_area
        # Um ponto por (ensaio, coluna-alvo) — nem mais, nem menos.
        assert len(row.validation.points) == n_runs * len(entry["targets"]), row.key_area
        for point in row.validation.points:
            assert point.run < n_runs
            assert point.tc_numbers, f"{row.key_area}.{point.target} sem termopar"
            assert point.actual_c > 0 and point.predicted_c > 0


def test_fused_igbt_is_one_observation_not_sixteen(engine) -> None:
    """Replicar a leitura inflaria a amostra e achataria p90/máximo do erro."""
    metrics = engine.get_metrics(["IPC Comp"])
    points = metrics.areas[0].validation.points
    igbt = [p for p in points if p.target == "IGBT"]
    runs = {p.run for p in igbt}
    # Um ponto por ensaio, cada um cobrindo os 16 termopares.
    assert len(igbt) == len(runs)
    for point in igbt:
        assert len(point.tc_numbers) == 16


def test_measured_pairs_agree_with_the_published_mae(engine, manifest) -> None:
    """Os pares têm de reproduzir o MAE do manifesto.

    É o que garante que a tabela (MAE agregado) e o mapa de calor (calculado dos
    resíduos, no front) contem a mesma história. Se divergirem, uma das duas
    está lendo outra coisa.
    """
    for row in engine.get_metrics().areas:
        residuals = [abs(p.predicted_c - p.actual_c) for p in row.validation.points]
        measured = sum(residuals) / len(residuals)
        # 0,02 °C: os pares vão arredondados a 2 casas para o manifesto.
        assert abs(measured - row.mae) < 0.02, row.key_area


def test_run_config_stays_in_the_manifest(engine, manifest) -> None:
    """O cliente recebe o rótulo do ensaio, não a configuração crua.

    A config existe no manifesto para auditoria; publicá-la só aumentaria a
    resposta e daria ao front uma segunda fonte para o mesmo fato.
    """
    assert "config" in manifest["areas"]["Mainback"]["validation"]["runs"][0]
    run = engine.get_metrics(["Mainback"]).areas[0].validation.runs[0]
    assert run.label
    assert not hasattr(run, "config")


def test_every_trained_variable_is_declared_as_used(engine, config) -> None:
    """A interface não pode chamar de "informativa" uma variável que o modelo usa.

    `IGNORED_FIELDS` registra a H2, que tirou `losses` e `board_position` do
    MOCK da Fase 1. Os modelos treinados usam as 7 colunas — e em `IPC Cooling`
    e `IPC Comp` `losses` é a variável MAIS importante. Enquanto o preditor real
    lia aquela constante, o painel marcava as duas com "informativo — não usado
    pelo modelo" e a resposta as listava em `ignored_fields`.
    """
    metadata = engine.get_metadata()
    assert len(metadata.variables) == 7
    unused = [v.name for v in metadata.variables if not v.used_by_model]
    assert unused == [], f"declaradas como não usadas, mas treinadas: {unused}"

    response = engine.predict(PredictionRequest(architecture="BR", config=config))
    assert response.ignored_fields == []


def test_losses_and_board_position_really_move_the_prediction(engine, config) -> None:
    """Prova de substância, não de rótulo: trocá-las muda os números."""
    baseline = {
        p.tc_number: p.temp_c
        for p in engine.predict(PredictionRequest(architecture="BR", config=config)).predictions
    }
    for variable in ("losses", "board_position"):
        options = [o for o in engine.dataset.options_for(variable) if o != config[variable]]
        changed = 0
        for option in options:
            altered = engine.predict(
                PredictionRequest(architecture="BR", config=dict(config, **{variable: option}))
            )
            changed = max(
                changed,
                sum(1 for p in altered.predictions if baseline.get(p.tc_number) != p.temp_c),
            )
        assert changed > 0, f"{variable} não alterou nenhuma predição"


def test_reliability_counts_every_variable_the_models_use(engine, config) -> None:
    """Config que difere só em `losses` não é a mesma do treino.

    Com a distância de Hamming medida sobre as 5 variáveis da H2, ela era
    classificada como `interpolation` — o rótulo de maior confiança — para uma
    combinação que o modelo nunca viu.
    """
    assert engine.compute_reliability("IPC Cooling", config) == "interpolation"
    other = next(o for o in engine.dataset.options_for("losses") if o != config["losses"])
    assert engine.compute_reliability("IPC Cooling", dict(config, losses=other)) != "interpolation"


def test_metrics_reject_unknown_area(engine) -> None:
    with pytest.raises(ContractError):
        engine.get_metrics(["Área Inexistente"])
