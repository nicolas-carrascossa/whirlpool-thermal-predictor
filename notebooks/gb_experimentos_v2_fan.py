"""
gb_experimentos_v2_fan.py - E13: separar a config 22 por fan_level

Nao modifica gb_experimentos.py nem gb_experimentos_v2.py; apenas importa.
Reimplementa a extracao de `fan_level` (parse_fan_level_fixed) porque
`parse_reason_flags_min` de gb_experimentos_v2.py tem um bug de substring
("low" casa dentro de "blower") que nao pode ser corrigido la (fora de
escopo alterar aquele arquivo).

Roda 5 variantes (R, F1, F2, F3, F4), todas no MESMO loader
(`v2.agregar_por_config`, baseado em `dataset_pre_processado.csv`, grade
completa + preenchimento IQR) para que a comparacao seja "maca com maca" -
o proprio E2 do relatorio ja documenta que esse loader fica ~0.12 C acima
do `carregar_longo` (planilhas wide) usado no E0/gb_v2_E0_*; nao da para
misturar as duas familias numa mesma comparacao com IC.

Tres vistas dos resultados (pedidas apos revisao):
  - RAW: MAE por variante no seu proprio LOGO (configs nao comparaveis 1:1).
  - RECONCILIADA: splits reagrupados na config original (media das previsoes
    dos membros) e comparados ao `real`/`pred` de R na mesma config - visao
    OTIMISTA porque a media entre 2-3 previsoes de configs "singleton"
    (fan_level visto uma unica vez no treino, ou seja, nao aprendivel em
    LOGO) suaviza erros grandes que aparecem individualmente no RAW.
  - LIMPA (C): so as configs originais que NAO foram tocadas (nenhum run
    membro teve relabel de material nem fan_level != NA) - comparacao 1:1
    estrita, sem nenhuma media escondendo variancia. Responde "conhecer
    fan_level/material de OUTRAS configs ajuda a prever as configs que nao
    mudaram?" (efeito de regularizacao/composicao do treino, nao de
    resolver ambiguidade da propria config).

Uso:
    .venv\\Scripts\\python.exe notebooks\\gb_experimentos_v2_fan.py
"""

from __future__ import annotations

import re
import sys
import time
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.multioutput import MultiOutputRegressor

sys.path.insert(0, str(Path(__file__).parent))
import gb_experimentos as gb  # noqa: E402
import gb_experimentos_v2 as v2  # noqa: E402

RAIZ = gb.RAIZ
DATA = gb.DATA
SEMENTE = gb.SEMENTE

VARS_7 = list(gb.VARIAVEIS)


# ============================================================================
# 0. fan_level corrigido (word-boundary; parse_reason_flags_min tem bug de
#    substring "low" dentro de "blower" que classificava a Run 57 errado)
# ============================================================================
def parse_fan_level_fixed(reason) -> str:
    s = "" if pd.isna(reason) else str(reason).lower()
    if "16 cfm" in s or "16cfm" in s:
        return "cfm16"
    if "double flow" in s:
        return "double"
    if re.search(r"\bhigh\b", s):
        return "high"
    if re.search(r"\bmedium\b", s):
        return "medium"
    if re.search(r"\blow\b", s):
        return "low"
    if "blower on" in s:
        return "on"
    return "NA"


def colapsar_fan3(fan: pd.Series) -> pd.Series:
    """F3: 6 niveis -> 3. cfm16 (vazao baixa, 16 CFM) cai em low_or_on; double
    (vazao dobrada) cai em medium_or_high. Escolha documentada no relatorio."""
    mapa = {
        "NA": "NA", "low": "low_or_on", "on": "low_or_on", "cfm16": "low_or_on",
        "medium": "medium_or_high", "high": "medium_or_high", "double": "medium_or_high",
    }
    return fan.map(mapa).fillna("NA")


# ============================================================================
# 1. Construcao das variantes
# ============================================================================
def montar_variantes():
    pp, limites = v2.carregar_base_runs_E2()  # run-level, 1 linha/sensor
    pp = pp.copy()
    pp["fan_level"] = pp["reason"].apply(parse_fan_level_fixed)  # sobrescreve o fan_level com bug
    pp_c = v2.relabel_material(pp)  # material_coil_support corrigido a partir de reason (E2-c)

    # runs da config 22 original (Pyro / Closed housing / Aluminium) - E12
    mask22 = (
        (pp["housing"] == "Closed") & (pp["run_case"] == "Pyro")
        & (pp["material_coil_support"] == "Aluminium")
    )
    runs22 = sorted(pp.loc[mask22, "run_id"].unique().tolist())
    pp_c_sem22 = pp_c[~pp_c["run_id"].isin(runs22)].copy()

    pp3 = pp_c.copy()
    pp3["fan_level"] = colapsar_fan3(pp3["fan_level"])

    especificacoes = {
        "R":  dict(base=pp,        vars=VARS_7),
        "F1": dict(base=pp,        vars=VARS_7 + ["fan_level"]),
        "F2": dict(base=pp_c,      vars=VARS_7 + ["fan_level"]),
        "F3": dict(base=pp3,       vars=VARS_7 + ["fan_level"]),
        "F4": dict(base=pp_c_sem22, vars=VARS_7 + ["fan_level"]),
    }

    # mapeamento run_id -> config original (R, 7 vars cruas) p/ reconciliar splits
    df_cfg_R = v2.agregar_por_config(pp, VARS_7, limites)
    meta_R = df_cfg_R.drop_duplicates("config_id")[["config_id"] + VARS_7]
    run_vars_R = pp.drop_duplicates("run_id")[["run_id"] + VARS_7]
    run_to_orig = (run_vars_R.merge(meta_R, on=VARS_7, how="left")
                              .set_index("run_id")["config_id"])
    # runs por config original (p/ testar "config limpa" depois)
    runs_por_orig = pp.drop_duplicates("run_id").groupby(
        run_vars_R.merge(meta_R, on=VARS_7, how="left")["config_id"].values
    )["run_id"].apply(lambda s: frozenset(s))

    resultado = {}
    for nome, spec in especificacoes.items():
        base, vars_grupo = spec["base"], spec["vars"]
        df_cfg = v2.agregar_por_config(base, vars_grupo, limites)
        cod = v2.CodVariant(df_cfg, vars_grupo)
        meta_V = df_cfg.drop_duplicates("config_id")[["config_id"] + vars_grupo]
        run_vars_V = base.drop_duplicates("run_id")[["run_id"] + vars_grupo]
        run_to_cfgV = (run_vars_V.merge(meta_V, on=vars_grupo, how="left")
                                  .set_index("run_id")["config_id"])
        # config_id_V -> orig_config_id (moda dos run_id membros)
        tab = pd.DataFrame({"run_id": run_to_cfgV.index, "config_id_V": run_to_cfgV.values})
        tab["orig_config_id"] = tab["run_id"].map(run_to_orig)
        mapa_V_para_orig = (tab.dropna(subset=["orig_config_id"])
                                .groupby("config_id_V")["orig_config_id"]
                                .agg(lambda s: s.mode().iloc[0]))

        # runs por config_id_V (p/ checar se a config original ficou intacta)
        runs_por_V = tab.dropna(subset=["orig_config_id"]).groupby("config_id_V")["run_id"].apply(frozenset)

        # config original "limpa" nesta variante: todos os runs da config original
        # caem em UM UNICO config_id_V, e esse config_id_V nao ganhou runs de fora
        orig_para_V_unico = tab.dropna(subset=["orig_config_id"]).groupby("orig_config_id")["config_id_V"].nunique()
        limpos = []
        for orig_id, runs_orig in runs_por_orig.items():
            if orig_id not in orig_para_V_unico.index or orig_para_V_unico.loc[orig_id] != 1:
                continue
            v_id = tab.loc[tab["orig_config_id"] == orig_id, "config_id_V"].iloc[0]
            if runs_por_V.get(v_id, frozenset()) == runs_orig:
                limpos.append(orig_id)

        resultado[nome] = dict(df_cfg=df_cfg, cod=cod, n_configs=df_cfg["config_id"].nunique(),
                                mapa_orig=mapa_V_para_orig, configs_limpas=set(limpos))
    return resultado, runs22, mask22


# ============================================================================
# 2. Avaliacao LOGO (gb_lr03) por variante
# ============================================================================
def rodar_logo_gb(df_cfg: pd.DataFrame, cod: v2.CodVariant, nome_variant: str) -> pd.DataFrame:
    configs = np.sort(df_cfg["config_id"].unique())
    registros = []
    for i, cfg_te in enumerate(configs):
        tr_all = df_cfg[df_cfg["config_id"] != cfg_te]
        te_all = df_cfg[df_cfg["config_id"] == cfg_te]
        for area in te_all["area"].unique():
            tr = tr_all[tr_all["area"] == area]
            te = te_all[te_all["area"] == area]
            if len(tr) == 0 or len(te) == 0:
                continue
            X_tr, Y_tr = v2._wide_variant(tr, cod)
            modelo = MultiOutputRegressor(gb.gbr(**gb.PARAMS_LR03))
            pred = v2._prever_wide_variant(modelo, X_tr, Y_tr, te, cod)
            registros.append(pd.DataFrame({
                "estrategia": "gb_lr03", "variante": nome_variant,
                "area": te["area"].values, "sensor": te["sensor"].values,
                "config_id": te["config_id"].values, "real": te["temp"].values,
                "pred": pred, "limite": te["limite"].values, "fold": i,
            }))
    return pd.concat(registros, ignore_index=True)


# ============================================================================
# 3. IC bootstrap generico (por config_id, chave arbitraria) por area
# ============================================================================
def ic_bootstrap_generico(d: pd.DataFrame, chave: str, n: int = 1000, seed: int = SEMENTE) -> pd.DataFrame:
    """d precisa ter colunas [area, chave, ae_R, ae_V]. IC95% bootstrap
    (resample de `chave`) de MAE(V) - MAE(R), por area."""
    linhas = []
    for area, g in d.groupby("area"):
        piv_R = g.groupby(chave)["ae_R"].mean()
        piv_V = g.groupby(chave)["ae_V"].mean()
        cfgs = piv_R.index.values
        rng = np.random.RandomState(seed)
        amostras = rng.choice(np.arange(len(cfgs)), size=(n, len(cfgs)), replace=True)
        diffs = np.nanmean(piv_V.values[amostras] - piv_R.values[amostras], axis=1)
        linhas.append({"area": area, "n_configs": len(cfgs),
                        "MAE_R": piv_R.mean(), "MAE_V": piv_V.mean(),
                        "diff_media": diffs.mean(),
                        "ic95_low": np.nanpercentile(diffs, 2.5),
                        "ic95_high": np.nanpercentile(diffs, 97.5)})
    return pd.DataFrame(linhas)


def reconciliar(oof_R, oof_V, mapa_orig, nome_variant):
    """Visao RECONCILIADA: splits reagrupados na config original (media das
    previsoes), comparados ao real/pred de R na mesma config. So inclui
    configs originais REALMENTE presentes em V (fix do bug n_configs_comuns)."""
    real_por_orig = oof_R.groupby(["area", "config_id", "sensor"], as_index=False)["real"].first()
    real_por_orig = real_por_orig.rename(columns={"config_id": "orig_config_id"}).set_index(["area", "orig_config_id", "sensor"])
    pred_R = oof_R.groupby(["area", "config_id", "sensor"])["pred"].mean()
    pred_R.index = pred_R.index.set_names(["area", "orig_config_id", "sensor"])

    oof_V = oof_V.copy()
    oof_V["orig_config_id"] = oof_V["config_id"].map(mapa_orig)
    oof_V = oof_V.dropna(subset=["orig_config_id"])
    oof_V["orig_config_id"] = oof_V["orig_config_id"].astype(int)
    pred_V = oof_V.groupby(["area", "orig_config_id", "sensor"])["pred"].mean()

    # so entra config original que aparece de fato em V (inner join real)
    idx_comum = real_por_orig.index.intersection(pred_V.index)
    d = real_por_orig.loc[idx_comum].copy()
    d["ae_R"] = (d["real"] - pred_R.reindex(idx_comum)).abs()
    d["ae_V"] = (d["real"] - pred_V.reindex(idx_comum)).abs()
    d = d.reset_index()
    ic = ic_bootstrap_generico(d, "orig_config_id")
    ic["variante"] = nome_variant
    return ic


def clean_configs_compare(oof_R, oof_V, configs_limpas, mapa_orig, nome_variant):
    """Visao LIMPA: so configs originais intactas em V (1 linha por config,
    sem nenhuma media). Comparacao 1:1 estrita.

    BUG corrigido: `oof_V["config_id"]` usa a numeracao PROPRIA da variante
    (factorize de outro conjunto de vars), diferente da numeracao original
    de R - filtrar oof_V por `configs_limpas` (ids originais) direto comparava
    configs erradas e inflava o erro artificialmente. Precisa mapear
    config_id_V -> orig_config_id (mapa_orig) antes de filtrar/juntar."""
    if not configs_limpas:
        return pd.DataFrame(columns=["area", "n_configs", "MAE_R", "MAE_V", "diff_media", "ic95_low", "ic95_high", "variante"])
    oof_V = oof_V.copy()
    oof_V["orig_config_id"] = oof_V["config_id"].map(mapa_orig)
    v_ = oof_V[oof_V["orig_config_id"].isin(configs_limpas)][["area", "orig_config_id", "sensor", "pred"]]
    r = oof_R[oof_R["config_id"].isin(configs_limpas)].rename(columns={"config_id": "orig_config_id"})
    r = r[["area", "orig_config_id", "sensor", "real", "pred"]]
    m = r.merge(v_, on=["area", "orig_config_id", "sensor"], suffixes=("_R", "_V"))
    m["ae_R"] = (m["real"] - m["pred_R"]).abs()
    m["ae_V"] = (m["real"] - m["pred_V"]).abs()
    ic = ic_bootstrap_generico(m.rename(columns={"orig_config_id": "cfg"}), "cfg")
    ic["variante"] = nome_variant
    return ic


def main():
    t0 = time.time()
    pd.set_option("display.width", 220)
    variantes, runs22, mask22 = montar_variantes()
    print(f"Runs da config 22 original (Pyro/Closed/Aluminium): {runs22}")
    print("n_configs por variante:", {k: v["n_configs"] for k, v in variantes.items()})
    print("n_configs_limpas por variante:", {k: len(v["configs_limpas"]) for k, v in variantes.items()})

    oofs = {}
    for nome, info in variantes.items():
        print(f"\n--- LOGO {nome} (n_configs={info['n_configs']}) ---")
        oof = rodar_logo_gb(info["df_cfg"], info["cod"], nome)
        oofs[nome] = oof
        por_area = gb.resumo_por_area(oof)
        print(por_area[["area", "MAE", "R2_mediana", "FN_seguranca", "casos_acima_limite"]]
              .round(3).to_string(index=False))

    oof_all = pd.concat(oofs.values(), ignore_index=True)
    oof_all["n_configs_variante"] = oof_all["variante"].map({k: v["n_configs"] for k, v in variantes.items()})
    oof_all.to_csv(DATA / "gb_v2_E13_oof.csv", index=False)

    # --- tabela RAW (LOGO proprio de cada variante) ---
    resumo = []
    for nome, oof in oofs.items():
        por_area = gb.resumo_por_area(oof)
        por_area["variante"] = nome
        por_area["n_configs"] = variantes[nome]["n_configs"]
        resumo.append(por_area)
    resumo = pd.concat(resumo, ignore_index=True)
    resumo.to_csv(DATA / "gb_v2_E13_resumo.csv", index=False)

    # --- tabela RECONCILIADA (splits reagrupados na config original) ---
    linhas_ic = []
    for nome in ["F1", "F2", "F3", "F4"]:
        ic = reconciliar(oofs["R"], oofs[nome], variantes[nome]["mapa_orig"], nome)
        linhas_ic.append(ic)
        print(f"\nIC95% RECONCILIADO ({nome} - R), por area:")
        print(ic.round(3).to_string(index=False))
    resumo_ic = pd.concat(linhas_ic, ignore_index=True)
    resumo_ic.to_csv(DATA / "gb_v2_E13_resumo_ic.csv", index=False)

    # --- tabela LIMPA (C): so configs originais intactas, 1:1, sem media ---
    linhas_limpo = []
    for nome in ["F1", "F2", "F3", "F4"]:
        limpas = variantes[nome]["configs_limpas"]
        ic_limpo = clean_configs_compare(oofs["R"], oofs[nome], limpas, variantes[nome]["mapa_orig"], nome)
        linhas_limpo.append(ic_limpo)
        print(f"\nIC95% CONFIGS LIMPAS ({nome} - R), por area, n_configs_limpas={len(limpas)}:")
        print(ic_limpo.round(3).to_string(index=False))

        # MAE raw nas configs TOCADAS (splits/relabel), sem nenhuma media:
        # tocadas = todo config_id_V que NAO pertence ao conjunto "limpo"
        # (1 orig -> 1 V, mesmos runs) - complemento do conjunto limpo.
        oof_V = oofs[nome]
        limpos_Vids = set()
        for orig_id in limpas:
            vid_rows = variantes[nome]["mapa_orig"]
            vids = vid_rows[vid_rows == orig_id].index.tolist()
            limpos_Vids.update(vids)
        tocadas = oof_V[~oof_V["config_id"].isin(limpos_Vids)]
        if len(tocadas):
            por_area_tocadas = gb.resumo_por_area(tocadas.assign(estrategia="gb_lr03"))
            por_area_tocadas["variante"] = nome
            por_area_tocadas["n_configs_tocadas"] = tocadas["config_id"].nunique()
            print(f"\nMAE RAW nas configs TOCADAS (splits/relabel, sem media) - {nome}:")
            print(por_area_tocadas[["area", "MAE", "n_configs_tocadas"]].round(3).to_string(index=False))
            por_area_tocadas["tipo"] = "tocadas_raw"
            linhas_limpo.append(por_area_tocadas.rename(columns={"MAE": "MAE_V"})[
                ["area", "MAE_V", "n_configs_tocadas", "variante", "tipo"]])

    resumo_limpo = pd.concat([x for x in linhas_limpo if len(x)], ignore_index=True, sort=False)
    resumo_limpo.to_csv(DATA / "gb_v2_E13_resumo_limpo.csv", index=False)

    print(f"\ntempo total: {time.time() - t0:.0f}s")
    print("\nCSVs salvos: gb_v2_E13_resumo.csv (raw), gb_v2_E13_resumo_ic.csv (reconciliado), "
          "gb_v2_E13_resumo_limpo.csv (configs limpas + tocadas raw), gb_v2_E13_oof.csv")


if __name__ == "__main__":
    main()
