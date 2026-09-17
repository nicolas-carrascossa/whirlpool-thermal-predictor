"""
gb_experimentos_v2.py - bancada de experimentos v2 (E0, E2-E7)

Reusa `notebooks/gb_experimentos.py` (nao o modifica) para carga de dados,
codificacao, estrategias base e metricas. Protocolo principal: LOGO
(Leave-One-Group-Out por configuracao fisica, config_id). `--protocolo cv`
reproduz o RepeatedKFold da bancada antiga (serve so como verificacao).

E1 (ruido/reason) e E8 (recomendacao de ensaios) NAO estao aqui: ficam em
`notebooks/gb_experimentos_v2_dados.py` (outro agente), que escreve
`data/gb_v2_E1_*.csv`, `data/gb_v2_E8_*.csv` e um fragmento de relatorio
`documents/_relatorio_v2_dados.md`. Para o E2 (f) este script faz seu proprio
parsing minimo de `reason` (fan_level, menciona_plate), sem depender do outro
arquivo.

Uso:
    .venv\\Scripts\\python.exe notebooks\\gb_experimentos_v2.py --exp E0 --protocolo cv
    .venv\\Scripts\\python.exe notebooks\\gb_experimentos_v2.py            # E0,E2..E7, LOGO

Saidas: data/gb_v2_*.csv e data/margens_por_sensor.json (data/ esta no
.gitignore).
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.decomposition import PCA
from sklearn.ensemble import RandomForestRegressor
from sklearn.gaussian_process import GaussianProcessRegressor
from sklearn.gaussian_process.kernels import RBF, ConstantKernel, WhiteKernel
from sklearn.linear_model import RidgeCV
from sklearn.model_selection import KFold, RepeatedKFold
from sklearn.multioutput import MultiOutputRegressor
from sklearn.preprocessing import PolynomialFeatures, StandardScaler

warnings.filterwarnings("ignore")

sys.path.insert(0, str(Path(__file__).parent))
import gb_experimentos as gb  # noqa: E402

RAIZ = gb.RAIZ
DATA = gb.DATA
SEMENTE = gb.SEMENTE


# ============================================================================
# Utilitarios comuns: folds LOGO e IC bootstrap
# ============================================================================
def folds_logo(df: pd.DataFrame):
    """Um fold por configuracao (LOGO): posicoes sobre np.sort(config_id.unique())."""
    n = df["config_id"].nunique()
    idx = np.arange(n)
    return [(np.delete(idx, i), np.array([i])) for i in idx]


def ic_bootstrap(oof: pd.DataFrame, referencia: str, n: int = 1000, seed: int = SEMENTE) -> pd.DataFrame:
    """IC95% bootstrap (resample de config_id) da diferenca MAE(estrategia) - MAE(referencia)."""
    d = oof.copy()
    d["ae"] = (d["real"] - d["pred"]).abs()
    piv = d.groupby(["estrategia", "config_id"])["ae"].mean().unstack("config_id")
    if referencia not in piv.index:
        return pd.DataFrame(columns=["diff_media", "ic95_low", "ic95_high"])
    rng = np.random.RandomState(seed)
    n_cfg = piv.shape[1]
    ref = piv.loc[referencia].values
    out = {}
    idx_all = np.arange(n_cfg)
    amostras = rng.choice(idx_all, size=(n, n_cfg), replace=True)
    for estr in piv.index:
        vals = piv.loc[estr].values
        diffs = np.nanmean(vals[amostras] - ref[amostras], axis=1)
        out[estr] = (diffs.mean(), np.nanpercentile(diffs, 2.5), np.nanpercentile(diffs, 97.5))
    return pd.DataFrame(out, index=["diff_media", "ic95_low", "ic95_high"]).T


# ============================================================================
# E0 - LOGO + bootstrap CI + baseline kNN Hamming
# ============================================================================
def est_knn_hamming(k: int, variaveis):
    def f(tr, te, cod):
        configs_tr = tr.drop_duplicates("config_id").set_index("config_id")
        Y = tr.pivot_table(index="config_id", columns="sensor", values="temp", aggfunc="mean")
        configs_tr = configs_tr.loc[Y.index]
        configs_te = te.drop_duplicates("config_id").set_index("config_id")
        preds = {}
        for cfg_id, row in configs_te.iterrows():
            dist = (configs_tr[variaveis] != row[variaveis]).sum(axis=1)
            nn = dist.nsmallest(k).index
            preds[cfg_id] = Y.loc[nn].mean()
        P = pd.DataFrame(preds).T
        media_geral = Y.values[~np.isnan(Y.values)].mean() if Y.size else np.nan
        pred = np.array([
            P.at[c, s] if (c in P.index and s in P.columns and pd.notna(P.at[c, s])) else media_geral
            for c, s in zip(te["config_id"], te["sensor"])
        ])
        return pred
    return f


def rodar_E0(protocolo: str = "logo", folds_arg: int = 5, rep_arg: int = 5):
    print("\n" + "=" * 100)
    print(f"E0 - baselines + referencia GB, protocolo={protocolo}")
    print("=" * 100)
    df = gb.carregar_longo()
    cod = gb.Codificador(df)
    print(f"Base: {len(df)} leituras | {df['config_id'].nunique()} configuracoes | "
          f"{df['sensor'].nunique()} sensores | {df['area'].nunique()} areas")

    E = {
        "0_media_sensor": (gb.est_media_sensor, False, "baseline: media do sensor no treino"),
        "knn_hamming_k1_7v": (est_knn_hamming(1, gb.VARIAVEIS), False, "kNN Hamming k=1, 7 vars"),
        "knn_hamming_k3_7v": (est_knn_hamming(3, gb.VARIAVEIS), False, "kNN Hamming k=3, 7 vars"),
        "knn_hamming_k1_5v": (est_knn_hamming(1, gb.VARIAVEIS_5), False, "kNN Hamming k=1, 5 vars backend"),
        "knn_hamming_k3_5v": (est_knn_hamming(3, gb.VARIAVEIS_5), False, "kNN Hamming k=3, 5 vars backend"),
        "gb_notebook": (gb.est_wide_gb(gb.PARAMS_NOTEBOOK), False, "GB, params do notebook"),
        "gb_lr03": (gb.est_wide_gb(gb.PARAMS_LR03), False, "GB lr=0.03 (referencia)"),
        "rf": (gb.est_wide_rf, False, "RandomForest wide"),
    }

    if protocolo == "logo":
        folds = folds_logo(df)
        rotulo = "E0_logo"
    else:
        rkf = RepeatedKFold(n_splits=folds_arg, n_repeats=rep_arg, random_state=SEMENTE)
        folds = list(rkf.split(np.arange(df["config_id"].nunique())))
        rotulo = "E0_cv"

    oof = gb.executar_folds(df, cod, E, folds, rotulo, usar_ensembles=False)

    ens = (oof[oof["estrategia"].isin(["rf", "gb_lr03"])]
           .groupby(["area", "sensor", "config_id", "fold"], as_index=False)
           .agg(real=("real", "first"), limite=("limite", "first"), pred=("pred", "mean")))
    ens["estrategia"] = "ens_rf_gb_lr03"
    ens["protocolo"] = rotulo
    oof = pd.concat([oof, ens], ignore_index=True)

    por_area = gb.resumo_por_area(oof)
    geral = gb.resumo_geral(por_area, oof)
    if protocolo == "logo":
        ic = ic_bootstrap(oof, "gb_lr03")
        geral = geral.join(ic)
    print(geral.round(3).to_string())

    oof.to_csv(DATA / f"gb_v2_E0_oof_{protocolo}.csv", index=False)
    geral.reset_index().to_csv(DATA / f"gb_v2_E0_resumo_{protocolo}.csv", index=False)
    por_area.to_csv(DATA / f"gb_v2_E0_por_area_{protocolo}.csv", index=False)
    return oof, geral


# ============================================================================
# E2 - variantes de rotulo/variaveis (parsing minimo de `reason` embutido)
# ============================================================================
RE_RUN_NUM = re.compile(r"Run\s*(\d+)")


def parse_run_num(run_id):
    m = RE_RUN_NUM.search(str(run_id))
    return float(m.group(1)) if m else np.nan


def parse_reason_flags_min(reason) -> pd.Series:
    """Parsing minimo (so p/ E2-f): fan_level e menciona_plate."""
    if pd.isna(reason):
        s = ""
    else:
        s = str(reason).lower()
    if "informado" in s and "n" in s.split("informado")[0][-2:]:
        # cobre o mojibake "N?o informado" / "Nao informado"
        s = ""
    fan = np.nan
    if "16 cfm" in s or "16cfm" in s:
        fan = "cfm16"
    elif "double flow" in s:
        fan = "double"
    elif "high" in s:
        fan = "high"
    elif "medium" in s:
        fan = "medium"
    elif "low" in s:
        fan = "low"
    elif "blower on" in s:
        fan = "on"
    plate = np.nan
    if "aluminium plate" in s or "aluminum plate" in s:
        plate = "aluminium_plate"
    elif "plastic plate" in s:
        plate = "plastic_plate"
    return pd.Series({"fan_level": fan, "menciona_plate": plate})


def relabel_material(df: pd.DataFrame) -> pd.DataFrame:
    d = df.copy()
    s = d["reason"].astype(str).str.lower()
    mask_al = s.str.contains("aluminium plate") | s.str.contains("aluminum plate")
    mask_pl = s.str.contains("plastic plate")
    d.loc[mask_al, "material_coil_support"] = "Aluminium Plate"
    d.loc[mask_pl, "material_coil_support"] = "Plastic Plate"
    return d


def collapse_losses(df: pd.DataFrame, min_runs: int = 3) -> pd.DataFrame:
    contagem = df.drop_duplicates("run_id")["losses"].value_counts()
    manter = contagem[contagem >= min_runs].index
    d = df.copy()
    d["losses"] = d["losses"].where(d["losses"].isin(manter), "Outro")
    return d


def carregar_base_runs_E2():
    limites = gb.carregar_limites()
    pp = gb.padronizar(pd.read_csv(DATA / "dataset_pre_processado.csv"))
    pp = pp[pp["tc_name"] != "Oven RTD Connector Body"].copy()
    pp["sensor"] = pp["tc_name"].astype(str).str.strip()
    pp.loc[pp["sensor"].str.fullmatch(gb.PADRAO_IGBT.pattern), "sensor"] = "IGBT"
    pp = pp.rename(columns={"key_area": "area"})
    pp["run_num"] = pp["run_id"].map(parse_run_num)
    flags = pp["reason"].apply(parse_reason_flags_min)
    pp = pd.concat([pp, flags], axis=1)
    pp["fan_level"] = pp["fan_level"].fillna("NA")
    pp["menciona_plate"] = pp["menciona_plate"].fillna("NA")
    return pp, limites


def preencher_nulos_iqr(valores: pd.Series) -> pd.Series:
    """Mesma regra de `fill_component_nulls` de tratamento_final_dos_dados.ipynb:
    mediana se ha outlier (IQR), senao media dos valores validos."""
    validos = valores.dropna()
    if validos.empty:
        return valores
    q1, q3 = validos.quantile(0.25), validos.quantile(0.75)
    iqr = q3 - q1
    lo, hi = q1 - 1.5 * iqr, q3 + 1.5 * iqr
    tem_outlier = ((validos < lo) | (validos > hi)).any()
    fill = validos.median() if tem_outlier else validos.mean()
    return valores.fillna(fill)


def agregar_por_config(df: pd.DataFrame, variaveis_grupo, limites: dict, extra_num_cols=None) -> pd.DataFrame:
    """Agrega runs -> configuracoes (media), depois alinha com o tratamento:
    grade completa config x sensor por area, com combinacoes ausentes
    preenchidas por media/mediana-IQR do sensor (fill_component_nulls), em vez
    de simplesmente ficarem de fora. Sem isso, sensores de baixa cobertura
    (ex.: "AC Blower Inlet Avg", so 3 de 32 configs com leitura real) geram
    poucas linhas de teste no LOGO e o MAE fica bem maior que o de
    `gb_experimentos.carregar_longo` (que ja vem assim das 7 planilhas wide)."""
    extra_num_cols = extra_num_cols or []
    chaves = list(variaveis_grupo) + ["sensor", "area"]
    agg = {"temp": "mean"}
    for c in extra_num_cols:
        agg[c] = "mean"
    out = df.groupby(chaves, as_index=False, dropna=False).agg(agg)
    out["config_id"] = pd.factorize(pd.MultiIndex.from_frame(out[variaveis_grupo]))[0]

    configs_meta = out.drop_duplicates("config_id")[["config_id"] + variaveis_grupo + extra_num_cols]
    partes = []
    for area, g in out.groupby("area"):
        sensores = g["sensor"].unique()
        grade = pd.MultiIndex.from_product(
            [configs_meta["config_id"].unique(), sensores], names=["config_id", "sensor"]
        ).to_frame(index=False)
        grade = grade.merge(g[["config_id", "sensor", "temp"]], on=["config_id", "sensor"], how="left")
        grade["temp"] = grade.groupby("sensor")["temp"].transform(preencher_nulos_iqr)
        grade["area"] = area
        partes.append(grade)
    out2 = pd.concat(partes, ignore_index=True)
    out2 = out2.merge(configs_meta, on="config_id", how="left")
    out2["limite"] = out2["sensor"].map(limites)
    return out2


class CodVariant:
    """Codificador ordinal generico p/ um conjunto arbitrario de variaveis (E2)."""

    def __init__(self, df: pd.DataFrame, cat_vars, num_vars=None):
        self.cat_vars = list(cat_vars)
        self.num_vars = list(num_vars or [])
        self.ordinal = {v: {c: i for i, c in enumerate(sorted(df[v].astype(str).unique()))} for v in self.cat_vars}

    def X(self, configs_df: pd.DataFrame) -> pd.DataFrame:
        cols = {}
        for v in self.cat_vars:
            codigos = configs_df[v].astype(str).map(self.ordinal[v]).fillna(-1).astype(int)
            cols[v] = codigos.values
        for v in self.num_vars:
            serie = configs_df[v].astype(float)
            cols[v] = serie.fillna(serie.mean()).values
        return pd.DataFrame(cols, index=configs_df.index)


def _wide_variant(df: pd.DataFrame, cod: CodVariant):
    configs = df.drop_duplicates("config_id").set_index("config_id")
    Y = df.pivot_table(index="config_id", columns="sensor", values="temp", aggfunc="mean")
    configs = configs.loc[Y.index]
    X = cod.X(configs)
    return X, Y


def _prever_wide_variant(modelo, X_tr, Y_tr, teste, cod: CodVariant):
    Y_fill = Y_tr.fillna(Y_tr.mean())
    modelo.fit(X_tr.values, Y_fill.values)
    configs_te = teste.drop_duplicates("config_id").set_index("config_id")
    X_te = cod.X(configs_te)
    P = pd.DataFrame(modelo.predict(X_te.values), index=X_te.index, columns=Y_tr.columns)
    media_geral = Y_fill.values.mean()
    pred = np.array([
        P.at[c, s] if s in P.columns else media_geral
        for c, s in zip(teste["config_id"], teste["sensor"])
    ])
    return pred


def rodar_variant(df_cfg: pd.DataFrame, cod: CodVariant, nome_variant: str) -> pd.DataFrame:
    configs = np.sort(df_cfg["config_id"].unique())
    registros = []
    modelos = {
        "gb_lr03": lambda: MultiOutputRegressor(gb.gbr(**gb.PARAMS_LR03)),
        "rf": lambda: RandomForestRegressor(n_estimators=300, min_samples_leaf=1, random_state=SEMENTE, n_jobs=-1),
    }
    for i, cfg_te in enumerate(configs):
        tr_all = df_cfg[df_cfg["config_id"] != cfg_te]
        te_all = df_cfg[df_cfg["config_id"] == cfg_te]
        for area in te_all["area"].unique():
            tr = tr_all[tr_all["area"] == area]
            te = te_all[te_all["area"] == area]
            if len(tr) == 0 or len(te) == 0:
                continue
            X_tr, Y_tr = _wide_variant(tr, cod)
            for nome_modelo, modelo_fn in modelos.items():
                pred = _prever_wide_variant(modelo_fn(), X_tr, Y_tr, te, cod)
                registros.append(pd.DataFrame({
                    "estrategia": nome_modelo, "variante": nome_variant,
                    "area": te["area"].values, "sensor": te["sensor"].values,
                    "config_id": te["config_id"].values, "real": te["temp"].values,
                    "pred": pred, "limite": te["limite"].values, "fold": i,
                }))
    return pd.concat(registros, ignore_index=True)


def rodar_E2():
    print("\n" + "=" * 100)
    print("E2 - variantes de rotulo/conjunto de variaveis (LOGO)")
    print("=" * 100)
    pp, limites = carregar_base_runs_E2()
    pp_c = relabel_material(pp)
    pp_d = collapse_losses(pp_c)

    variantes = {
        "a_7vars": dict(base=pp, vars=list(gb.VARIAVEIS)),
        "b_5vars_backend": dict(base=pp, vars=list(gb.VARIAVEIS_5)),
        "c_material_reclass": dict(base=pp_c, vars=list(gb.VARIAVEIS)),
        "d_losses_colapsado": dict(base=pp_d, vars=list(gb.VARIAVEIS)),
        "e_run_num": dict(base=pp_c, vars=list(gb.VARIAVEIS), extra_num=["run_num"]),
        "f_flags_reason": dict(base=pp_c, vars=list(gb.VARIAVEIS) + ["fan_level", "menciona_plate"]),
    }

    resultados, oofs = [], []
    for nome, cfgv in variantes.items():
        base = cfgv["base"]
        vars_grupo = cfgv["vars"]
        extra_num = cfgv.get("extra_num", [])
        df_cfg = agregar_por_config(base, vars_grupo, limites, extra_num)
        cod = CodVariant(df_cfg, vars_grupo, extra_num)
        n_cfg = df_cfg["config_id"].nunique()
        oof = rodar_variant(df_cfg, cod, nome)
        oof["protocolo"] = "E2"
        por_area = gb.resumo_por_area(oof)
        geral = gb.resumo_geral(por_area, oof).reset_index()
        geral["variante"] = nome
        geral["n_configs"] = n_cfg
        resultados.append(geral)
        oofs.append(oof)
        print(f"\n--- {nome} (n_configs={n_cfg}) ---")
        print(geral.round(3).to_string(index=False))

    tabela = pd.concat(resultados, ignore_index=True)
    oof_all = pd.concat(oofs, ignore_index=True)
    tabela.to_csv(DATA / "gb_v2_E2_resumo.csv", index=False)
    oof_all.to_csv(DATA / "gb_v2_E2_oof.csv", index=False)
    return tabela


# ============================================================================
# E3 - Ridge (one-hot [+ interacoes]) e Gaussian Process (com pred_std)
# ============================================================================
def est_wide_ridge(poly: bool = False):
    def f(tr, te, cod):
        X, Y = gb._wide(tr, cod, gb.VARIAVEIS, onehot=True)
        Y_fill = Y.fillna(Y.mean())
        if poly:
            pf = PolynomialFeatures(degree=2, interaction_only=True, include_bias=False)
            Xv = pf.fit_transform(X.values)
        else:
            pf = None
            Xv = X.values
        modelo = MultiOutputRegressor(RidgeCV(alphas=np.logspace(-2, 3, 20)))
        modelo.fit(Xv, Y_fill.values)
        configs_te = te.drop_duplicates("config_id").set_index("config_id")
        X_te = cod.X_onehot(configs_te, gb.VARIAVEIS)
        Xte_v = pf.transform(X_te.values) if poly else X_te.values
        P = pd.DataFrame(modelo.predict(Xte_v), index=X_te.index, columns=Y.columns)
        media_geral = Y_fill.values.mean()
        pred = np.array([
            P.at[c, s] if s in P.columns else media_geral
            for c, s in zip(te["config_id"], te["sensor"])
        ])
        return pred
    return f


def rodar_gp_logo(df: pd.DataFrame, cod) -> pd.DataFrame:
    """GP por sensor (one-hot), grava media e desvio padrao preditivo (pred_std)."""
    configs = np.sort(df["config_id"].unique())
    kernel = ConstantKernel() * RBF(length_scale=1.0) + WhiteKernel()
    registros = []
    for i, cfg_te in enumerate(configs):
        tr_all = df[df["config_id"] != cfg_te]
        te_all = df[df["config_id"] == cfg_te]
        for area in te_all["area"].unique():
            tr = tr_all[tr_all["area"] == area]
            te = te_all[te_all["area"] == area]
            X_tr, Y_tr = gb._wide(tr, cod, gb.VARIAVEIS, onehot=True)
            Y_fill = Y_tr.fillna(Y_tr.mean())
            configs_te = te.drop_duplicates("config_id").set_index("config_id")
            X_te = cod.X_onehot(configs_te, gb.VARIAVEIS)
            preds, stds = {}, {}
            for s in Y_fill.columns:
                gp = GaussianProcessRegressor(kernel=kernel, normalize_y=True,
                                               n_restarts_optimizer=2, random_state=SEMENTE)
                gp.fit(X_tr.values, Y_fill[s].values)
                mu, std = gp.predict(X_te.values, return_std=True)
                for c, m, sd in zip(X_te.index, mu, std):
                    preds[(c, s)] = m
                    stds[(c, s)] = sd
            media_geral = Y_fill.values.mean()
            pred = np.array([preds.get((c, s), media_geral) for c, s in zip(te["config_id"], te["sensor"])])
            pstd = np.array([stds.get((c, s), np.nan) for c, s in zip(te["config_id"], te["sensor"])])
            registros.append(pd.DataFrame({
                "estrategia": "gp", "area": te["area"].values, "sensor": te["sensor"].values,
                "config_id": te["config_id"].values, "real": te["temp"].values,
                "pred": pred, "pred_std": pstd, "limite": te["limite"].values, "fold": i,
            }))
        print(f"  E3/GP fold {i + 1}/{len(configs)} ok", flush=True)
    return pd.concat(registros, ignore_index=True)


def rodar_E3():
    print("\n" + "=" * 100)
    print("E3 - Ridge one-hot (+interacoes) e Gaussian Process")
    print("=" * 100)
    df = gb.carregar_longo()
    cod = gb.Codificador(df)
    folds = folds_logo(df)

    E = {
        "gb_lr03": (gb.est_wide_gb(gb.PARAMS_LR03), False, "referencia"),
        "ridge_1h": (est_wide_ridge(poly=False), False, "RidgeCV one-hot"),
        "ridge_1h_poly2": (est_wide_ridge(poly=True), False, "RidgeCV one-hot + interacoes 2 vias"),
    }
    oof = gb.executar_folds(df, cod, E, folds, "E3", usar_ensembles=False)

    t0 = time.perf_counter()
    oof_gp = rodar_gp_logo(df, cod)
    print(f"  GP: {time.perf_counter() - t0:.0f}s")
    oof_gp["protocolo"] = "E3"

    media_gb_ridge = (oof[oof["estrategia"].isin(["gb_lr03", "ridge_1h"])]
                       .groupby(["area", "sensor", "config_id", "fold"], as_index=False)
                       .agg(real=("real", "first"), limite=("limite", "first"), pred=("pred", "mean")))
    media_gb_ridge["estrategia"] = "ens_gb_ridge"

    oof_all = pd.concat([oof, oof_gp, media_gb_ridge], ignore_index=True)
    por_area = gb.resumo_por_area(oof_all)
    geral = gb.resumo_geral(por_area, oof_all)
    ic = ic_bootstrap(oof_all, "gb_lr03")
    geral = geral.join(ic)
    print(geral.round(3).to_string())

    oof_all.to_csv(DATA / "gb_v2_E3_oof.csv", index=False)
    geral.reset_index().to_csv(DATA / "gb_v2_E3_resumo.csv", index=False)
    return oof_all, geral


# ============================================================================
# E4 - Correlacao entre sensores da mesma area (PCA no alvo)
# ============================================================================
EXPL_VAR_LOG: list[float] = []


def est_wide_pca(k: int = 4, base: str = "gb"):
    def f(tr, te, cod):
        X, Y = gb._wide(tr, cod, gb.VARIAVEIS, onehot=False)
        Y_fill = Y.fillna(Y.mean())
        scaler = StandardScaler()
        Ys = scaler.fit_transform(Y_fill.values)
        kk = max(1, min(k, Ys.shape[1] - 1, Ys.shape[0] - 1))
        pca = PCA(n_components=kk, random_state=SEMENTE)
        scores = pca.fit_transform(Ys)
        EXPL_VAR_LOG.append(float(pca.explained_variance_ratio_.sum()))
        modelo = (MultiOutputRegressor(gb.gbr(**gb.PARAMS_LR03)) if base == "gb"
                  else MultiOutputRegressor(RidgeCV(alphas=np.logspace(-2, 3, 20))))
        modelo.fit(X.values, scores)
        configs_te = te.drop_duplicates("config_id").set_index("config_id")
        X_te = cod.X_ordinal(configs_te, gb.VARIAVEIS)
        scores_te = modelo.predict(X_te.values)
        Ys_te = pca.inverse_transform(scores_te)
        Y_te = scaler.inverse_transform(Ys_te)
        P = pd.DataFrame(Y_te, index=X_te.index, columns=Y.columns)
        media_geral = Y_fill.values.mean()
        pred = np.array([
            P.at[c, s] if s in P.columns else media_geral
            for c, s in zip(te["config_id"], te["sensor"])
        ])
        return pred
    return f


def est_wide_padronizado(base: str = "gb"):
    """Alvo padronizado por sensor (sem PCA) - controle p/ isolar o efeito do PCA."""
    def f(tr, te, cod):
        X, Y = gb._wide(tr, cod, gb.VARIAVEIS, onehot=False)
        Y_fill = Y.fillna(Y.mean())
        scaler = StandardScaler()
        Ys = scaler.fit_transform(Y_fill.values)
        modelo = (MultiOutputRegressor(gb.gbr(**gb.PARAMS_LR03)) if base == "gb"
                  else MultiOutputRegressor(RidgeCV(alphas=np.logspace(-2, 3, 20))))
        modelo.fit(X.values, Ys)
        configs_te = te.drop_duplicates("config_id").set_index("config_id")
        X_te = cod.X_ordinal(configs_te, gb.VARIAVEIS)
        Ys_te = modelo.predict(X_te.values)
        Y_te = scaler.inverse_transform(Ys_te)
        P = pd.DataFrame(Y_te, index=X_te.index, columns=Y.columns)
        media_geral = Y_fill.values.mean()
        pred = np.array([
            P.at[c, s] if s in P.columns else media_geral
            for c, s in zip(te["config_id"], te["sensor"])
        ])
        return pred
    return f


def rodar_E4():
    print("\n" + "=" * 100)
    print("E4 - Correlacao entre sensores (PCA no alvo) vs. padronizacao simples")
    print("=" * 100)
    df = gb.carregar_longo()
    cod = gb.Codificador(df)
    folds = folds_logo(df)

    EXPL_VAR_LOG.clear()
    E = {
        "gb_lr03": (gb.est_wide_gb(gb.PARAMS_LR03), False, "referencia"),
        "pca_gb": (est_wide_pca(k=4, base="gb"), False, "PCA(4) + GB"),
        "pca_ridge": (est_wide_pca(k=4, base="ridge"), False, "PCA(4) + Ridge"),
        "std_gb": (est_wide_padronizado(base="gb"), False, "alvo padronizado (sem PCA) + GB"),
    }
    oof = gb.executar_folds(df, cod, E, folds, "E4", usar_ensembles=False)
    por_area = gb.resumo_por_area(oof)
    geral = gb.resumo_geral(por_area, oof)
    ic = ic_bootstrap(oof, "gb_lr03")
    geral = geral.join(ic)
    print(geral.round(3).to_string())
    if EXPL_VAR_LOG:
        print(f"Variancia explicada media pelo PCA(4): {np.mean(EXPL_VAR_LOG):.3f}")

    oof.to_csv(DATA / "gb_v2_E4_oof.csv", index=False)
    geral.reset_index().to_csv(DATA / "gb_v2_E4_resumo.csv", index=False)
    por_area.to_csv(DATA / "gb_v2_E4_por_area.csv", index=False)
    return oof, geral


# ============================================================================
# E5 - 56 runs como amostras, LOGO por configuracao
# ============================================================================
def rodar_E5():
    print("\n" + "=" * 100)
    print("E5 - 56 runs (sem media), LOGO por configuracao fisica")
    print("=" * 100)
    df = gb.carregar_longo_56()
    cod = gb.Codificador(df)
    configs = np.sort(df["config_id"].unique())
    print(f"  runs: {df['run_idx'].nunique()} | configuracoes: {len(configs)}")

    vencedores = {
        "gb_lr03": gb.est_wide_gb(gb.PARAMS_LR03),
        "ridge_1h": est_wide_ridge(poly=False),
    }
    registros = []
    for i, cfg_te in enumerate(configs):
        tr_all = df[df["config_id"] != cfg_te]
        te_all = df[df["config_id"] == cfg_te]
        for area in te_all["area"].unique():
            tr = tr_all[tr_all["area"] == area].assign(config_id=lambda d: d["run_idx"])
            te = te_all[te_all["area"] == area].assign(config_id=lambda d: d["run_idx"])
            for nome, fn in vencedores.items():
                pred = fn(tr, te, cod)
                registros.append(pd.DataFrame({
                    "estrategia": nome, "area": te["area"].values, "sensor": te["sensor"].values,
                    "run_idx": te["config_id"].values, "config_id_real": cfg_te,
                    "real": te["temp"].values, "pred": pred, "limite": te["limite"].values, "fold": i,
                }))
    oof = pd.concat(registros, ignore_index=True)

    cfg_mean = (df.groupby(["config_id", "area", "sensor"])["temp"].mean()
                  .rename("real_config_mean").reset_index())
    oof = oof.merge(cfg_mean, left_on=["config_id_real", "area", "sensor"], right_on=["config_id", "area", "sensor"], how="left")

    # score vs cada run (real)
    oof_run = oof.rename(columns={"config_id_real": "config_id"})
    por_area_run = gb.resumo_por_area(oof_run)
    geral_run = gb.resumo_geral(por_area_run, oof_run)
    print("\nScore vs. run individual:")
    print(geral_run.round(3).to_string())

    # score vs media da config (usa real_config_mean no lugar de real)
    oof_cfg = oof_run.copy()
    oof_cfg["real"] = oof_cfg["real_config_mean"]
    por_area_cfg = gb.resumo_por_area(oof_cfg)
    geral_cfg = gb.resumo_geral(por_area_cfg, oof_cfg)
    print("\nScore vs. media da configuracao:")
    print(geral_cfg.round(3).to_string())

    oof.to_csv(DATA / "gb_v2_E5_oof.csv", index=False)
    geral_run.reset_index().to_csv(DATA / "gb_v2_E5_resumo_vs_run.csv", index=False)
    geral_cfg.reset_index().to_csv(DATA / "gb_v2_E5_resumo_vs_config_mean.csv", index=False)
    return oof, geral_run, geral_cfg


def carregar_variante_c():
    """Base config-level (7 vars) com material_coil_support reclassificado a
    partir de `reason` (E2-c, vencedora) e alinhada ao tratamento (grade
    completa + preenchimento IQR). Drop-in para gb.carregar_longo()."""
    pp, limites = carregar_base_runs_E2()
    pp_c = relabel_material(pp)
    df_c = agregar_por_config(pp_c, list(gb.VARIAVEIS), limites)
    cod_c = gb.Codificador(df_c)
    return df_c, cod_c


# ============================================================================
# E6 - Ensemble: media simples vs. selecao aninhada por area
# ============================================================================
def rodar_E6(usar_variante_c: bool = False):
    print("\n" + "=" * 100)
    sufixo = "_varC" if usar_variante_c else ""
    print(f"E6 - Ensemble (media simples vs. selecao aninhada por area){' [variante C]' if usar_variante_c else ''}")
    print("=" * 100)
    if usar_variante_c:
        df, cod = carregar_variante_c()
    else:
        df = gb.carregar_longo()
        cod = gb.Codificador(df)
    candidatos = {
        "gb_lr03": gb.est_wide_gb(gb.PARAMS_LR03),
        "rf": gb.est_wide_rf,
        "ridge_1h": est_wide_ridge(poly=False),
    }
    folds = folds_logo(df)
    E = {k: (v, False, "") for k, v in candidatos.items()}
    oof = gb.executar_folds(df, cod, E, folds, "E6", usar_ensembles=False)

    ens = (oof.groupby(["area", "sensor", "config_id", "fold"], as_index=False)
              .agg(real=("real", "first"), limite=("limite", "first"), pred=("pred", "mean")))
    ens["estrategia"] = "ens_simples_3"

    configs = np.sort(df["config_id"].unique())
    registros_nested = []
    for i, cfg_te in enumerate(configs):
        tr_all = df[df["config_id"] != cfg_te]
        te_all = df[df["config_id"] == cfg_te]
        cfgs_tr = np.sort(tr_all["config_id"].unique())
        inner_splits = list(KFold(5, shuffle=True, random_state=SEMENTE).split(cfgs_tr))
        for area in te_all["area"].unique():
            tr_area = tr_all[tr_all["area"] == area]
            te_area = te_all[te_all["area"] == area]
            scores = {k: [] for k in candidatos}
            for itr, iva in inner_splits:
                cfg_itr, cfg_iva = cfgs_tr[itr], cfgs_tr[iva]
                sub_tr = tr_area[tr_area["config_id"].isin(cfg_itr)]
                sub_va = tr_area[tr_area["config_id"].isin(cfg_iva)]
                if len(sub_tr) == 0 or len(sub_va) == 0:
                    continue
                for nome, fn in candidatos.items():
                    p = fn(sub_tr, sub_va, cod)
                    scores[nome].append(float(np.mean(np.abs(sub_va["temp"].values - p))))
            melhor = min(scores, key=lambda k: (np.mean(scores[k]) if scores[k] else np.inf))
            pred = candidatos[melhor](tr_area, te_area, cod)
            registros_nested.append(pd.DataFrame({
                "estrategia": "nested_por_area", "area": te_area["area"].values,
                "sensor": te_area["sensor"].values, "config_id": te_area["config_id"].values,
                "real": te_area["temp"].values, "pred": pred, "limite": te_area["limite"].values,
                "fold": i, "escolhido": melhor,
            }))
        print(f"  E6 fold {i + 1}/{len(configs)} ok", flush=True)

    oof_nested = pd.concat(registros_nested, ignore_index=True)
    oof_all = pd.concat([oof, ens, oof_nested], ignore_index=True)
    por_area = gb.resumo_por_area(oof_all)
    geral = gb.resumo_geral(por_area, oof_all)
    ic = ic_bootstrap(oof_all, "gb_lr03")
    geral = geral.join(ic)
    print(geral.round(3).to_string())
    if "escolhido" in oof_nested.columns:
        print("\nEstrategia escolhida por area (contagem de folds):")
        print(oof_nested.drop_duplicates(["area", "fold"]).groupby(["area", "escolhido"]).size().unstack(fill_value=0))

    oof_all.to_csv(DATA / f"gb_v2_E6_oof{sufixo}.csv", index=False)
    geral.reset_index().to_csv(DATA / f"gb_v2_E6_resumo{sufixo}.csv", index=False)
    return oof_all, geral


# ============================================================================
# E7 - Margem conformal por sensor (entregavel central)
# ============================================================================
def rodar_E7(usar_variante_c: bool = False):
    print("\n" + "=" * 100)
    sufixo = "_varC" if usar_variante_c else ""
    print(f"E7 - Margem conformal por sensor (gb_lr03, LOGO){' [variante C]' if usar_variante_c else ''}")
    print("=" * 100)
    if usar_variante_c:
        df, cod = carregar_variante_c()
    else:
        df = gb.carregar_longo()
        cod = gb.Codificador(df)
    folds = folds_logo(df)
    E = {"gb_lr03": (gb.est_wide_gb(gb.PARAMS_LR03), False, "")}
    oof = gb.executar_folds(df, cod, E, folds, "E7", usar_ensembles=False)
    oof["residuo"] = oof["real"] - oof["pred"]  # positivo = modelo subestimou (risco de FN)

    resid_por_sensor = oof.groupby("sensor")["residuo"].apply(lambda s: s.values)
    resid_por_area = oof.groupby("area")["residuo"].apply(lambda s: s.values)
    sd_por_sensor = oof.groupby("sensor")["residuo"].std()
    sensor_area = oof.drop_duplicates("sensor").set_index("sensor")["area"].to_dict()

    qs = [0.5, 0.6, 0.7, 0.8, 0.9, 0.95]
    linhas, margens_por_q = [], {}
    for q in qs:
        margem = {}
        for sensor in resid_por_sensor.index:
            res = np.asarray(resid_por_sensor[sensor])
            if len(res) >= 20:
                m = np.quantile(res, q)
            else:
                area = sensor_area.get(sensor)
                res_area = np.asarray(resid_por_area.get(area, res))
                sd_area = res_area.std() if res_area.std() > 0 else 1.0
                escala = (sd_por_sensor.get(sensor, sd_area) / sd_area) if sd_area else 1.0
                m = np.quantile(res_area, q) * (escala if np.isfinite(escala) else 1.0)
            margem[sensor] = max(0.0, float(m)) if np.isfinite(m) else 0.0
        margens_por_q[q] = margem
        d = oof.copy()
        d["margem"] = d["sensor"].map(margem)
        d["alarme"] = (d["pred"] + d["margem"]) > d["limite"]
        d["excede"] = d["real"] > d["limite"]
        fn = int(((d["excede"]) & (~d["alarme"])).sum())
        fp = int(((~d["excede"]) & (d["alarme"])).sum())
        exced = int(d["excede"].sum())
        linhas.append({"q": q, "FN": fn, "FP": fp, "exceedances": exced,
                        "FN_taxa": fn / exced if exced else np.nan,
                        "margem_media_C": float(np.mean(list(margem.values())))})
    tabela_q = pd.DataFrame(linhas)
    print(tabela_q.round(3).to_string(index=False))

    print("\nGP (k*pred_std) para comparacao:")
    oof_gp = rodar_gp_logo(df, cod)
    linhas_gp = []
    for k in (1, 1.64, 2):
        d = oof_gp.copy()
        d["margem"] = k * d["pred_std"]
        d["alarme"] = (d["pred"] + d["margem"]) > d["limite"]
        d["excede"] = d["real"] > d["limite"]
        fn = int(((d["excede"]) & (~d["alarme"])).sum())
        fp = int(((~d["excede"]) & (d["alarme"])).sum())
        exced = int(d["excede"].sum())
        linhas_gp.append({"k": k, "FN": fn, "FP": fp, "exceedances": exced,
                           "FN_taxa": fn / exced if exced else np.nan,
                           "margem_media_C": float(d["margem"].mean())})
    tabela_gp = pd.DataFrame(linhas_gp)
    print(tabela_gp.round(3).to_string(index=False))

    print("\nSplit-conformal (otimismo, 5 repeticoes de calibracao/validacao 16/16, q=0.8):")
    configs = np.sort(df["config_id"].unique())
    rng = np.random.RandomState(SEMENTE)
    q_fixo = 0.8
    linhas_split = []
    for rep in range(5):
        perm = rng.permutation(configs)
        cal, val = perm[:16], perm[16:]
        oof_cal = oof[oof["config_id"].isin(cal)]
        oof_val = oof[oof["config_id"].isin(val)]
        marg = oof_cal.groupby("sensor")["residuo"].quantile(q_fixo).clip(lower=0).to_dict()
        d = oof_val.copy()
        d["margem"] = d["sensor"].map(marg).fillna(0.0)
        d["alarme"] = (d["pred"] + d["margem"]) > d["limite"]
        d["excede"] = d["real"] > d["limite"]
        fn = int(((d["excede"]) & (~d["alarme"])).sum())
        exced = int(d["excede"].sum())
        linhas_split.append({"rep": rep, "FN": fn, "exceedances": exced,
                              "FN_taxa": fn / exced if exced else np.nan})
    tabela_split = pd.DataFrame(linhas_split)
    print(tabela_split.round(3).to_string(index=False))

    validos = tabela_q[tabela_q["FN_taxa"] <= 0.10]
    q_escolhido = float(validos["q"].min()) if len(validos) else float(tabela_q.sort_values("FN_taxa")["q"].iloc[0])
    margem_final = margens_por_q[q_escolhido]
    saida = {s: {"area": sensor_area.get(s, ""), "q": q_escolhido, "margem_c": round(max(0.0, float(m)), 2)}
             for s, m in margem_final.items()}
    nome_json = "margens_por_sensor.json" if not usar_variante_c else "margens_por_sensor_varC.json"
    with open(DATA / nome_json, "w", encoding="utf-8") as f:
        json.dump(saida, f, ensure_ascii=False, indent=2)

    tabela_q.to_csv(DATA / f"gb_v2_E7_margens_por_q{sufixo}.csv", index=False)
    tabela_gp.to_csv(DATA / f"gb_v2_E7_gp_k{sufixo}.csv", index=False)
    tabela_split.to_csv(DATA / f"gb_v2_E7_split_conformal{sufixo}.csv", index=False)
    print(f"\nq escolhido: {q_escolhido} -> data/margens_por_sensor.json ({len(saida)} sensores)")
    return tabela_q, tabela_gp, tabela_split, q_escolhido


# ============================================================================
# Main
# ============================================================================
def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--exp", nargs="+", default=["E0", "E2", "E3", "E4", "E5", "E6", "E7"],
                     choices=["E0", "E2", "E3", "E4", "E5", "E6", "E7"])
    ap.add_argument("--protocolo", choices=["logo", "cv"], default="logo")
    ap.add_argument("--folds", type=int, default=5)
    ap.add_argument("--repeticoes", type=int, default=5)
    ap.add_argument("--variante-c", action="store_true",
                     help="E6/E7 usam a base com material_coil_support reclassificado (E2-c)")
    args = ap.parse_args()

    pd.set_option("display.width", 220)
    pd.set_option("display.max_columns", 40)

    t0 = time.time()
    if "E0" in args.exp:
        rodar_E0(args.protocolo, args.folds, args.repeticoes)
    if "E2" in args.exp:
        rodar_E2()
    if "E3" in args.exp:
        rodar_E3()
    if "E4" in args.exp:
        rodar_E4()
    if "E5" in args.exp:
        rodar_E5()
    if "E6" in args.exp:
        rodar_E6(usar_variante_c=args.variante_c)
    if "E7" in args.exp:
        rodar_E7(usar_variante_c=args.variante_c)
    print(f"\ntempo total: {time.time() - t0:.0f}s")


if __name__ == "__main__":
    main()
