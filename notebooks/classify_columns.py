import sys

import pandas as pd

OUT = "data/classificacao_colunas.csv"

META_ROWS = [
    "Reason", "Blower Direction", "Housing", "Board Position",
    "Run Case", "Mesh Duct", "Losses", "Deflector Hole",
]
# linha 8 ("Mainback Components ") nao e' metadado real: e' 100% vazia em
# todas as runs e marca so' o inicio do bloco de sensores/TCs -> nao entra
# em META_ROWS, so' desloca onde `tcs` comeca a ser lido (ver build_tidy)

# colunas que o pandas classificaria como numericas (sao 0/1) mas que
# CONCEITUALMENTE sao categoricas -> override manual
FORCE_CATEGORICAL = {"is_monitor", "housing_updated", "exceeds_limit"}
# colunas de texto livre, sem vocabulario fechado -> tratamento a parte
FREE_TEXT = {"reason"}


def build_tidy(path: str) -> pd.DataFrame:
    df = pd.read_excel(path, sheet_name=0)
    run_cols = list(df.columns[4:])

    meta = {}
    for i, name in enumerate(META_ROWS):
        actual = str(df.iloc[i, 0]).strip()
        assert actual == name, (
            f"linha {i} da planilha e' '{actual}', esperado '{name}'. "
            "Confira se a estrutura do dataset do seu grupo bate com o "
            "esperado (ajuste META_ROWS se a ordem/nomes forem diferentes)."
        )
        meta[name] = df.iloc[i][run_cols]

    runs = pd.DataFrame(index=run_cols)
    runs.index.name = "run_id"
    runs["reason"] = meta["Reason"].values
    runs["blower_direction"] = meta["Blower Direction"].values
    runs["housing"] = meta["Housing"].values
    runs["housing_updated"] = [
        int("updated" in str(v).lower()) for v in meta["Housing"]
    ]
    runs["board_position"] = meta["Board Position"].values
    runs["run_case"] = meta["Run Case"].values
    runs["mesh_duct"] = meta["Mesh Duct"].values
    runs["loss_profile"] = meta["Losses"].values
    runs["deflector_hole"] = meta["Deflector Hole"].values

    tcs = df.iloc[9:].copy()
    tcs = tcs[tcs["TC Name"].notna()].copy()
    tcs["tc_name"] = tcs["TC Name"].astype(str).str.strip()
    tcs["key_area"] = tcs["Key Area"].astype(str).str.strip()
    lim = pd.to_numeric(tcs["Active Limit"], errors="coerce")
    tcs["active_limit_c"] = lim
    tcs["is_monitor"] = lim.isna().astype(int)

    rows = []
    for _, tc in tcs.iterrows():
        for rc in run_cols:
            v = pd.to_numeric(tc[rc], errors="coerce")
            if pd.isna(v):
                continue
            rows.append({
                "run_id": rc,
                "tc_name": tc["tc_name"],
                "key_area": tc["key_area"],
                "active_limit_c": tc["active_limit_c"],
                "is_monitor": tc["is_monitor"],
                "temp_c": float(v),
            })
    tidy = pd.DataFrame(rows).merge(runs.reset_index(), on="run_id", how="left")
    tidy["margin_c"] = tidy["active_limit_c"] - tidy["temp_c"]
    tidy["exceeds_limit"] = (tidy["margin_c"] < 0).astype("Int64")
    tidy.loc[tidy["active_limit_c"].isna(), "exceeds_limit"] = pd.NA
    return tidy


def classify(tidy: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for col in tidy.columns:
        s = tidy[col]
        if col in FREE_TEXT:
            tipo = "Categorica (texto livre - excluir do modelo)"
        elif col in FORCE_CATEGORICAL:
            tipo = "Categorica (flag 0/1)"
        elif pd.api.types.is_numeric_dtype(s):
            tipo = "Numerica"
        else:
            tipo = "Categorica"
        rows.append({
            "coluna": col,
            "tipo": tipo,
            "n_unicos": int(s.nunique()),
            "ausentes": int(s.isna().sum()),
        })
    return pd.DataFrame(rows)


def to_markdown(df: pd.DataFrame, cols) -> str:
    header = "| " + " | ".join(cols) + " |"
    sep = "|" + "|".join(["---"] * len(cols)) + "|"
    lines = [header, sep]
    for _, row in df.iterrows():
        lines.append("| " + " | ".join(str(row[c]) for c in cols) + " |")
    return "\n".join(lines)


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else "data/dataset.xlsx"
    tidy = build_tidy(path)
    result = classify(tidy)

    result.to_csv(OUT, index=False)
    print(result.to_string(index=False))
    print(f"\nsalvo em {OUT}")

    print("\n--- markdown pronto para colar na documentacao (Secao 4.2.1) ---\n")
    print(to_markdown(result, ["coluna", "tipo"]))


if __name__ == "__main__":
    sys.exit(main())
