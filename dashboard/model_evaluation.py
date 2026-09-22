"""
model_evaluation.py - Avaliação de qualidade do modelo (RF19, RN22, RN23).

ATENÇÃO - MOCK / PLACEHOLDER. Não há modelo real treinado ainda; as métricas
calculadas aqui usam a camada mock de `mock_data.py` como se fosse o modelo,
só para comprovar que o MECANISMO de avaliação e comparação entre versões
funciona de ponta a ponta. Os números não têm significado de engenharia real
- não usar como evidência de qualidade do produto nem mostrar para o
parceiro como se fosse desempenho real do modelo.

Este módulo é independente do dashboard (RF19 está na Seção 6.1.2 do
documento de requisitos - "software preditivo", não "dashboard"): não é
importado por `app.py`. Uso é 100% programático, no mesmo espírito de
`mock_data.predict()` (RF12).

RF19 - calcular e registrar as métricas de avaliação do modelo sobre um
conjunto de dados de referência, permitindo acompanhar sua evolução entre
versões.

RN22 - toda nova versão do modelo deve reportar as três métricas oficiais de
aceite:
    1. erro médio absoluto (MAE) em °C por termopar;
    2. erro normalizado pela folga térmica normativa (o quanto o erro come
       da margem de segurança até o limite de engenharia);
    3. taxa de falsos-negativos de segurança (o modelo diz "dentro do
       limite" quando na verdade excede - o pior tipo de erro aqui).

RN23 - as métricas devem ser calculadas sobre o MESMO conjunto de dados de
referência entre versões, para permitir comparação justa. `REFERENCE_CASES`
abaixo é esse conjunto: fixo e versionado junto com o código. Alterar os
casos invalida a comparação com métricas já registradas em
`logs/model_metrics.jsonl` - troque com cuidado, e considere manter as
métricas antigas rotuladas com a versão do conjunto de referência usado.
"""

from __future__ import annotations

import json
import os
from datetime import datetime
from typing import Any

import mock_data as md

# --------------------------------------------------------------------------- #
# Conjunto de dados de referência (RN23)
# --------------------------------------------------------------------------- #
#
# Cada caso é um "ground truth" sintético: uma configuração + sensor com uma
# temperatura "medida" hipotética, independente da fórmula do mock (para não
# comparar o mock contra si mesmo). Em produção isso viria de testes físicos
# e simulações CFD de referência (RF16/RN19) - aqui é só plausível o
# suficiente para exercitar as três métricas com valores não triviais.

# Configuração fixa usada em todos os casos de referência - a mesma
# combinação "severa" usada em outras demonstrações do projeto.
_EVAL_CONFIG: dict[str, str] = {
    "blower_direction": "To Front",
    "housing": "Open",
    "board_position": "Right",
    "duct_type": "Top Duct",
    "deflector_hole": "Open",
    "run_case": "Pyro",
}

# Amostra fixa e pequena de sensores (os 5 primeiros cadastrados), repetida
# para os dois países - suficiente para o mock, sem exigir uma tabela de
# referência gigante.
_EVAL_SENSOR_NAMES: list[str] = [s["sensor_name"] for s in md.SENSORS[:5]]


def _independent_ground_truth(key_area: str, severe: bool) -> float:
    """Temperatura "medida" sintética, independente de `_predicted_temp()`.

    Metade dos casos usa o ponto médio da faixa (`severe=False`, tipicamente
    seguro) e a outra metade usa o teto da faixa (`severe=True`) - acima de
    onde o limite de engenharia mock é gerado (68%-86% da faixa), então esses
    casos são "de verdade" inseguros. Sem essa mistura, a taxa de
    falso-negativo de segurança (RN22) nunca teria um caso positivo para
    detectar e ficaria sempre 0 por construção, não por o modelo acertar.
    """
    low, high = md.KEY_AREAS[key_area]
    if severe:
        return round(high, 1)
    return round((low + high) / 2, 1)


def _build_reference_cases() -> list[dict[str, Any]]:
    cases: list[dict[str, Any]] = []
    for country in md.COUNTRIES:
        for i, sensor_name in enumerate(_EVAL_SENSOR_NAMES):
            sensor = next(s for s in md.SENSORS if s["sensor_name"] == sensor_name)
            severe = i % 2 == 1
            cases.append(
                {
                    "label": f"{country} · {sensor_name}",
                    "country": country,
                    "sensor_name": sensor_name,
                    "key_area": sensor["key_area"],
                    "ground_truth_temp": _independent_ground_truth(sensor["key_area"], severe),
                }
            )
    return cases


REFERENCE_CASES: list[dict[str, Any]] = _build_reference_cases()


# --------------------------------------------------------------------------- #
# Cálculo das 3 métricas oficiais (RN22)
# --------------------------------------------------------------------------- #


def evaluate_model(version_label: str = "mock-atual") -> dict[str, Any]:
    """Calcula as 3 métricas oficiais de aceite sobre `REFERENCE_CASES`.

    `version_label` identifica a versão avaliada no histórico persistido por
    `log_metrics()` (RN23 - comparação entre versões sobre o mesmo
    conjunto de referência).
    """
    abs_errors: list[float] = []
    normalized_errors: list[float] = []
    unsafe_cases = 0
    false_negatives = 0

    for case in REFERENCE_CASES:
        predictions = md.mock_predict(
            country=case["country"],
            selected_sensors=[case["sensor_name"]],
            **_EVAL_CONFIG,
        )
        if not predictions:
            continue
        prediction = predictions[0]

        true_temp = case["ground_truth_temp"]
        limit = prediction["engineering_limit"]
        abs_error = abs(prediction["predicted_temp"] - true_temp)
        abs_errors.append(abs_error)

        # Metrica 2: erro normalizado pela folga termica normativa (a
        # distancia entre a temperatura real e o limite de engenharia).
        folga = limit - true_temp
        if folga > 0:
            normalized_errors.append(abs_error / folga)

        # Metrica 3: falso-negativo de seguranca - a configuracao realmente
        # excede o limite, mas a predicao diz que nao excede.
        actually_unsafe = true_temp > limit
        if actually_unsafe:
            unsafe_cases += 1
            if not prediction["exceeds_limit"]:
                false_negatives += 1

    return {
        "version": version_label,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "n_casos_referencia": len(REFERENCE_CASES),
        "mae_c": round(sum(abs_errors) / len(abs_errors), 2) if abs_errors else None,
        "erro_normalizado_folga_termica": (
            round(sum(normalized_errors) / len(normalized_errors), 3)
            if normalized_errors
            else None
        ),
        "taxa_falso_negativo_seguranca": (
            round(false_negatives / unsafe_cases, 3) if unsafe_cases else 0.0
        ),
        "casos_inseguros_no_conjunto": unsafe_cases,
    }


# --------------------------------------------------------------------------- #
# Histórico de métricas entre versões (RF19, RN23)
# --------------------------------------------------------------------------- #

_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
METRICS_LOG_PATH = os.path.join(_BASE_DIR, "logs", "model_metrics.jsonl")


def log_metrics(metrics: dict[str, Any]) -> None:
    """Acrescenta uma avaliação ao histórico (RF19 - "registrar" as métricas).

    Formato JSON Lines (uma avaliação por linha): mais fácil de comparar
    versões (RN23) do que sobrescrever um único arquivo a cada avaliação.
    """
    os.makedirs(os.path.dirname(METRICS_LOG_PATH), exist_ok=True)
    with open(METRICS_LOG_PATH, "a", encoding="utf-8") as handle:
        handle.write(json.dumps(metrics, ensure_ascii=False) + "\n")


def read_metrics_history() -> list[dict[str, Any]]:
    """Lê o histórico de avaliações já registradas, na ordem em que ocorreram."""
    if not os.path.exists(METRICS_LOG_PATH):
        return []
    with open(METRICS_LOG_PATH, encoding="utf-8") as handle:
        return [json.loads(line) for line in handle if line.strip()]


def evaluate_and_log(version_label: str) -> dict[str, Any]:
    """Atalho: calcula e já registra a avaliação de uma versão."""
    metrics = evaluate_model(version_label)
    log_metrics(metrics)
    return metrics
