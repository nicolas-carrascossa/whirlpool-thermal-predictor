"""
styles.py — Implementação do Guia de Estilo (Cor e Tipografia) do dashboard.

Fonte: Guia de Estilo do Dashboard Preditivo de Temperatura — Whirlpool
Corporate Style Guide (paletas neutra, azul, verde, amarela) + os dois
vermelhos de aviso definidos pela equipe (Vistoria / Crítico).

Regra fixa do guia: cor é informação. Branco/neutros = estrutura da tela;
azul = interface e medição; verde/amarelo/vermelho = SOMENTE estados da
previsão, sempre com rótulo em texto — nunca decoração.

Este módulo centraliza toda cor e toda regra de tipografia do dashboard.
Nenhum outro arquivo deve declarar cor hexadecimal solta: `app.py` consome
`COLORS`, `SEVERITY_*` e `RELIABILITY_BADGE_CLASS` daqui.
"""
import streamlit as st

# --- Paleta oficial -------------------------------------------------------

COLORS = {
    # Neutros — estrutura da tela, texto de leitura
    "branco": "#ffffff",
    "cinza_extra_claro": "#f5f6f7",
    "cinza_claro": "#dee0e3",
    "cinza": "#d1d3d4",
    "cinza_medio": "#9fa0a1",
    "cinza_escuro": "#767777",
    "quase_preto": "#484949",
    # Azul — interface, ações primárias, série medida
    "accomplished_blue": "#0d436b",   # títulos, números-chave, navegação
    "accent_blue": "#00a0dd",         # série prevista, links, estados selecionados
    "light_accent_blue": "#edf4fc",   # fundo de cartão em destaque, faixa de confiança
    # Verde — estado NORMAL da previsão
    "conscientious_green": "#6aa342",
    "accent_green": "#c7d88e",
    "light_accent_green": "#f6f9ed",
    # Amarelo — estado de ATENÇÃO / destaque (nunca em texto pequeno)
    "universal_yellow": "#eeb111",
    "accent_yellow": "#f3d04f",
    "light_accent_yellow": "#fdf7e4",
    # Vermelhos de aviso — VISTORIA (verificação humana) e CRÍTICO (interromper uso)
    "vermelho_vistoria": "#c8382b",
    "vermelho_critico": "#8c1d18",
    "vermelho_claro": "#fdecea",
}

# --- Escala de severidade da previsão (4 estados do guia) ----------------
# normal < atenção < vistoria < crítico
# Ver `business_rules.classify_severity` para os cortes numéricos.

SEVERITY_LABELS = {
    "normal": "NORMAL",
    "atencao": "ATENÇÃO",
    "vistoria": "VISTORIA",
    "critico": "CRÍTICO",
}

SEVERITY_BADGE_CLASS = {
    "normal": "badge-normal",
    "atencao": "badge-atencao",
    "vistoria": "badge-vistoria",
    "critico": "badge-critico",
}


# --- Mapeamento dos 3 estados de confiabilidade (RN07) para o mesmo
# vocabulário visual do guia (verde = ok, amarelo = atenção, vermelho =
# exige verificação) -------------------------------------------------------

RELIABILITY_BADGE_CLASS = {
    "interpolação": "badge-normal",
    "extrapolação moderada": "badge-atencao",
    "fora de domínio": "badge-vistoria",
}

# --- CSS: tipografia (Nunito Sans + Open Sans) e componentes -------------

CUSTOM_CSS = """
<style>
@import url('https://fonts.googleapis.com/css2?family=Nunito+Sans:ital,wght@0,300;0,700;1,300&family=Open+Sans:wght@400;600;700&display=swap');

/* Base: fundo branco dominante, texto em Open Sans, cor reservada ao dado */
html, body, [class*="css"], .stMarkdown, p, label, span {
    font-family: 'Open Sans', sans-serif !important;
    color: #484949;
}
[data-testid="stAppViewContainer"] {
    background-color: #ffffff;
}

/* Os ícones nativos do Streamlit (setas, olho de senha, "x" de tag, etc.)
   são glifos de uma fonte de ícones (Material Symbols), não texto. A regra
   acima força Open Sans em todo `span` — sem esta exceção, cada ícone vira
   a palavra literal do glifo (ex.: "visibility" em vez do olho). */
[data-testid="stIconMaterial"] {
    font-family: 'Material Symbols Rounded' !important;
}

/* Título — Nunito Sans Light, azul central. Define a escala da tela. */
h1, h2, h3, h4, h5, .titulo {
    font-family: 'Nunito Sans', sans-serif !important;
    font-weight: 300 !important;
    color: #0d436b !important;
}

/* Chapéu — Nunito Sans Bold, caixa alta, entreletra ampla, min 12pt */
.chapeu {
    font-family: 'Nunito Sans', sans-serif;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5em;
    font-size: 12px;
    color: #767777;
    margin-bottom: 4px;
}

/* Subtítulo — Open Sans Semibold, caixa alta, entreletra 30 */
.subtitulo {
    font-family: 'Open Sans', sans-serif;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.3em;
    color: #767777;
    font-size: 13px;
    margin-bottom: 16px;
}

/* Texto corrido — Open Sans Regular, min 8pt, neutro, nunca cor de estado */
.texto-corrido {
    font-family: 'Open Sans', sans-serif;
    font-weight: 400;
    color: #484949;
    font-size: 14px;
    line-height: 1.5;
}

/* Número em destaque — Nunito Sans Light, azul central, unidade menor em cinza */
.numero-destaque {
    font-family: 'Nunito Sans', sans-serif;
    font-weight: 300;
    color: #0d436b;
    font-size: 42px;
    line-height: 1.1;
}
.numero-destaque .unidade {
    font-size: 18px;
    color: #767777;
    margin-left: 4px;
}

/* Rótulo de card — Open Sans Bold, caixa alta, entreletra 0.16em, min 10px */
.rotulo-card {
    font-family: 'Open Sans', sans-serif;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    color: #767777;
    font-size: 11px;
    margin-bottom: 8px;
}

/* Cartão padrão do dashboard */
.tp-card {
    background-color: #f5f6f7;
    border-radius: 8px;
    padding: 16px 20px;
    margin-bottom: 12px;
    border-left: 4px solid #00a0dd;
}

/* Badges de estado — cor fixa por significado, sempre com rótulo em texto.
   Contraste conforme o guia: texto branco sobre azul/vermelhos,
   quase-preto sobre amarelo. */
.badge {
    display: inline-block;
    font-family: 'Open Sans', sans-serif;
    font-weight: 700;
    text-transform: uppercase;
    font-size: 11px;
    padding: 4px 10px;
    border-radius: 4px;
    letter-spacing: 0.05em;
    margin-right: 6px;
}
.badge-normal   { background-color: #6aa342; color: #ffffff; }              /* Conscientious Green */
.badge-atencao  { background-color: #f3d04f; color: #484949; }              /* Accent Yellow — texto quase-preto */
.badge-vistoria { background-color: #c8382b; color: #ffffff; }             /* Vermelho Vistoria */
.badge-critico  { background-color: #8c1d18; color: #ffffff; }             /* Vermelho Crítico */
/* Botões / CTA — Nunito Sans Bold, caixa alta, azul central.
   `[data-testid^="stBaseButton"]` cobre todo tipo de botão do Streamlit
   (primary, secondary, form-submit, download) com um único seletor estável;
   `:not([kind="header"])` poupa os botões do próprio chrome do Streamlit
   ("Deploy", menu "⋮"). O `!important` é necessário: o tema padrão do
   Streamlit pinta botões primários com a cor de destaque do tema
   (`primaryColor`) através de uma regra própria que, sem isto, vence a
   nossa — mesmo com `primaryColor` já ajustado em `.streamlit/config.toml`,
   o `!important` garante que o CTA continue azul central independentemente
   do tema. Aplica-se a `button` (o elemento) e a `p`/`span`/`div` dentro
   dele, porque o rótulo do botão é texto aninhado com cor própria, não
   herdada. */
.stButton > button:not([kind="header"]),
.stDownloadButton > button,
[data-testid^="stBaseButton"]:not([kind="header"]) {
    font-family: 'Nunito Sans', sans-serif !important;
    font-weight: 700 !important;
    text-transform: uppercase !important;
    background-color: #0d436b !important;
    border-radius: 4px !important;
    border: none !important;
}
.stButton > button:not([kind="header"]) *,
.stDownloadButton > button *,
[data-testid^="stBaseButton"]:not([kind="header"]) * {
    color: #ffffff !important;
}
.stButton > button:not([kind="header"]):hover,
.stDownloadButton > button:hover,
[data-testid^="stBaseButton"]:not([kind="header"]):hover {
    background-color: #00a0dd !important;
}
/* Botão desabilitado — mantém a aparência apagada padrão do Streamlit em vez
   do azul central, para que "sem ação possível" continue óbvio (RN01/RN04). */
.stButton > button:disabled,
[data-testid^="stBaseButton"]:disabled {
    background-color: #dee0e3 !important;
}
.stButton > button:disabled *,
[data-testid^="stBaseButton"]:disabled * {
    color: #9fa0a1 !important;
}

/* Tags do multiselect (áreas-chave, sensores) — mesma cor de interface do
   guia. Reforça o `primaryColor` do tema (ver `.streamlit/config.toml`),
   que já deveria deixá-las azuis; esta regra garante o resultado mesmo se o
   tema não for aplicado (ex.: outro ambiente de deploy). */
[data-testid="stMultiSelect"] span[data-tag] {
    background-color: #0d436b !important;
    color: #ffffff !important;
}
/* O texto visível e o "x" de remover ficam em elementos filhos (ex.: um
   <span title="..."> aninhado) que já têm cor própria herdada do tema do
   Streamlit — sem isto, o `color` acima não alcança o texto, só o span
   externo, e a fonte continua escura sobre o fundo azul. */
[data-testid="stMultiSelect"] span[data-tag] * {
    color: #ffffff !important;
}

/* Tabelas — cabeçalho Semibold sobre azul central, corpo em Open Sans min 11px */
[data-testid="stDataFrame"] thead tr th {
    background-color: #0d436b !important;
    color: #ffffff !important;
    font-family: 'Open Sans', sans-serif !important;
    font-weight: 600 !important;
}
[data-testid="stDataFrame"] * {
    font-family: 'Open Sans', sans-serif !important;
    font-size: 12px !important;
}

/* Sidebar em neutro claro, sem cor de estado */
[data-testid="stSidebar"] {
    background-color: #f5f6f7;
}
</style>
"""


def inject_custom_css() -> None:
    st.markdown(CUSTOM_CSS, unsafe_allow_html=True)
