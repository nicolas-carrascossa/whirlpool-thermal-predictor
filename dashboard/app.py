"""
app.py - Interface Streamlit do Thermal Predictor (Whirlpool x Inteli).

Dashboard para consulta da temperatura estimada de sensores de um fogao de
piso (freestanding) a partir de uma configuracao de projeto, sem rodar uma
simulacao CFD completa nem um teste fisico destrutivo.

As predicoes exibidas vem de `mock_data.mock_predict()` - camada MOCK,
substituivel pelo modelo real sem alteracao desta interface.

Rastreabilidade: cada validacao/exibicao regida por uma regra de negocio traz
o codigo da RN correspondente em comentario (ver Secao 4.4 da documentacao).

Cor e tipografia seguem o Guia de Estilo Whirlpool, centralizado em
`styles.py`. Nenhuma cor hexadecimal solta deve aparecer neste arquivo -
qualquer cor vem de `styles.COLORS` ou das classes CSS injetadas por
`styles.inject_custom_css()`.
"""

from __future__ import annotations

import html
import io
from datetime import datetime
from typing import Any

import pandas as pd
import streamlit as st

import access_log
import business_rules as rules
import styles
from mock_data import (
    CONFIG_FIELDS,
    CONFIG_FIELD_LABELS,
    CONFIG_FIELD_OPTIONS,
    COUNTRIES,
    KEY_AREAS,
    get_sensor_names,
    mock_predict,
)

MAX_CONFIGS = 4  # limite pratico para a comparacao lado a lado (RF09)

st.set_page_config(
    page_title="Thermal Predictor",
    page_icon="T",  # letra simples: sem emoji, para não destoar da paleta do guia
    layout="wide",
)
styles.inject_custom_css()  # Guia de Estilo: tipografia e paleta em toda a app


def render_page_header(chapeu: str, titulo: str, subtitulo: str | None = None) -> None:
    """Cabeçalho padrão (chapéu + título + subtítulo opcional) do guia.

    O título usa `st.title()` (não HTML solto): continua sendo um `<h1>` de
    verdade — importante para leitores de tela e para os testes automatizados
    (`AppTest.title`) — e já recebe a tipografia Nunito Sans Light / azul
    central pela regra genérica `h1, h2, h3, h4, h5` de `styles.py`.
    """
    st.markdown(f'<div class="chapeu">{html.escape(chapeu)}</div>', unsafe_allow_html=True)
    st.title(titulo)
    if subtitulo:
        st.markdown(f'<div class="subtitulo">{html.escape(subtitulo)}</div>', unsafe_allow_html=True)


# --------------------------------------------------------------------------- #
# Estado de sessao
# --------------------------------------------------------------------------- #


def init_session_state() -> None:
    """Estado mantido entre reruns do Streamlit."""
    defaults: dict[str, Any] = {
        "config_ids": [0],          # configuracoes abertas no formulario
        "next_config_id": 1,
        # `sensors` é a chave do multiselect de sensores: defini-la aqui, antes
        # da primeira instanciação do widget, é a forma suportada de dar um
        # valor inicial a ele. `prev_key_areas` acompanha as áreas do rerun
        # anterior para detectar quais foram recém-adicionadas.
        "sensors": get_sensor_names(["Mainback"]),
        "prev_key_areas": ["Mainback"],
        "last_queries": [],         # resultado da ultima consulta submetida
        "session_access_log": [],   # fallback em memoria do historico de acessos
        "access_logged": False,     # garante 1 registro por sessao, nao por rerun
    }
    for key, value in defaults.items():
        if key not in st.session_state:
            st.session_state[key] = value

    if not st.session_state.access_logged:
        # RF10 - registra o acesso (sem login: nao ha senha nem bloqueio,
        # so o registro de uso). Uma vez por sessao, nao a cada interacao -
        # o Streamlit reroda o script inteiro a cada clique.
        entry = access_log.log_access()
        st.session_state.session_access_log.insert(0, entry)
        st.session_state.access_logged = True


# --------------------------------------------------------------------------- #
# Formulario de configuracao
# --------------------------------------------------------------------------- #


def _on_key_areas_change() -> None:
    """Sincroniza os sensores marcados quando as áreas-chave mudam.

    Roda como callback, ou seja, entre um rerun e outro — o único momento em
    que é seguro escrever no estado de um widget já existente. Descarta os
    sensores de áreas removidas e marca os das áreas recém-adicionadas, sem
    ressuscitar o que o usuário desmarcou manualmente.
    """
    areas = st.session_state.key_areas
    available = get_sensor_names(areas) if areas else []
    previous = st.session_state.prev_key_areas or []

    selection = [s for s in st.session_state.get("sensors", []) if s in available]
    for sensor in get_sensor_names([a for a in areas if a not in previous]):
        if sensor not in selection:
            selection.append(sensor)

    st.session_state.sensors = selection
    st.session_state.prev_key_areas = list(areas)


def render_sensor_picker() -> tuple[list[str], list[str]]:
    """Selecao de areas-chave e sensores, compartilhada entre configuracoes.

    RN04 - a listagem se limita as sete areas-chave ja mapeadas e a consulta
    exige ao menos um sensor selecionado.

    A selecao e comum a todas as configuracoes comparadas de proposito: a
    comparacao lado a lado (RF09) so faz sentido sobre os mesmos sensores.
    """
    st.subheader("2. Sensores a consultar")

    # Widgets com `key` e sem `default`: o Streamlit preserva a escolha do
    # usuário entre reruns, inclusive a seleção vazia — que a RN04 rejeita em
    # vez de "corrigir" por conta própria. O ajuste automático dos sensores
    # fica no callback `_on_key_areas_change`.
    key_areas = st.multiselect(
        "Áreas-chave",
        options=list(KEY_AREAS.keys()),  # RN04 - apenas areas mapeadas
        default=["Mainback"],
        key="key_areas",
        on_change=_on_key_areas_change,
        help="Selecione uma ou mais das sete áreas-chave mapeadas no dataset.",
    )

    # Sem área selecionada não há sensor disponível. (`get_sensor_names([])`
    # devolveria todos, comportamento adequado ao uso programático, não à UI.)
    available = get_sensor_names(key_areas) if key_areas else []

    selected_sensors = st.multiselect(
        "Sensores",
        options=available,
        key="sensors",
        help="Consulte apenas os sensores de interesse, sem varrer todos os termopares.",
    )

    if key_areas and not available:
        st.warning("Nenhum sensor cadastrado para as áreas selecionadas.")

    return key_areas, selected_sensors


def _add_config() -> None:
    """RF09 - abre mais uma configuração para comparação lado a lado."""
    st.session_state.config_ids.append(st.session_state.next_config_id)
    st.session_state.next_config_id += 1


def _remove_config(config_id: int) -> None:
    if config_id in st.session_state.config_ids:
        st.session_state.config_ids.remove(config_id)


def render_config_block(config_id: int, index: int) -> dict[str, Any]:
    """Renderiza os campos de UMA configuracao e devolve seus valores.

    RN01 - os seis parametros sao obrigatorios; nenhum campo tem valor neutro
    pre-selecionado, para que o usuario declare explicitamente cada escolha.
    RN02 - o pais e obrigatorio e faz parte de cada configuracao, permitindo
    comparar Brasil x México lado a lado.
    """
    label = f"Configuração {index + 1}"
    header = st.columns([6, 1])
    header[0].markdown(f"**{label}**")
    if len(st.session_state.config_ids) > 1:
        # `on_click` em vez de `st.rerun()`: a callback roda entre reruns e o
        # script inteiro é reexecutado em seguida. Interromper o script com
        # `st.rerun()` aqui faria o Streamlit descartar o estado dos widgets
        # ainda não renderizados — a seleção de sensores, logo abaixo.
        header[1].button(
            "Remover",
            key=f"remove_{config_id}",
            on_click=_remove_config,
            args=(config_id,),
        )

    placeholder = "— selecione —"

    country = st.selectbox(
        CONFIG_FIELD_LABELS["country"],
        options=[placeholder, *COUNTRIES],
        key=f"country_{config_id}",
        help="Determina o modelo e os limites de engenharia aplicáveis (RN03).",
    )

    config: dict[str, Any] = {}
    for field_name in CONFIG_FIELDS:
        value = st.selectbox(
            CONFIG_FIELD_LABELS[field_name],
            options=[placeholder, *CONFIG_FIELD_OPTIONS[field_name]],
            key=f"{field_name}_{config_id}",
        )
        config[field_name] = None if value == placeholder else value

    return {
        "id": config_id,
        "label": label,
        "country": None if country == placeholder else country,
        "config": config,
    }


# --------------------------------------------------------------------------- #
# Exibicao dos resultados
# --------------------------------------------------------------------------- #


def _error_margin_style(prediction: dict[str, Any]) -> tuple[str, str]:
    """Cor (do Guia de Estilo) e texto da margem de erro contra a RN06."""
    margin = prediction.get("error_margin_pct")
    if margin is None:
        return styles.COLORS["cinza_escuro"], "margem indisponível"
    if prediction.get("within_acceptance"):
        return (
            styles.COLORS["conscientious_green"],
            f"± {margin:.1f} % (≤ {rules.ACCEPTANCE_ERROR_PCT:.0f} %)",
        )
    return (
        styles.COLORS["vermelho_vistoria"],
        f"± {margin:.1f} % (> {rules.ACCEPTANCE_ERROR_PCT:.0f} %)",
    )


def render_prediction_card(prediction: dict[str, Any]) -> None:
    """Card de um sensor, com as regras de negócio e o Guia de Estilo aplicados.

    Tipografia e cor vêm só de `styles.py`: `.tp-card`, `.rotulo-card`,
    `.numero-destaque`, `.texto-corrido` e `.badge-*` (nenhuma cor
    hexadecimal solta neste bloco).
    """
    esc = html.escape
    error_color, error_text = _error_margin_style(prediction)

    # RN09 - predicao acima do limite de engenharia recebe destaque visual,
    # esteja ou nao dentro da faixa testada pelo modelo. A cor da borda segue
    # a mesma escala de severidade do badge (vistoria/crítico = vermelho).
    if prediction["exceeds_limit"]:
        border_color = (
            styles.COLORS["vermelho_critico"]
            if prediction.get("severity") == rules.SEVERITY_CRITICO
            else styles.COLORS["vermelho_vistoria"]
        )
        border_style = f"border-left: 4px solid {border_color};"
        limit_line = (
            f"<div class='texto-corrido' style='color:{styles.COLORS['vermelho_vistoria']};"
            f"font-weight:600;'>▲ Excede o limite de engenharia "
            f"({prediction['engineering_limit']:.1f} °C)</div>"
        )
    else:
        border_style = ""  # usa a borda azul padrão do `.tp-card`
        limit_line = (
            f"<div class='texto-corrido'>Limite de engenharia: "
            f"{prediction['engineering_limit']:.1f} °C</div>"
        )

    reliability_class = styles.RELIABILITY_BADGE_CLASS.get(
        prediction["reliability_state"], "badge-vistoria"
    )
    reliability_row = (
        f"<div style='margin-top:10px;'>"
        f"<span class='texto-corrido' style='font-size:0.72rem;color:{styles.COLORS['cinza_escuro']};"
        f"margin-right:6px;'>Confiabilidade</span>"
        f"<span class='badge {reliability_class}'>"
        f"{prediction['reliability_icon']} {esc(prediction['reliability_label'])}</span>"
        f"</div>"
    )

    if prediction["show_numeric_value"]:
        # RN05 - temperatura e margem de erro sempre juntas.
        severity = prediction.get("severity")
        severity_row = ""
        if severity:
            severity_class = styles.SEVERITY_BADGE_CLASS[severity]
            severity_label = styles.SEVERITY_LABELS[severity]
            severity_row = (
                f"<div style='margin-top:6px;'>"
                f"<span class='texto-corrido' style='font-size:0.72rem;color:{styles.COLORS['cinza_escuro']};"
                f"margin-right:6px;'>Severidade</span>"
                f"<span class='badge {severity_class}'>{severity_label}</span>"
                f"</div>"
            )

        temp_text = f"{prediction['predicted_temp']:.1f}"
        value_block = (
            f"<div class='numero-destaque'>{esc(temp_text)}"
            f"<span class='unidade'>°C</span></div>"
            f"<div class='texto-corrido' style='color:{error_color};font-weight:600;'>"
            f"{esc(error_text)}</div>"
            f"{reliability_row}{severity_row}"
        )
    else:
        # RN08 - fora de dominio o valor numerico e suprimido.
        value_block = (
            f"<div class='texto-corrido' style='background:{styles.COLORS['vermelho_claro']};"
            f"border-radius:6px;padding:8px;color:{styles.COLORS['vermelho_vistoria']};"
            f"font-weight:600;'>{esc(rules.OUT_OF_DOMAIN_MESSAGE)}</div>"
            f"<div class='texto-corrido' style='margin-top:4px;font-size:0.85rem;'>"
            f"Margem de erro estimada: {esc(prediction['display_margin'])}</div>"
            f"{reliability_row}"
        )

    # O nome do sensor ja comeca com o prefixo da area ("Mainback - Painel
    # ..."), entao mostrar {key_area} · {sensor_name} inteiro repetia a area
    # duas vezes no cabecalho. Tira so a parte apos o " - ": o rotulo em cima
    # (key_area, em caixa alta) ja da esse contexto.
    sensor_short_name = prediction["sensor_name"].split(" - ", 1)[-1]

    st.markdown(
        f"""
        <div class="tp-card" style="{border_style}">
          <div class="rotulo-card">{esc(prediction['key_area'])} · {esc(sensor_short_name)}</div>
          {value_block}
          <div style="margin-top:10px;">{limit_line}</div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def render_config_summary(query: dict[str, Any]) -> None:
    config = query["config"]
    items = [f"**País:** {query['country']}"]
    items += [
        f"**{CONFIG_FIELD_LABELS[f]}:** {config.get(f)}" for f in CONFIG_FIELDS
    ]
    st.caption(" · ".join(items))


def build_comparison_table(queries: list[dict[str, Any]]) -> pd.DataFrame:
    """Tabela com uma coluna por configuracao comparada (RF09)."""
    rows: dict[tuple[str, str], dict[str, Any]] = {}

    for query in queries:
        for pred in query["predictions"]:
            key = (pred["key_area"], pred["sensor_name"])
            row = rows.setdefault(
                key,
                {"Área-chave": pred["key_area"], "Sensor": pred["sensor_name"]},
            )
            if pred["show_numeric_value"]:
                # RN05 - o valor nunca aparece sem a margem de erro.
                cell = rules.format_temp_with_margin(
                    pred["predicted_temp"], pred["error_margin_pct"]
                )
            else:
                # RN08 - fora de dominio: sem valor numerico.
                cell = "Fora de domínio — rodar CFD"
            if pred["exceeds_limit"]:
                cell += "  ▲"  # RN09
            row[query["label"]] = f"{pred['reliability_icon']} {cell}"

    return pd.DataFrame(list(rows.values()))


def render_export_buttons(queries: list[dict[str, Any]]) -> None:
    """RF11 / RN14 - exportacao tabular completa, nunca so o valor bruto."""
    export_rows = rules.build_export_rows(queries)
    if not export_rows:
        return

    df = pd.DataFrame(export_rows).rename(columns=rules.EXPORT_COLUMN_LABELS)
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    col_csv, col_xlsx = st.columns(2)

    col_csv.download_button(
        "↓ Exportar CSV",
        data=df.to_csv(index=False, sep=";", decimal=",").encode("utf-8-sig"),
        file_name=f"thermal_predictor_{stamp}.csv",
        mime="text/csv",
        width="stretch",
    )

    buffer = io.BytesIO()
    try:
        with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
            df.to_excel(writer, index=False, sheet_name="Predições")
        col_xlsx.download_button(
            "↓ Exportar Excel",
            data=buffer.getvalue(),
            file_name=f"thermal_predictor_{stamp}.xlsx",
            mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            width="stretch",
        )
    except ImportError:
        # Falha explicita e amigavel: sem `openpyxl` o CSV continua disponivel.
        col_xlsx.warning("Exportação Excel indisponível: instale `openpyxl`.")


def render_results(queries: list[dict[str, Any]]) -> None:
    st.divider()
    st.subheader("Resultados")

    # RF20 / RN15 - aviso fixo, sempre visivel junto de qualquer predicao.
    st.warning(f"**{rules.CFD_DISCLAIMER}**")

    all_predictions = [p for q in queries for p in q["predictions"]]
    summary = rules.summarize(all_predictions)

    cols = st.columns(4)
    cols[0].metric("Predições exibidas", summary["total"])
    cols[1].metric("Acima do limite de engenharia", summary["exceeding_limit"])
    cols[2].metric(
        f"Erro acima de {rules.ACCEPTANCE_ERROR_PCT:.0f}%", summary["above_error_threshold"]
    )
    cols[3].metric("Fora de domínio", summary["out_of_domain"])

    if len(queries) > 1:
        st.markdown("#### Comparação lado a lado")
        table = build_comparison_table(queries)
        st.dataframe(table, width="stretch", hide_index=True)
        st.caption(
            "Legenda: ✓ interpolação · ! extrapolação moderada · "
            "✕ fora de domínio · ▲ excede o limite de engenharia."
        )

    st.markdown("#### Detalhamento por configuração")
    columns = st.columns(len(queries))
    for column, query in zip(columns, queries):
        with column:
            st.markdown(f"##### {query['label']}")
            render_config_summary(query)
            for prediction in query["predictions"]:
                render_prediction_card(prediction)

    st.markdown("#### Exportação")
    st.caption(
        "O arquivo inclui a configuração consultada, a temperatura estimada, a "
        "margem de erro e o estado de confiabilidade (RN14)."
    )
    render_export_buttons(queries)


# --------------------------------------------------------------------------- #
# Pagina: Nova Consulta
# --------------------------------------------------------------------------- #


def run_query(config_entries: list[dict[str, Any]], selected_sensors: list[str]) -> None:
    """Executa a predicao para cada configuracao validada.

    RN10 - cada configuracao e validada e processada individualmente; uma
    invalida nao impede a exibicao das demais.
    """
    queries: list[dict[str, Any]] = []
    failures: list[str] = []

    for entry in config_entries:
        validation = rules.validate_configuration(
            country=entry["country"],
            config=entry["config"],
            selected_key_areas=st.session_state.prev_key_areas,
            selected_sensors=selected_sensors,
        )
        if not validation.is_valid:
            failures.append(f"**{entry['label']}**: " + " ".join(validation.errors))
            continue

        try:
            raw = mock_predict(
                country=entry["country"],
                **entry["config"],
                selected_sensors=selected_sensors,
            )
        except (ValueError, KeyError) as exc:
            # Erro explicito: a interface nao quebra silenciosamente.
            failures.append(f"**{entry['label']}**: falha na predição — {exc}")
            continue

        # RN05-RN09 - regras de exibicao aplicadas antes de qualquer render.
        queries.append(
            {
                "label": entry["label"],
                "country": entry["country"],
                "config": entry["config"],
                "predictions": rules.enrich_predictions(raw),
            }
        )

    st.session_state.last_queries = queries
    st.session_state.query_failures = failures


def render_new_query_page() -> None:
    render_page_header(
        "Modelo preditivo · Thermal Predictor",
        "Nova consulta",
        "Estimativa baseada em simulação CFD — não é medição física",
    )

    st.subheader("1. Configuração do produto")
    config_entries: list[dict[str, Any]] = []
    config_columns = st.columns(len(st.session_state.config_ids))
    for index, (column, config_id) in enumerate(
        zip(config_columns, list(st.session_state.config_ids))
    ):
        with column:
            with st.container(border=True):
                config_entries.append(render_config_block(config_id, index))

    if len(st.session_state.config_ids) < MAX_CONFIGS:
        # RF09 - consulta simultanea de duas ou mais configuracoes.
        st.button(
            "+ Adicionar outra configuração para comparar", on_click=_add_config
        )
    else:
        st.caption(f"Limite de {MAX_CONFIGS} configurações comparadas por consulta.")

    key_areas, selected_sensors = render_sensor_picker()

    # Validacao ao vivo de todas as configuracoes (RN01, RN02, RN04, RN10).
    pending: list[str] = []
    for entry in config_entries:
        validation = rules.validate_configuration(
            country=entry["country"],
            config=entry["config"],
            selected_key_areas=key_areas,
            selected_sensors=selected_sensors,
        )
        pending += [f"{entry['label']}: {msg}" for msg in validation.errors]

    st.subheader("3. Gerar previsão")
    if pending:
        with st.expander(f"! {len(pending)} pendência(s) impedem a consulta", expanded=True):
            for message in pending:
                st.write(f"- {message}")

    # RN01 / RN02 / RN04 - o botao so habilita com tudo preenchido.
    submitted = st.button(
        "Gerar previsão",
        type="primary",
        disabled=bool(pending),
        help="Preencha todos os parâmetros e selecione ao menos um sensor.",
    )

    if submitted:
        run_query(config_entries, selected_sensors)

    for failure in st.session_state.get("query_failures", []):
        st.error(failure)

    if st.session_state.last_queries:
        render_results(st.session_state.last_queries)


# --------------------------------------------------------------------------- #
# Pagina: Historico de acessos (RF10)
# --------------------------------------------------------------------------- #


def render_access_history_page() -> None:
    """RF10 — histórico de acessos. Sem login: não há senha nem controle de
    acesso, isto é só um registro de uso (usuário do sistema operacional,
    não uma conta autenticada) — ver `access_log.py` e o README."""
    render_page_header(
        "Modelo preditivo · Thermal Predictor",
        "Histórico de acessos",
    )

    persisted = access_log.read_access_log()
    entries = persisted or st.session_state.session_access_log
    if not entries:
        st.info("Nenhum acesso registrado até o momento.")
        return

    df = pd.DataFrame(entries).rename(
        columns={"timestamp": "Data/hora", "usuario": "Usuário", "persistido": "Persistido"}
    )

    usuarios = ["Todos"] + sorted(df["Usuário"].unique())
    selecionado = st.selectbox("Usuário", usuarios)
    view = df if selecionado == "Todos" else df[df["Usuário"] == selecionado]

    st.dataframe(view, width="stretch", hide_index=True)
    st.caption(
        f"{len(view)} de {len(df)} registro(s). "
        f"Origem: {'arquivo `logs/access_log.csv`' if persisted else 'memória da sessão'}."
    )


# --------------------------------------------------------------------------- #
# Shell da aplicacao
# --------------------------------------------------------------------------- #


def render_sidebar() -> str:
    """Identidade, nota de fase mock e navegação. Sem login (ver README):
    a navegação abaixo não é uma sessão de usuário, é só a troca de tela."""
    with st.sidebar:
        st.markdown("### Thermal Predictor")
        st.caption("Whirlpool — Divisão de Fogões × Inteli")
        page = st.radio(
            "Navegação",
            ["Nova consulta", "Histórico de acessos"],
            label_visibility="collapsed",
        )
        st.divider()
        st.caption(
            "**Fase mock.** As predições vêm de `mock_data.mock_predict()` e "
            "não do modelo treinado. Ver `README.md`."
        )
    return page


def main() -> None:
    init_session_state()
    page = render_sidebar()
    if page == "Histórico de acessos":
        render_access_history_page()
    else:
        render_new_query_page()


main()
