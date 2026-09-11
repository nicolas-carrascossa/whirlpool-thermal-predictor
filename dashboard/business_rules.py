"""
business_rules.py - Regras de negocio RN01-RN15 do Thermal Predictor.

Este modulo nao conhece Streamlit nem o modelo preditivo: recebe dicionarios
de configuracao e listas de predicoes (contrato definido em `mock_data.py`) e
devolve validacoes, enriquecimentos e linhas prontas para exportacao.

Cada funcao cita a regra de negocio que implementa, para rastreabilidade com a
Secao 4.4 do `documents/documentacao.md`.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from mock_data import (
    CONFIG_FIELDS,
    CONFIG_FIELD_LABELS,
    CONFIG_FIELD_OPTIONS,
    COUNTRIES,
    KEY_AREAS,
    RELIABILITY_INTERPOLATION,
    RELIABILITY_MODERATE_EXTRAPOLATION,
    RELIABILITY_OUT_OF_DOMAIN,
)

# --------------------------------------------------------------------------- #
# Constantes de negocio
# --------------------------------------------------------------------------- #

# RN06 - criterio de aceite oficial do projeto (Secao 4.1.3): erro maximo 10%.
ACCEPTANCE_ERROR_PCT: float = 10.0

# RN15 / RF20 - aviso obrigatorio ao lado de qualquer predicao exibida.
CFD_DISCLAIMER: str = (
    "Este valor é uma estimativa da saída da simulação numérica (CFD) "
    "e não uma medição física direta."
)

# RN08 - texto que substitui o valor numerico quando a configuracao esta fora
# do dominio do modelo.
OUT_OF_DOMAIN_MESSAGE: str = (
    "Valor não exibido: a configuração está fora do domínio de treino do "
    "modelo. Recomenda-se rodar a simulação CFD completa para esta condição."
)

RELIABILITY_ORDER: list[str] = [
    RELIABILITY_INTERPOLATION,
    RELIABILITY_MODERATE_EXTRAPOLATION,
    RELIABILITY_OUT_OF_DOMAIN,
]

# Rotulo e icone de cada estado de confiabilidade (RF07, RN07). Os icones sao
# marcadores tipograficos simples (nao emojis coloridos) para nao destoar da
# paleta sobria do Guia de Estilo - eles herdam a cor de texto do badge em vez
# de trazerem cor propria. A cor do badge em si NAO mora aqui: este modulo nao
# conhece Streamlit nem o Guia de Estilo, entao quem pinta o badge e o
# `app.py`, buscando a classe CSS correspondente em
# `styles.RELIABILITY_BADGE_CLASS` (ver Secao "Guia de Estilo" abaixo).
RELIABILITY_UI: dict[str, dict[str, str]] = {
    RELIABILITY_INTERPOLATION: {
        "label": "Interpolação",
        "icon": "✓",
    },
    RELIABILITY_MODERATE_EXTRAPOLATION: {
        "label": "Extrapolação moderada",
        "icon": "!",
    },
    RELIABILITY_OUT_OF_DOMAIN: {
        "label": "Fora de domínio",
        "icon": "✕",
    },
}


# --------------------------------------------------------------------------- #
# Escala de severidade visual (Guia de Estilo Whirlpool)
# --------------------------------------------------------------------------- #
#
# Adição da equipe para operacionalizar visualmente a RN09 (destaque de
# predição que excede o limite de engenharia) usando o vocabulário de cor do
# guia: normal (verde) < atenção (amarelo) < vistoria (vermelho, verificação
# humana) < crítico (vermelho escuro, interromper uso).
#
# Os cortes abaixo (90% / 100% / 115% do limite de engenharia) são um ponto
# de partida de demonstração — NÃO é um critério de engenharia validado pela
# Whirlpool. Ajustar aqui quando o time definir os limiares oficiais.
SEVERITY_NORMAL = "normal"
SEVERITY_ATENCAO = "atencao"
SEVERITY_VISTORIA = "vistoria"
SEVERITY_CRITICO = "critico"

SEVERITY_ORDER: list[str] = [
    SEVERITY_NORMAL,
    SEVERITY_ATENCAO,
    SEVERITY_VISTORIA,
    SEVERITY_CRITICO,
]


def classify_severity(predicted_temp: float, engineering_limit: float) -> str:
    """Severidade da predição em relação ao limite de engenharia.

    Ver a ressalva acima: os cortes de razão (0.90 / 1.00 / 1.15) são
    provisórios. `ratio >= 1.00` corresponde, na prática, à mesma condição
    de `exceeds_limit` usada pela RN09 (a igualdade exata em 1.00 é o único
    caso em que os dois critérios divergem por uma casa decimal).
    """
    if not engineering_limit:
        return SEVERITY_NORMAL
    ratio = predicted_temp / engineering_limit
    if ratio < 0.90:
        return SEVERITY_NORMAL
    if ratio < 1.00:
        return SEVERITY_ATENCAO
    if ratio < 1.15:
        return SEVERITY_VISTORIA
    return SEVERITY_CRITICO


# Ordem de gravidade, para responder "qual e a pior severidade deste grupo".
SEVERITY_RANK: dict[str, int] = {sev: i for i, sev in enumerate(SEVERITY_ORDER)}


def compute_region_severities(predictions: list[dict[str, Any]]) -> dict[str, str]:
    """Pior severidade encontrada em cada `key_area` consultada.

    Usado pela visualizacao 3D (`stove_3d.py`), que pinta uma regiao inteira
    do produto de uma cor so: entre varios sensores da mesma area, quem manda
    e o pior caso - esconder um sensor critico atras da media da area seria
    exatamente o tipo de erro que a RN09 quer evitar.

    RN08 - um sensor "fora de dominio" nao tem valor numerico, entao nao da
    para classifica-lo pela razao temperatura/limite. Ele conta como
    `vistoria`: nao e um diagnostico de que a peca esta quente, e o
    reconhecimento de que aquela regiao precisa de verificacao humana (rodar
    a CFD completa) antes de qualquer conclusao.

    Areas nao consultadas simplesmente nao aparecem no dicionario - quem
    desenha decide o neutro (ver `styles.NEUTRAL_REGION_COLOR`).

    Aceita predicoes cruas (do modelo) ou enriquecidas (por
    `enrich_prediction`): se `severity` ja estiver calculada, reusa.
    """
    worst: dict[str, str] = {}

    for prediction in predictions:
        area = prediction.get("key_area")
        if not area:
            continue

        out_of_domain = (
            prediction.get("reliability_state") == RELIABILITY_OUT_OF_DOMAIN
            or prediction.get("show_numeric_value") is False
        )
        if out_of_domain:
            severity = SEVERITY_VISTORIA
        else:
            severity = prediction.get("severity") or classify_severity(
                prediction.get("predicted_temp") or 0.0,
                prediction.get("engineering_limit") or 0.0,
            )

        current = worst.get(area)
        if current is None or SEVERITY_RANK[severity] > SEVERITY_RANK[current]:
            worst[area] = severity

    return worst


# --------------------------------------------------------------------------- #
# Validacoes de entrada
# --------------------------------------------------------------------------- #


@dataclass
class ValidationResult:
    """Resultado de validacao de uma configuracao consultada."""

    errors: list[str] = field(default_factory=list)

    @property
    def is_valid(self) -> bool:
        return not self.errors

    def merge(self, other: "ValidationResult") -> "ValidationResult":
        return ValidationResult(errors=[*self.errors, *other.errors])


def validate_country(country: str | None) -> ValidationResult:
    """RN02 - o pais e obrigatorio em toda consulta.

    RN03 - so paises com limites de engenharia cadastrados sao aceitos, pois o
    pais determina os limites aplicaveis a cada sensor.
    """
    result = ValidationResult()
    if not country:
        result.errors.append("Selecione o país / arquitetura do produto (Brasil ou México).")
    elif country not in COUNTRIES:
        result.errors.append(f"País inválido: {country!r}. Valores aceitos: {', '.join(COUNTRIES)}.")
    return result


def validate_parameters(config: dict[str, Any]) -> ValidationResult:
    """RN01 - todos os seis parametros de configuracao sao obrigatorios.

    Tambem rejeita valores fora do enum, para que um estado antigo de sessao
    (ex.: um tipo de duct removido da lista) nao chegue silenciosamente ao
    modelo.
    """
    result = ValidationResult()
    for field_name in CONFIG_FIELDS:
        value = config.get(field_name)
        label = CONFIG_FIELD_LABELS.get(field_name, field_name)
        if value in (None, "", []):
            result.errors.append(f"Parâmetro obrigatório não informado: {label}.")
            continue
        options = CONFIG_FIELD_OPTIONS.get(field_name, [])
        if options and value not in options:
            result.errors.append(f"Valor inválido para {label}: {value!r}.")
    return result


def validate_sensor_selection(
    selected_key_areas: list[str] | None,
    selected_sensors: list[str] | None,
) -> ValidationResult:
    """RN04 - ao menos um sensor/area-chave, restrito as areas ja mapeadas."""
    result = ValidationResult()
    areas = selected_key_areas or []
    sensors = selected_sensors or []

    if not areas:
        result.errors.append("Selecione ao menos uma área-chave para consultar.")
    else:
        unknown = [a for a in areas if a not in KEY_AREAS]
        if unknown:
            # RN04 - a listagem se limita as sete areas-chave ja mapeadas.
            result.errors.append(
                "Área-chave não mapeada: " + ", ".join(unknown) + "."
            )

    if not sensors:
        result.errors.append("Selecione ao menos um sensor para consultar.")

    return result


def validate_configuration(
    country: str | None,
    config: dict[str, Any],
    selected_key_areas: list[str] | None,
    selected_sensors: list[str] | None,
) -> ValidationResult:
    """Validacao completa de UMA configuracao.

    RN10 - na comparacao simultanea, esta funcao e chamada uma vez por
    configuracao: cada uma passa individualmente pelas mesmas regras antes de
    ser exibida lado a lado com as demais.
    """
    return (
        validate_country(country)
        .merge(validate_parameters(config))
        .merge(validate_sensor_selection(selected_key_areas, selected_sensors))
    )


# --------------------------------------------------------------------------- #
# Enriquecimento das predicoes
# --------------------------------------------------------------------------- #


def is_within_acceptance(error_margin_pct: float | None) -> bool:
    """RN06 - a margem de erro e comparada ao criterio de aceite (<= 10%)."""
    if error_margin_pct is None:
        return False
    return float(error_margin_pct) <= ACCEPTANCE_ERROR_PCT


def format_temperature(temp: float | None) -> str:
    return "—" if temp is None else f"{float(temp):.1f} °C"


def format_error_margin(pct: float | None) -> str:
    return "—" if pct is None else f"± {float(pct):.1f} %"


def format_temp_with_margin(temp: float | None, pct: float | None) -> str:
    """RN05 - temperatura e margem de erro andam sempre juntas.

    A formatacao unica evita que alguma tela exiba uma sem a outra.
    """
    if temp is None or pct is None:
        return "—"
    return f"{float(temp):.1f} °C  (± {float(pct):.1f} %)"


def enrich_prediction(prediction: dict[str, Any]) -> dict[str, Any]:
    """Aplica as regras de exibicao sobre uma predicao bruta do modelo.

    Campos acrescentados:
        reliability_label / reliability_icon                      -> RF07, RN07
        show_numeric_value                                        -> RN08
        display_temp / display_margin / display_value             -> RN05, RN08
        within_acceptance                                         -> RN06
        highlight_limit                                           -> RN09
        severity                                                  -> RN09 (Guia de Estilo)

    A cor de exibição não é calculada aqui — `app.py` resolve a classe CSS a
    partir de `reliability_state` e `severity` usando `styles.py`.
    """
    enriched = dict(prediction)

    state = enriched.get("reliability_state")
    if state not in RELIABILITY_UI:
        # RN07 - nenhuma predicao pode ser exibida sem estado de
        # confiabilidade valido. Na duvida, trata-se como fora de dominio.
        state = RELIABILITY_OUT_OF_DOMAIN
        enriched["reliability_state"] = state
        enriched["reliability_warning"] = (
            "Estado de confiabilidade ausente ou desconhecido; "
            "tratado como fora de domínio por segurança."
        )

    ui = RELIABILITY_UI[state]
    enriched["reliability_label"] = ui["label"]
    enriched["reliability_icon"] = ui["icon"]

    # RN08 - fora de dominio o valor numerico nao pode ser exibido.
    show_numeric = state != RELIABILITY_OUT_OF_DOMAIN
    enriched["show_numeric_value"] = show_numeric

    temp = enriched.get("predicted_temp")
    margin = enriched.get("error_margin_pct")

    if show_numeric:
        enriched["display_temp"] = format_temperature(temp)
        enriched["display_margin"] = format_error_margin(margin)
        # RN05 - o par temperatura + margem e o formato canonico de exibicao.
        enriched["display_value"] = format_temp_with_margin(temp, margin)
    else:
        enriched["display_temp"] = "—"
        enriched["display_margin"] = format_error_margin(margin)
        enriched["display_value"] = OUT_OF_DOMAIN_MESSAGE

    # RN06 - status da margem de erro contra o criterio de aceite de 10%.
    enriched["within_acceptance"] = is_within_acceptance(margin)

    # RN09 - o destaque de limite excedido vale mesmo fora do dominio, por isso
    # e calculado a partir do valor bruto e nao do valor exibido.
    limit = enriched.get("engineering_limit")
    if limit is None or temp is None:
        enriched["exceeds_limit"] = False
    else:
        enriched["exceeds_limit"] = bool(float(temp) > float(limit))
    enriched["highlight_limit"] = bool(enriched["exceeds_limit"])

    # Severidade visual (Guia de Estilo) - so faz sentido quando ha valor
    # numerico exibido; fora de dominio ja tem seu proprio tratamento (RN08).
    if show_numeric and temp is not None and limit:
        enriched["severity"] = classify_severity(float(temp), float(limit))
    else:
        enriched["severity"] = None

    return enriched


def enrich_predictions(predictions: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [enrich_prediction(p) for p in predictions]


def summarize(predictions: list[dict[str, Any]]) -> dict[str, int]:
    """Contagens usadas nos indicadores de topo da pagina de resultados."""
    return {
        "total": len(predictions),
        "exceeding_limit": sum(1 for p in predictions if p.get("exceeds_limit")),
        "above_error_threshold": sum(
            1 for p in predictions if not p.get("within_acceptance", False)
        ),
        "out_of_domain": sum(
            1
            for p in predictions
            if p.get("reliability_state") == RELIABILITY_OUT_OF_DOMAIN
        ),
    }


# --------------------------------------------------------------------------- #
# Exportacao
# --------------------------------------------------------------------------- #


def build_export_rows(queries: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Monta as linhas da exportacao tabular.

    RN14 - a exportacao inclui obrigatoriamente a configuracao consultada, a
    temperatura estimada, a margem de erro e a indicacao de confiabilidade /
    extrapolacao. Nunca apenas o valor bruto da predicao.

    RN08 - coerentemente com a tela, linhas fora de dominio saem sem o valor
    numerico e com a recomendacao de simulacao CFD completa.

    RN15 - o aviso de que o valor e estimativa de CFD viaja junto com o
    arquivo, para que ele nao seja lido fora de contexto.

    `queries` e uma lista de dicts com as chaves:
        label (str), country (str), config (dict), predictions (list[dict])
    """
    rows: list[dict[str, Any]] = []

    for query in queries:
        label = query.get("label", "Configuração")
        country = query.get("country")
        config = query.get("config", {})

        for pred in query.get("predictions", []):
            show_numeric = pred.get("show_numeric_value", True)
            row: dict[str, Any] = {
                "configuracao": label,
                "pais": country,
            }
            # Configuracao consultada, parametro a parametro (RN14).
            for field_name in CONFIG_FIELDS:
                row[field_name] = config.get(field_name)

            row.update(
                {
                    "key_area": pred.get("key_area"),
                    "sensor": pred.get("sensor_name"),
                    "temperatura_estimada_c": (
                        pred.get("predicted_temp") if show_numeric else None
                    ),
                    "margem_erro_pct": pred.get("error_margin_pct"),
                    "dentro_criterio_10pct": (
                        "Sim" if pred.get("within_acceptance") else "Não"
                    ),
                    "estado_confiabilidade": pred.get(
                        "reliability_label", pred.get("reliability_state")
                    ),
                    "limite_engenharia_c": pred.get("engineering_limit"),
                    "excede_limite": "Sim" if pred.get("exceeds_limit") else "Não",
                    "observacao": (
                        "" if show_numeric else OUT_OF_DOMAIN_MESSAGE
                    ),
                    "aviso": CFD_DISCLAIMER,
                }
            )
            rows.append(row)

    return rows


EXPORT_COLUMN_LABELS: dict[str, str] = {
    "configuracao": "Configuração",
    "pais": "País",
    "blower_direction": "Direção do blower",
    "housing": "Housing",
    "board_position": "Posição da placa",
    "duct_type": "Tipo de mesh duct",
    "deflector_hole": "Furo do defletor",
    "run_case": "Run Case",
    "key_area": "Área-chave",
    "sensor": "Sensor",
    "temperatura_estimada_c": "Temperatura estimada (°C)",
    "margem_erro_pct": "Margem de erro (%)",
    "dentro_criterio_10pct": "Dentro do critério de 10%",
    "estado_confiabilidade": "Confiabilidade",
    "limite_engenharia_c": "Limite de engenharia (°C)",
    "excede_limite": "Excede limite",
    "observacao": "Observação",
    "aviso": "Aviso",
}
