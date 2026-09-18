"""Gera as sete planilhas wide com as colunas binarias derivadas de `reason`.

O `tratamento_final_dos_dados.ipynb` descarta `reason` logo na primeira celula e
unifica os runs agrupando apenas pelas sete variaveis de configuracao. Com isso,
56 runs viram 33 linhas: runs que so se distinguem pelo `reason` sao mediados
juntos.

Este script repete o mesmo tratamento, mas converte o `reason` em colunas
binarias antes da unificacao, seguindo a auditoria manual do Lucas: so viram
coluna os reasons que carregam informacao de configuracao nao contida nas sete
variaveis. Os demais ficam com peso zero (todas as flags em 0).

Saida: data/reasons/<area>_data.csv. Nada em data/ e sobrescrito.
"""

import re
from pathlib import Path

import pandas as pd

RAIZ = Path(__file__).resolve().parent.parent
ARQUIVO_ENTRADA = RAIZ / "data" / "dataset_pre_processado.csv"
DIRETORIO_SAIDA = RAIZ / "data" / "reasons"

# Mesmas decisoes do tratamento_final_dos_dados.ipynb.
MAINBACK_TC_EXCLUIDO = "Oven RTD Connector Body"
COLUNAS_DESCARTADAS = ["run_id", "tc_number", "active_limit", "key_area"]

VARIAVEIS_CONFIGURACAO = [
    "blower_direction",
    "housing",
    "board_position",
    "run_case",
    "losses",
    "deflector_hole",
    "material_coil_support",
]

# ---------------------------------------------------------------------------
# Auditoria manual dos reasons
# ---------------------------------------------------------------------------
# Cada chave vira uma coluna binaria. Reasons na mesma lista compartilham a
# coluna, ou seja, tem o mesmo peso no modelo. Um mesmo reason pode alimentar
# mais de uma coluna: "Run with cover, tested a new duct" descreve cobertura e
# duct ao mesmo tempo.
REASONS_POR_COLUNA = {
    # 1. Cobertura sobre o heatsink. A ausencia medida ("No cover on HS") tem
    # coluna propria para nao se confundir com um run sem informacao.
    "sem_cobertura_hs": [
        "No cover on HS",
    ],
    "com_cobertura_hs": [
        "Added a cover above Heatsink",
        "Run with cover",
        "Run with cover, tested a new duct",
    ],
    # 2. Nivel do ventilador. Tres niveis, tres colunas.
    "fan_baixo": [
        "Broil Qualitative - 16 CFM (More flow on blower)",
        "Broil 16 CFM",
        "Broil Qualitative (16 cfm) CMC Deflector",
        "Aluminium Plate Broil wo Cookitop and fan on low",
    ],
    "fan_medio": [
        "Aluminium Plate Pyro Blower On Medium",
        "Fan velocity 1500 RPM",
    ],
    "fan_alto": [
        # "Blower On" sem qualificador: assume-se o default alto.
        "Aluminium Plate Pyro Blower On High",
        "Aluminium Plate Pyro Blower On",
    ],
    # 3. Alteracoes de duct, tray e housing.
    "duct_novo": [
        "Baseline new Duct",
        "Run with cover, tested a new duct",
    ],
    "tray_simplificada": [
        "New Baseline - Simplified Tray",
    ],
    "tray_furada": [
        "New Baseline - Hole Tray",
    ],
    "duct_mainback": [
        "Changed the mainback duct and updated hosuing",
    ],
    "clip_housing": [
        "Run 32 - Clip Housing Solution",
    ],
}

# Reasons vistos na auditoria e descartados de proposito: ou sao autoexplicativos
# (repetem o que as sete variaveis ja dizem), ou nao separam nada. Ficam com
# todas as flags em 0. A lista existe para o script falhar quando aparecer um
# reason novo, em vez de silenciosamente trata-lo como irrelevante.
REASONS_DESCARTADOS = [
    "Bigger Opening in the single plate",
    "Run 31 ",
    "Run 26 - Diff Order IGBTs",  # identico ao Run 26, variacao minima
    "Aluminium Plate Broil wo Cookitop",
    "New Baseline",
    "New Baseline - Real Tray",
    "Run 34 - New Deflector For IPC",
    "With Deflector - New Hole position",
    "With Deflector - No Back Hole",
    "Part of study of position",
    "Double Flow on Blower",
    "Plastic Plate",
    "Plastic Plate with spacer",
    "Plastic Plate Broil C1",
    "Aluminium Plate",
    "Aluminium Plate new baseline",
    "Aluminium Plate Broil C1",
    "Não informado",
]

COLUNAS_REASON = list(REASONS_POR_COLUNA)

PADRAO_IGBT = re.compile(r"^IGBT (?:[1-9]|1[0-6])$")


def conferir_cobertura_dos_reasons(reasons_observados) -> None:
    """Falha se algum reason do dataset nao passou pela auditoria manual."""
    mapeados = {r for lista in REASONS_POR_COLUNA.values() for r in lista}
    conhecidos = mapeados | set(REASONS_DESCARTADOS)
    desconhecidos = sorted(set(reasons_observados) - conhecidos)
    if desconhecidos:
        raise ValueError(
            "Reasons fora da auditoria manual: "
            + ", ".join(repr(r) for r in desconhecidos)
            + ". Classifique cada um em REASONS_POR_COLUNA ou REASONS_DESCARTADOS "
            "antes de gerar as planilhas."
        )


def adicionar_colunas_de_reason(df: pd.DataFrame) -> pd.DataFrame:
    """Converte a coluna `reason` nas colunas binarias da auditoria."""
    df = df.copy()
    for coluna, reasons in REASONS_POR_COLUNA.items():
        df[coluna] = df["reason"].isin(reasons).astype(int)
    return df.drop(columns="reason")


def dividir_por_key_area(df: pd.DataFrame) -> dict:
    """Uma tabela por key_area, sem as colunas que nao entram no modelo."""
    tabelas = {}
    for area in df["key_area"].unique():
        area_df = df[df["key_area"] == area].copy()

        if area == "Mainback":
            area_df = area_df[area_df["tc_name"] != MAINBACK_TC_EXCLUIDO]

        area_df = area_df.drop(columns=COLUNAS_DESCARTADAS)
        ordenadas = [c for c in area_df.columns if c != "temp"] + ["temp"]
        tabelas[area] = area_df[ordenadas]
    return tabelas


def tc_names_para_colunas(area_df: pd.DataFrame) -> pd.DataFrame:
    """Transforma tc_name em colunas, preservando todas as temperaturas."""
    colunas_indice = [c for c in area_df.columns if c not in ["tc_name", "temp"]]
    origem = area_df.copy()

    # Numera medicoes repetidas para o pivot nao descartar temperaturas.
    origem["numero_medicao"] = origem.groupby(
        colunas_indice + ["tc_name"], dropna=False
    ).cumcount()

    wide_df = origem.pivot(
        index=colunas_indice + ["numero_medicao"],
        columns="tc_name",
        values="temp",
    ).reset_index()
    wide_df.columns.name = None
    return wide_df.drop(columns="numero_medicao")


def preencher_nulos(wide_df: pd.DataFrame, componentes) -> pd.DataFrame:
    """Mediana quando ha outlier pelo IQR, media caso contrario."""
    wide_df = wide_df.copy()
    for componente in componentes:
        temperaturas = pd.to_numeric(wide_df[componente], errors="coerce")
        validas = temperaturas.dropna()
        if validas.empty:
            continue

        q1, q3 = validas.quantile(0.25), validas.quantile(0.75)
        iqr = q3 - q1
        tem_outlier = ((validas < q1 - 1.5 * iqr) | (validas > q3 + 1.5 * iqr)).any()

        valor = validas.median() if tem_outlier else validas.mean()
        wide_df[componente] = temperaturas.fillna(valor)
    return wide_df


def consolidar_igbt(wide_df: pd.DataFrame) -> pd.DataFrame:
    """IGBT 1..16 viram uma coluna IGBT com a media por run."""
    colunas = [c for c in wide_df.columns if PADRAO_IGBT.fullmatch(c)]
    if not colunas:
        return wide_df

    media = wide_df[colunas].apply(pd.to_numeric, errors="coerce").mean(axis=1).round(2)
    posicao = min(wide_df.columns.get_loc(c) for c in colunas)
    wide_df = wide_df.drop(columns=colunas)
    wide_df.insert(posicao, "IGBT", media)
    return wide_df


def unificar_configuracoes(wide_df: pd.DataFrame) -> pd.DataFrame:
    """Media das medicoes que compartilham configuracao E flags de reason."""
    chave = VARIAVEIS_CONFIGURACAO + COLUNAS_REASON
    temperaturas = [c for c in wide_df.columns if c not in chave]
    valores = wide_df[temperaturas].apply(pd.to_numeric, errors="coerce")
    return (
        pd.concat([wide_df[chave], valores], axis=1)
        .groupby(chave, dropna=False, as_index=False)[temperaturas]
        .mean()
    )


def main() -> None:
    df = pd.read_csv(ARQUIVO_ENTRADA, encoding="utf-8-sig")

    # 'Open - Updated' aparece em housing, nunca em deflector_hole. A celula 3 do
    # tratamento_final_dos_dados.ipynb aplica a substituicao em deflector_hole
    # (onde nao tem efeito), mas os CSVs em data/ estao com housing normalizado,
    # e o Random_for_regre.ipynb tambem normaliza housing ao carregar. Aqui a
    # substituicao segue os dados em disco, para as planilhas continuarem
    # compativeis com o notebook de modelagem.
    df["housing"] = df["housing"].replace("Open - Updated", "Open")

    conferir_cobertura_dos_reasons(df["reason"].dropna().unique())

    # Mesma substituicao do notebook: 'Nao informado' em losses vira 'No losses'.
    normalizado = df["losses"].astype("string").str.strip().str.casefold()
    df.loc[normalizado.eq("não informado"), "losses"] = "No losses"

    df = adicionar_colunas_de_reason(df)

    DIRETORIO_SAIDA.mkdir(parents=True, exist_ok=True)
    resumo = []

    for area, area_df in dividir_por_key_area(df).items():
        componentes = area_df["tc_name"].dropna().unique()
        wide_df = tc_names_para_colunas(area_df)
        wide_df = preencher_nulos(wide_df, componentes)
        wide_df = consolidar_igbt(wide_df)

        linhas_antes = len(wide_df)
        wide_df = unificar_configuracoes(wide_df)

        arquivo = DIRETORIO_SAIDA / f"{area.lower().replace(' ', '_')}_data.csv"
        wide_df.to_csv(arquivo, index=False)
        resumo.append(
            {
                "key_area": area,
                "runs": linhas_antes,
                "linhas_finais": len(wide_df),
                "termopares": len(wide_df.columns)
                - len(VARIAVEIS_CONFIGURACAO)
                - len(COLUNAS_REASON),
                "arquivo": arquivo.name,
            }
        )

    print(pd.DataFrame(resumo).to_string(index=False))


if __name__ == "__main__":
    main()
