"""
mock_data.py - Camada de dados e de predicao MOCK do Thermal Predictor.

ATENCAO - ESTE MODULO E TEMPORARIO.
O modelo de Machine Learning ainda nao esta pronto. Tudo aqui e placeholder
deterministico, projetado para ser substituido sem alterar `app.py` nem
`business_rules.py`. O ponto unico de troca e a funcao `mock_predict()`
(ver secao "PONTO DE INTEGRACAO" no fim do arquivo).

Nenhum dado real do parceiro e versionado neste arquivo: os nomes de sensores
sao genericos e as faixas de temperatura seguem apenas as ordens de grandeza
por `key_area` ja publicadas na documentacao do projeto (Secao 4.2 do
`documents/documentacao.md`). Os limites de engenharia por pais sao FICTICIOS
- a tabela real ainda nao foi disponibilizada pela Whirlpool.
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass
from typing import Any

# --------------------------------------------------------------------------- #
# 1. Dominio: valores admissiveis dos parametros de configuracao
# --------------------------------------------------------------------------- #

# Pais / arquitetura do produto (RN02, RN03 - modelos e limites por pais)
COUNTRIES: list[str] = ["Brasil", "México"]
COUNTRY_CODES: dict[str, str] = {"Brasil": "BR", "México": "MX"}

BLOWER_DIRECTIONS: list[str] = ["To Front", "To Back"]
HOUSING_STATES: list[str] = ["Open", "Closed"]
BOARD_POSITIONS: list[str] = ["Center", "Right"]

# Enum extensivel: a lista fechada de tipos de mesh duct ainda nao foi
# confirmada pelo parceiro. Acrescentar valores aqui e suficiente - nenhuma
# outra parte da aplicacao depende do conteudo desta lista.
DUCT_TYPES: list[str] = ["Standard Duct", "New Duct", "Top Duct"]

DEFLECTOR_HOLE_STATES: list[str] = ["Open", "Closed"]
RUN_CASES: list[str] = ["Pyro", "Broil Case 2", "Broil Qualitative", "Broil C1"]

# Campos de configuracao, na ordem em que aparecem no formulario.
# `business_rules.validate_configuration()` usa esta lista para exigir que
# todos estejam preenchidos (RN01).
CONFIG_FIELDS: list[str] = [
    "blower_direction",
    "housing",
    "board_position",
    "duct_type",
    "deflector_hole",
    "run_case",
]

CONFIG_FIELD_LABELS: dict[str, str] = {
    "country": "País / arquitetura",
    "blower_direction": "Direção do fluxo do blower",
    "housing": "Estado do housing",
    "board_position": "Posição da placa",
    "duct_type": "Tipo de mesh duct",
    "deflector_hole": "Furo do defletor",
    "run_case": "Caso de operação (Run Case)",
}

CONFIG_FIELD_OPTIONS: dict[str, list[str]] = {
    "blower_direction": BLOWER_DIRECTIONS,
    "housing": HOUSING_STATES,
    "board_position": BOARD_POSITIONS,
    "duct_type": DUCT_TYPES,
    "deflector_hole": DEFLECTOR_HOLE_STATES,
    "run_case": RUN_CASES,
}

# --------------------------------------------------------------------------- #
# 2. Areas-chave e faixas de temperatura de referencia
# --------------------------------------------------------------------------- #

# Faixas (C) inspiradas nos minimos/maximos por `key_area` do dataset do
# parceiro. Servem so para gerar valores plausiveis na demo.
KEY_AREAS: dict[str, tuple[float, float]] = {
    "Mainback": (35.0, 274.0),
    "Coil Temps": (41.0, 235.0),
    "Main Vent Sys": (42.0, 135.0),
    "IPC Cooling": (28.0, 115.0),
    "IPC Comp": (46.0, 130.0),
    "CT Knobs": (34.0, 73.0),
    "Oven HMI": (44.0, 72.0),
}

# Nomes de sensores GENERICOS. A lista real de 78 termopares esta no dataset
# confidencial do parceiro e nao pode ser versionada (ver `.gitignore`).
SENSOR_NAMES: dict[str, list[str]] = {
    "Mainback": [
        "Mainback - Painel Traseiro Superior",
        "Mainback - Painel Traseiro Central",
        "Mainback - Painel Traseiro Inferior",
        "Mainback - Duto de Exaustão",
        "Mainback - Chapa Interna Esquerda",
        "Mainback - Chapa Interna Direita",
    ],
    "Coil Temps": [
        "Coil - Bobina Frontal Esquerda",
        "Coil - Bobina Frontal Direita",
        "Coil - Bobina Traseira Esquerda",
        "Coil - Bobina Traseira Direita",
        "Coil - Suporte de Bobina",
    ],
    "Main Vent Sys": [
        "Vent - Entrada do Duto Principal",
        "Vent - Saída do Duto Principal",
        "Vent - Defletor de Ventilação",
        "Vent - Grelha Superior",
    ],
    "IPC Cooling": [
        "IPC Cooling - Entrada de Ar do Blower",
        "IPC Cooling - Saída de Ar do Blower",
        "IPC Cooling - Dissipador da Placa",
        "IPC Cooling - Ambiente Interno do Housing",
    ],
    "IPC Comp": [
        "IPC Comp - Relé de Potência",
        "IPC Comp - Capacitor Principal",
        "IPC Comp - Conector de Alimentação",
        "IPC Comp - Trilha da Placa",
        "IPC Comp - Microcontrolador",
    ],
    "CT Knobs": [
        "CT Knobs - Manípulo Frontal Esquerdo",
        "CT Knobs - Manípulo Frontal Direito",
        "CT Knobs - Manípulo Traseiro Esquerdo",
        "CT Knobs - Manípulo Traseiro Direito",
        "CT Knobs - Haste do Manípulo",
    ],
    "Oven HMI": [
        "Oven HMI - Display Frontal",
        "Oven HMI - Membrana do Painel",
        "Oven HMI - Placa de Interface",
        "Oven HMI - Moldura Superior",
    ],
}

# --------------------------------------------------------------------------- #
# 3. Determinismo: mesma configuracao => mesmo resultado
# --------------------------------------------------------------------------- #


def _unit_hash(*parts: Any) -> float:
    """Retorna um float deterministico em [0, 1) a partir dos argumentos.

    Usado no lugar de `random` para que a mesma configuracao devolva sempre a
    mesma predicao durante a demonstracao (evita numeros novos a cada clique).
    """
    raw = "|".join(str(p) for p in parts).encode("utf-8")
    digest = hashlib.sha256(raw).digest()
    return int.from_bytes(digest[:8], "big") / float(1 << 64)


# --------------------------------------------------------------------------- #
# 4. Limites de engenharia (MOCK) por sensor e por pais
# --------------------------------------------------------------------------- #

# >>> SUBSTITUIR: quando a Whirlpool entregar a tabela oficial de limites,
# preencher este dicionario no formato {(sensor_name, "BR"|"MX"): limite_c}.
# Qualquer par presente aqui tem prioridade sobre o valor gerado abaixo.
SENSOR_LIMIT_OVERRIDES: dict[tuple[str, str], float] = {}


def _mock_limit(sensor_name: str, key_area: str, country_code: str) -> float:
    """Gera um limite de engenharia ficticio, porem estavel, para o sensor.

    O limite fica na porcao alta da faixa da `key_area`, de modo que algumas
    configuracoes mais severas realmente o ultrapassem - e o que permite
    exercitar visualmente a RN09 na demo.
    """
    override = SENSOR_LIMIT_OVERRIDES.get((sensor_name, country_code))
    if override is not None:
        return override

    low, high = KEY_AREAS[key_area]
    span = high - low
    # Limite entre ~68% e ~86% da faixa da area.
    ratio = 0.68 + 0.18 * _unit_hash("limit", sensor_name, country_code)
    limit = low + span * ratio
    # O Mexico usa arquitetura distinta: limites levemente diferentes (RN03).
    if country_code == "MX":
        limit *= 0.94 + 0.10 * _unit_hash("limit-mx", sensor_name)
    return round(limit, 1)


def _build_sensors() -> list[dict[str, Any]]:
    sensors: list[dict[str, Any]] = []
    for key_area, names in SENSOR_NAMES.items():
        for name in names:
            sensors.append(
                {
                    "sensor_name": name,
                    "key_area": key_area,
                    "active_limit": {
                        code: _mock_limit(name, key_area, code)
                        for code in ("BR", "MX")
                    },
                }
            )
    return sensors


SENSORS: list[dict[str, Any]] = _build_sensors()


def get_sensors(key_areas: list[str] | None = None) -> list[dict[str, Any]]:
    """Sensores cadastrados, opcionalmente filtrados por area-chave."""
    if not key_areas:
        return list(SENSORS)
    wanted = set(key_areas)
    return [s for s in SENSORS if s["key_area"] in wanted]


def get_sensor_names(key_areas: list[str] | None = None) -> list[str]:
    return [s["sensor_name"] for s in get_sensors(key_areas)]


def get_engineering_limit(sensor_name: str, country: str) -> float | None:
    """Limite de engenharia do sensor para o pais selecionado (RN03)."""
    code = COUNTRY_CODES.get(country, country)
    for sensor in SENSORS:
        if sensor["sensor_name"] == sensor_name:
            return sensor["active_limit"].get(code)
    return None


# --------------------------------------------------------------------------- #
# 5. Estados de confiabilidade (mock)
# --------------------------------------------------------------------------- #

# Os tres estados definidos na Secao 4.1.5 (R04) da documentacao (RN07).
RELIABILITY_INTERPOLATION = "interpolação"
RELIABILITY_MODERATE_EXTRAPOLATION = "extrapolação moderada"
RELIABILITY_OUT_OF_DOMAIN = "fora de domínio"

# Combinacao "central" do espaco amostral simulado. Quanto mais a configuracao
# se afasta desta referencia, mais o mock a trata como extrapolacao.
_BASELINE_CONFIG: dict[str, str] = {
    "blower_direction": "To Back",
    "housing": "Closed",
    "board_position": "Center",
    "duct_type": "Standard Duct",
    "deflector_hole": "Closed",
    "run_case": "Broil C1",
}

# Peso de cada desvio em relacao ao baseline. Parametros pouco representados no
# dataset real (dutos novos, ciclo Pyro) empurram a configuracao para fora do
# dominio mais rapido.
_DEVIATION_WEIGHTS: dict[str, float] = {
    "blower_direction": 0.08,
    "housing": 0.09,
    "board_position": 0.07,
    "duct_type": 0.14,
    "deflector_hole": 0.07,
    "run_case": 0.13,
}


def _rarity_score(config: dict[str, str]) -> float:
    """Quao "incomum" e a configuracao, em [0, 1] (aproximado).

    Mock do que, no modelo real, sera uma medida de distancia ao envelope de
    treino (ex.: distancia de Mahalanobis ou cobertura por vizinhos).
    """
    score = 0.0
    for field, weight in _DEVIATION_WEIGHTS.items():
        if config.get(field) != _BASELINE_CONFIG[field]:
            score += weight
    # Extras para valores que o parceiro ainda esta consolidando.
    if config.get("duct_type") == "Top Duct":
        score += 0.07
    if config.get("run_case") == "Pyro":
        score += 0.06
    # Jitter deterministico, para que a demo nao fique com fronteiras rigidas.
    score += 0.10 * _unit_hash("rarity", *[config.get(f) for f in CONFIG_FIELDS])
    return min(score, 1.0)


def _reliability_state(config: dict[str, str], sensor_name: str) -> str:
    score = _rarity_score(config)
    # O sensor tambem influencia: areas com menos leituras extrapolam antes.
    # A dispersao e ampla de proposito - assim uma unica consulta costuma
    # devolver sensores em estados diferentes, exercitando RF07/RN07/RN08.
    score += 0.26 * (_unit_hash("sensor-rarity", sensor_name) - 0.5)
    if score < 0.34:
        return RELIABILITY_INTERPOLATION
    if score < 0.68:
        return RELIABILITY_MODERATE_EXTRAPOLATION
    return RELIABILITY_OUT_OF_DOMAIN


def _error_margin_pct(state: str, config: dict[str, str], sensor_name: str) -> float:
    """Margem de erro mock, entre 2% e 18%, correlacionada a confiabilidade.

    As faixas se sobrepoem de proposito: mesmo em interpolacao e possivel
    ultrapassar o criterio de aceite de 10%, o que permite exercitar a RN06.
    """
    ranges = {
        RELIABILITY_INTERPOLATION: (2.0, 11.0),
        RELIABILITY_MODERATE_EXTRAPOLATION: (6.0, 14.5),
        RELIABILITY_OUT_OF_DOMAIN: (11.5, 18.0),
    }
    low, high = ranges[state]
    u = _unit_hash("error", sensor_name, *[config.get(f) for f in CONFIG_FIELDS])
    return round(low + (high - low) * u, 1)


def _predicted_temp(config: dict[str, str], sensor: dict[str, Any], country_code: str) -> float:
    """Temperatura estimada plausivel dentro da faixa da `key_area` do sensor."""
    low, high = KEY_AREAS[sensor["key_area"]]
    span = high - low

    # Posicao base do sensor dentro da faixa da sua area (estavel por sensor).
    base = 0.30 + 0.45 * _unit_hash("base", sensor["sensor_name"])

    # Efeitos de configuracao - direcao alinhada ao que a analise exploratoria
    # sugere (housing aberto dissipa mais, Pyro aquece mais, etc.).
    delta = 0.0
    if config.get("housing") == "Open":
        delta -= 0.05
    if config.get("blower_direction") == "To Front":
        delta += 0.04
    if config.get("deflector_hole") == "Open":
        delta -= 0.03
    if config.get("board_position") == "Right":
        delta += 0.02
    if config.get("duct_type") == "New Duct":
        delta -= 0.04
    elif config.get("duct_type") == "Top Duct":
        delta += 0.03
    if config.get("run_case") == "Pyro":
        delta += 0.16
    elif config.get("run_case") == "Broil Case 2":
        delta += 0.05
    if country_code == "MX":
        delta += 0.02

    jitter = 0.09 * (
        _unit_hash(
            "temp", sensor["sensor_name"], country_code, *[config.get(f) for f in CONFIG_FIELDS]
        )
        - 0.5
    )
    ratio = min(max(base + delta + jitter, 0.05), 1.02)
    return round(low + span * ratio, 1)


# --------------------------------------------------------------------------- #
# 6. Pipeline de pre-processamento (RF14, RN17)
# --------------------------------------------------------------------------- #
#
# RN17 - nenhum dado de entrada pode ser submetido ao "modelo" sem antes
# passar por este pipeline. `SensorFeatures` e o formato congelado que ele
# produz; `_MockCountryModel.predict_one()` (secao 7) so aceita esse formato,
# nunca os parametros crus - e assim que a regra vira codigo, nao so
# documentacao. Quando o modelo real entrar, troque o CORPO de
# `build_features()` pelo encoding/normalizacao de verdade usado no treino,
# mantendo a assinatura e o formato de saida (ou o dataclass equivalente que
# o modelo real esperar).


@dataclass(frozen=True)
class SensorFeatures:
    """Representacao pre-processada de uma consulta para um sensor.

    Imutavel de proposito: uma vez construida por `build_features()`, os
    dados nao podem ser alterados antes de chegar ao modelo, o que evita que
    algum codigo "quase" faca o pre-processamento e esqueca um campo.
    """

    country_code: str
    sensor_name: str
    key_area: str
    engineering_limit: float
    config: tuple[tuple[str, str], ...]  # (campo, valor), ordenado e imutavel

    def config_dict(self) -> dict[str, str]:
        return dict(self.config)


def build_features(
    config: dict[str, str], sensor: dict[str, Any], country_code: str
) -> SensorFeatures:
    """Valida e converte uma consulta crua num `SensorFeatures` (RN17).

    Mock, mas nao trivial: rejeita qualquer valor fora do dominio conhecido
    de cada parametro - equivalente ao que um encoder categorico real faria
    ao receber uma categoria nunca vista no treino.
    """
    for field in CONFIG_FIELDS:
        value = config.get(field)
        allowed = CONFIG_FIELD_OPTIONS[field]
        if value not in allowed:
            raise ValueError(
                f"Valor fora do dominio conhecido para '{field}': {value!r}. "
                f"Esperado um de: {allowed}."
            )
    if country_code not in ("BR", "MX"):
        raise ValueError(f"País inválido: {country_code!r}")

    return SensorFeatures(
        country_code=country_code,
        sensor_name=sensor["sensor_name"],
        key_area=sensor["key_area"],
        engineering_limit=sensor["active_limit"][country_code],
        config=tuple(sorted((field, config[field]) for field in CONFIG_FIELDS)),
    )


# --------------------------------------------------------------------------- #
# 7. Modelos por pais (RF13, RN03, RN16)
# --------------------------------------------------------------------------- #
#
# RF13 - o Brasil e o Mexico tem arquiteturas diferentes e por isso precisam
# de modelos treinados separadamente. Aqui isso e representado por uma
# instancia de `_MockCountryModel` por pais, cacheada em `_MODELS` - do jeito
# que um modelo real, carregado uma vez e reutilizado entre chamadas, se
# comportaria. `get_model()` e o unico jeito de obter uma instancia, e e ali
# que a RN16 (pais obrigatorio) e aplicada.


class _MockCountryModel:
    """"Modelo" mock para UM pais/arquitetura.

    >>> SUBSTITUIR <<<
    Quando o modelo real existir, troque o corpo de `predict_one()` por algo
    como `self._sklearn_model.predict(X)` / `self._artifact.infer(X)`,
    carregando os artefatos treinados em `__init__` a partir da fonte de
    dados externa (RN19) - mantenha a assinatura de `predict_one()` (recebe
    um `SensorFeatures`, devolve o dict de contrato de `mock_predict`).
    """

    def __init__(self, country_code: str):
        self.country_code = country_code

    def predict_one(self, features: SensorFeatures) -> dict[str, Any]:
        config = features.config_dict()
        state = _reliability_state(config, features.sensor_name)
        temp = _predicted_temp(
            config,
            {"sensor_name": features.sensor_name, "key_area": features.key_area},
            self.country_code,
        )
        return {
            "sensor_name": features.sensor_name,
            "key_area": features.key_area,
            "predicted_temp": temp,
            "error_margin_pct": _error_margin_pct(state, config, features.sensor_name),
            "reliability_state": state,
            "engineering_limit": features.engineering_limit,
            # RN09 - a comparacao com o limite vale mesmo fora do dominio.
            "exceeds_limit": bool(temp > features.engineering_limit),
        }


_MODELS: dict[str, _MockCountryModel] = {}


def get_model(country_code: str) -> _MockCountryModel:
    """Devolve o modelo do pais, criando-o na primeira chamada (RF13).

    RN16 - nenhuma predicao pode ser feita sem um pais valido: e aqui que
    isso e imposto para qualquer chamador (dashboard, lote ou uso
    programatico direto).
    """
    if country_code not in ("BR", "MX"):
        raise ValueError(f"País inválido para predição: {country_code!r}")
    if country_code not in _MODELS:
        _MODELS[country_code] = _MockCountryModel(country_code)
    return _MODELS[country_code]


# --------------------------------------------------------------------------- #
# 8. PONTO DE INTEGRACAO - substituir pela chamada real ao modelo
# --------------------------------------------------------------------------- #


def mock_predict(
    country: str,
    blower_direction: str,
    housing: str,
    board_position: str,
    duct_type: str,
    deflector_hole: str,
    run_case: str,
    selected_sensors: list[str],
) -> list[dict[str, Any]]:
    """Devolve uma predicao mock por sensor selecionado.

    Contrato de saida (o que `business_rules` e `app` consomem):
        sensor_name       str
        key_area          str
        predicted_temp    float  (C)
        error_margin_pct  float  (%)
        reliability_state str    (um dos tres RELIABILITY_*)
        engineering_limit float  (C, ja resolvido para o pais)
        exceeds_limit     bool

    >>> COMO TROCAR PELO MODELO REAL <<<
    Quando o modelo estiver disponivel, os pontos de troca ja estao
    isolados - normalmente nao e nem preciso mexer nesta funcao:
        - `build_features()` (secao 6)      -> pre-processamento real (RN17)
        - `_MockCountryModel.predict_one()` (secao 7) -> chamada ao modelo
          treinado de verdade, um por pais (RF13)
        - `get_model()` (secao 7)           -> carregar os artefatos reais
          em vez de instanciar `_MockCountryModel`

    Nenhuma alteracao e necessaria em `app.py` ou `business_rules.py`.
    """
    config = {
        "blower_direction": blower_direction,
        "housing": housing,
        "board_position": board_position,
        "duct_type": duct_type,
        "deflector_hole": deflector_hole,
        "run_case": run_case,
    }
    country_code = COUNTRY_CODES.get(country, country)
    model = get_model(country_code)  # RF13 / RN16 - falha aqui se o pais for invalido

    wanted = set(selected_sensors or [])
    results: list[dict[str, Any]] = []

    for sensor in SENSORS:
        if sensor["sensor_name"] not in wanted:
            continue
        features = build_features(config, sensor, country_code)  # RN17
        results.append(model.predict_one(features))

    return results


# Alias estavel para consumo programatico (RF12). Quando o modelo real entrar,
# aponte este nome para a rotina de producao e mantenha `mock_predict` apenas
# como fallback de demonstracao.
predict = mock_predict


# --------------------------------------------------------------------------- #
# 9. Predicao em lote (RF18, RN21)
# --------------------------------------------------------------------------- #


def predict_batch(requests: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Roda uma predicao para cada configuracao de uma lista (RF18).

    RN21 - cada configuracao do lote e validada e processada de forma
    independente: uma configuracao invalida ou malformada vira um item de
    erro no resultado, sem interromper nem invalidar o processamento das
    demais.

    Parametros
    ----------
    requests:
        Lista de dicts, cada um com as mesmas chaves de `mock_predict()`
        (`country`, `blower_direction`, `housing`, `board_position`,
        `duct_type`, `deflector_hole`, `run_case`, `selected_sensors`), mais
        opcionalmente uma chave `"label"` livre para identificar a linha no
        resultado.

    Retorno
    -------
    Lista na MESMA ORDEM e MESMO TAMANHO de `requests`. Cada item e:
        {"label": ..., "success": True,  "predictions": [...]}   ou
        {"label": ..., "success": False, "error": "<mensagem>"}
    """
    required_keys = {"country", *CONFIG_FIELDS, "selected_sensors"}
    results: list[dict[str, Any]] = []

    for index, request in enumerate(requests):
        label = request.get("label") or f"Item {index + 1}"

        missing = sorted(required_keys - set(request))
        if missing:
            results.append(
                {
                    "label": label,
                    "success": False,
                    "error": f"Campos ausentes: {', '.join(missing)}.",
                }
            )
            continue

        try:
            predictions = mock_predict(
                country=request["country"],
                blower_direction=request["blower_direction"],
                housing=request["housing"],
                board_position=request["board_position"],
                duct_type=request["duct_type"],
                deflector_hole=request["deflector_hole"],
                run_case=request["run_case"],
                selected_sensors=request["selected_sensors"],
            )
        except (ValueError, KeyError, TypeError) as exc:
            # RN21 - o erro fica isolado neste item; o laco continua.
            results.append({"label": label, "success": False, "error": str(exc)})
            continue

        results.append({"label": label, "success": True, "predictions": predictions})

    return results


# --------------------------------------------------------------------------- #
# 10. Retreinamento (RF17, RN20) - placeholder
# --------------------------------------------------------------------------- #


def retrain_model(country: str, data_source: str) -> None:
    """Ponto de extensao para o retreinamento do modelo de um pais (RF17).

    RN20 - retreinar nao pode exigir alteracao do codigo-fonte da rotina de
    predicao: so a fonte de dados externa muda, e o retreinamento e
    disparado chamando esta funcao (ou o job/pipeline que a substituir).
    Nenhuma outra parte do codigo (app.py, business_rules.py) precisa mudar
    quando isto for implementado de verdade.

    NESTA FASE MOCK esta funcao e um placeholder: nao ha modelo para
    retreinar. Quando o modelo real existir, o corpo deve:
        1. Carregar `data_source` (arquivo/bucket/tabela EXTERNA ao
           repositorio - RN19, nunca um caminho dentro do repo);
        2. Rodar o MESMO pipeline de `build_features()` sobre os novos
           dados de simulacao/teste fisico;
        3. Treinar/atualizar o modelo do pais e persistir os novos
           artefatos no local de onde `get_model()` os carrega.
    """
    country_code = COUNTRY_CODES.get(country, country)
    if country_code not in ("BR", "MX"):
        raise ValueError(f"País inválido para retreinamento: {country!r}")
    raise NotImplementedError(
        "Retreinamento ainda não implementado: não há modelo real nesta "
        "fase mock. Ver o docstring desta função para o contrato esperado "
        "quando o modelo estiver disponível."
    )
