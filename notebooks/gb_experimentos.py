"""
gb_experimentos.py - bancada de testes do Gradient Boosting (Thermal Predictor)

Compara estrategias de modelagem com Gradient Boosting sobre as sete planilhas
wide geradas por `tratamento_final_dos_dados.ipynb` (`data/<key_area>_data.csv`),
usando SEMPRE os mesmos folds para todas as estrategias, de modo que a diferenca
entre elas seja atribuivel ao metodo e nao ao sorteio da divisao.

Dois protocolos de avaliacao:

  P1 - "notebook": divisao 70/20/10 com semente 42, igual a Celula 4 de
       `Grad_Boosting_Regre.ipynb`. Serve para comparar com os numeros ja
       registrados. Com 33 linhas por area o teste tem 7 linhas: e ruidoso.
  P2 - "cv": RepeatedKFold sobre as 33 configuracoes (5 folds x 5 repeticoes por
       padrao). Cada configuracao e prevista 5 vezes fora da amostra. E o
       protocolo em que este script se apoia para decidir.

Uso (a partir da raiz do repositorio):

    .\\.venv\\Scripts\\python.exe notebooks\\gb_experimentos.py            # tudo
    .\\.venv\\Scripts\\python.exe notebooks\\gb_experimentos.py --rapido   # 5x1 folds
    .\\.venv\\Scripts\\python.exe notebooks\\gb_experimentos.py --so cv grade
    .\\.venv\\Scripts\\python.exe notebooks\\gb_experimentos.py --so vazamento

Etapas (`--so` escolhe um subconjunto): notebook, cv, grade, vazamento.

Saidas: tabelas no console e CSVs em `data/gb_experimentos_*.csv` (a pasta data/
esta no .gitignore, entao nada disso entra no repositorio).
"""

from __future__ import annotations

import argparse
import re
import sys
import time
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import (
    GradientBoostingRegressor,
    HistGradientBoostingRegressor,
    RandomForestRegressor,
)
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import (
    GridSearchCV,
    GroupKFold,
    KFold,
    RepeatedKFold,
    train_test_split,
)
from sklearn.multioutput import MultiOutputRegressor

warnings.filterwarnings("ignore")

try:
    import lightgbm as lgb
except ImportError:  # pragma: no cover
    lgb = None
try:
    from catboost import CatBoostRegressor
except ImportError:  # pragma: no cover
    CatBoostRegressor = None

RAIZ = Path(__file__).resolve().parents[1]
DATA = RAIZ / "data"
SEMENTE = 42

VARIAVEIS = [
    "blower_direction",
    "housing",
    "board_position",
    "run_case",
    "losses",
    "deflector_hole",
    "material_coil_support",
]
# H2 / src/backend/app/data.py (MODEL_FIELDS): o back-end assume 5 variaveis.
VARIAVEIS_5 = [v for v in VARIAVEIS if v not in ("losses", "board_position")]

# Mesma padronizacao da Celula 3 de Grad_Boosting_Regre.ipynb.
GRAFIAS_DIVERGENTES = {
    "blower_direction": {"To back": "To Back", "To front": "To Front"},
    "losses": {"No losses": "No Losses"},
    "run_case": {"Broil Case 2": "Broil C2", "Broil Qual": "Broil Qualitative",
                 "Qualitative": "Broil Qualitative"},
    "housing": {"Open - Updated": "Open"},
}

AREAS = {
    "mainback": "Mainback",
    "coil_temps": "Coil Temps",
    "main_vent_sys": "Main Vent Sys",
    "ct_knobs": "CT Knobs",
    "ipc_comp": "IPC Comp",
    "ipc_cooling": "IPC Cooling",
    "oven_hmi": "Oven HMI",
}

PADRAO_IGBT = re.compile(r"^IGBT (?:[1-9]|1[0-6])$")

# Hiperparametros vencedores do GridSearch da Celula 5 do notebook (Mainback).
PARAMS_NOTEBOOK = dict(n_estimators=100, learning_rate=0.1, max_depth=3, subsample=0.8)
# Melhor combinacao da grade P3 deste script (lr baixo = encolhimento forte para a media).
PARAMS_LR03 = dict(n_estimators=100, learning_rate=0.03, max_depth=3, subsample=0.8)
GRADE_NOTEBOOK = {
    "estimator__n_estimators": [100, 300],
    "estimator__learning_rate": [0.05, 0.1],
    "estimator__max_depth": [2, 3],
    "estimator__subsample": [1.0, 0.8],
}


# ============================================================================
# 1. Carga: uma tabela longa (config x area x sensor)
# ============================================================================
def padronizar(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    for variavel, correcoes in GRAFIAS_DIVERGENTES.items():
        if variavel in df.columns:
            df[variavel] = df[variavel].replace(correcoes)
    for variavel in VARIAVEIS:
        df[variavel] = df[variavel].fillna("Nao Informado").astype(str).str.strip()
    return df


def carregar_limites() -> dict[str, float]:
    """active_limit por tc_name (unico por sensor no dataset pre-processado)."""
    pp = pd.read_csv(DATA / "dataset_pre_processado.csv")
    limites = pp.groupby("tc_name")["active_limit"].first().to_dict()
    igbt = [v for k, v in limites.items() if PADRAO_IGBT.fullmatch(str(k))]
    if igbt:
        limites["IGBT"] = float(np.mean(igbt))
    return {str(k).strip(): float(v) for k, v in limites.items()}


def carregar_longo() -> pd.DataFrame:
    """Le as 7 planilhas wide (33 linhas) e empilha em formato longo."""
    limites = carregar_limites()
    partes = []
    for stem, area in AREAS.items():
        caminho = DATA / f"{stem}_data.csv"
        if not caminho.exists():
            sys.exit(f"Falta {caminho}. Rode notebooks/tratamento_final_dos_dados.ipynb antes.")
        wide = padronizar(pd.read_csv(caminho))
        sensores = [c for c in wide.columns if c not in VARIAVEIS
                    and not str(c).startswith("Unnamed:") and not wide[c].isna().all()]
        longo = wide.melt(id_vars=VARIAVEIS, value_vars=sensores,
                          var_name="sensor", value_name="temp").dropna(subset=["temp"])
        longo["area"] = area
        partes.append(longo)
    df = pd.concat(partes, ignore_index=True)
    df["sensor"] = df["sensor"].astype(str).str.strip()
    df["limite"] = df["sensor"].map(limites)
    if df["limite"].isna().any():
        faltando = sorted(df.loc[df["limite"].isna(), "sensor"].unique())
        print(f"Aviso: sem active_limit para {faltando}; metricas de seguranca ignoram esses sensores.")
    # Identificador de configuracao (tupla das 7 variaveis) - e a unidade de
    # divisao treino/teste em todos os protocolos.
    df["config_id"] = pd.factorize(pd.MultiIndex.from_frame(df[VARIAVEIS]))[0]
    return df


def carregar_longo_56() -> pd.DataFrame:
    """Versao pre-unificacao (uma linha por run, 56 runs) direto do pre-processado.

    Reproduz o que o notebook de Gradient Boosting usou quando foi executado:
    runs repetidos (mesma configuracao) permanecem como linhas distintas.
    """
    limites = carregar_limites()
    pp = padronizar(pd.read_csv(DATA / "dataset_pre_processado.csv"))
    pp = pp[pp["tc_name"] != "Oven RTD Connector Body"].copy()  # excluido pelo tratamento
    pp["sensor"] = pp["tc_name"].astype(str).str.strip()
    pp.loc[pp["sensor"].str.fullmatch(PADRAO_IGBT.pattern), "sensor"] = "IGBT"
    df = (pp.groupby(["run_id", "key_area", "sensor"] + VARIAVEIS, as_index=False)["temp"]
            .mean()
            .rename(columns={"key_area": "area"}))
    df["limite"] = df["sensor"].map(limites)
    df["config_id"] = pd.factorize(pd.MultiIndex.from_frame(df[VARIAVEIS]))[0]
    df["run_idx"] = pd.factorize(df["run_id"])[0]
    return df


# ============================================================================
# 2. Codificacoes
# ============================================================================
class Codificador:
    """Dicionarios de codificacao calculados uma vez sobre o conjunto completo.

    Sao apenas rotulos (nao usam o alvo), entao nao ha vazamento em fixa-los.
    """

    def __init__(self, df: pd.DataFrame):
        self.ordinal = {v: {c: i for i, c in enumerate(sorted(df[v].unique()))} for v in VARIAVEIS}
        self.categorias = {v: sorted(df[v].unique()) for v in VARIAVEIS}
        self.sensores = {s: i for i, s in enumerate(sorted(df["sensor"].unique()))}
        self.areas = {a: i for i, a in enumerate(sorted(df["area"].unique()))}

    def X_ordinal(self, df: pd.DataFrame, variaveis=VARIAVEIS) -> pd.DataFrame:
        return pd.DataFrame({v: df[v].map(self.ordinal[v]).astype(int).values for v in variaveis},
                            index=df.index)

    def X_onehot(self, df: pd.DataFrame, variaveis=VARIAVEIS) -> pd.DataFrame:
        colunas = {}
        for v in variaveis:
            for c in self.categorias[v]:
                colunas[f"{v}={c}"] = (df[v] == c).astype(int).values
        return pd.DataFrame(colunas, index=df.index)


# ============================================================================
# 3. Estrategias
#    Cada estrategia recebe (treino_longo, teste_longo, cod) e devolve um vetor
#    de previsoes alinhado as linhas de teste_longo. Estrategias "por area"
#    recebem apenas as linhas de uma area; as "globais" recebem todas.
# ============================================================================
def _wide(df: pd.DataFrame, cod: Codificador, variaveis, onehot=False):
    """Pivota o formato longo de UMA area para (X por config, Y por sensor)."""
    configs = df.drop_duplicates("config_id").set_index("config_id")
    Y = df.pivot_table(index="config_id", columns="sensor", values="temp", aggfunc="mean")
    configs = configs.loc[Y.index]
    X = cod.X_onehot(configs, variaveis) if onehot else cod.X_ordinal(configs, variaveis)
    return X, Y


def _prever_wide(modelo, X_tr, Y_tr, teste: pd.DataFrame, cod, variaveis, onehot=False):
    Y_fill = Y_tr.fillna(Y_tr.mean())
    modelo.fit(X_tr.values, Y_fill.values)
    configs_te = teste.drop_duplicates("config_id").set_index("config_id")
    X_te = cod.X_onehot(configs_te, variaveis) if onehot else cod.X_ordinal(configs_te, variaveis)
    P = pd.DataFrame(modelo.predict(X_te.values), index=X_te.index, columns=Y_tr.columns)
    # Sensores do teste que nao apareceram no treino: cai na media global do treino.
    pred = np.array([
        P.at[c, s] if s in P.columns else Y_fill.values.mean()
        for c, s in zip(teste["config_id"], teste["sensor"])
    ])
    return pred


def gbr(**kw):
    p = dict(random_state=SEMENTE)
    p.update(kw)
    return GradientBoostingRegressor(**p)


def est_media_sensor(tr, te, cod):
    medias = tr.groupby("sensor")["temp"].mean()
    return te["sensor"].map(medias).fillna(tr["temp"].mean()).values


def est_wide_gb(params, variaveis=VARIAVEIS, onehot=False):
    def f(tr, te, cod):
        X, Y = _wide(tr, cod, variaveis, onehot)
        modelo = MultiOutputRegressor(gbr(**params))
        return _prever_wide(modelo, X, Y, te, cod, variaveis, onehot)
    return f


def est_wide_gb_grid(tr, te, cod):
    """Replica a Celula 5 do notebook: GridSearchCV (3 folds, MAE) por area."""
    X, Y = _wide(tr, cod, VARIAVEIS)
    busca = GridSearchCV(
        MultiOutputRegressor(gbr(), n_jobs=1), GRADE_NOTEBOOK,
        cv=max(2, min(3, len(X))), scoring="neg_mean_absolute_error", n_jobs=-1,
    )
    return _prever_wide(busca, X, Y, te, cod, VARIAVEIS)


def est_wide_rf(tr, te, cod):
    X, Y = _wide(tr, cod, VARIAVEIS)
    modelo = RandomForestRegressor(n_estimators=300, min_samples_leaf=1, random_state=SEMENTE, n_jobs=-1)
    return _prever_wide(modelo, X, Y, te, cod, VARIAVEIS)


def _long_features(df, cod, variaveis, medias_sensor, onehot, com_area=False):
    """Features do formato longo: config + id do sensor + patamar do sensor (media de treino)."""
    X = cod.X_onehot(df, variaveis) if onehot else cod.X_ordinal(df, variaveis)
    X["sensor_id"] = df["sensor"].map(cod.sensores).values
    X["sensor_nivel"] = df["sensor"].map(medias_sensor).fillna(medias_sensor.mean()).values
    if com_area:
        X["area_id"] = df["area"].map(cod.areas).values
    return X


def est_long_gb(params, variaveis=VARIAVEIS, residual=True, onehot=False, com_area=False, modelo_fn=None):
    """Um unico GB por area (ou global) no formato longo: o sensor vira feature.

    residual=True: o alvo e temp - media_do_sensor_no_treino (o modelo aprende
    o desvio causado pela configuracao, nao o patamar de cada sensor).
    """
    def f(tr, te, cod):
        medias = tr.groupby("sensor")["temp"].mean()
        X_tr = _long_features(tr, cod, variaveis, medias, onehot, com_area)
        X_te = _long_features(te, cod, variaveis, medias, onehot, com_area)
        base_tr = X_tr["sensor_nivel"].values if residual else 0.0
        base_te = X_te["sensor_nivel"].values if residual else 0.0
        modelo = modelo_fn() if modelo_fn else gbr(**params)
        modelo.fit(X_tr.values, tr["temp"].values - base_tr)
        return modelo.predict(X_te.values) + base_te
    return f


def est_long_hgb(params, variaveis=VARIAVEIS, com_area=False):
    """HistGradientBoosting com suporte nativo a categoricas (sem ordinal artificial)."""
    def f(tr, te, cod):
        medias = tr.groupby("sensor")["temp"].mean()
        X_tr = _long_features(tr, cod, variaveis, medias, False, com_area)
        X_te = _long_features(te, cod, variaveis, medias, False, com_area)
        cat = [i for i, c in enumerate(X_tr.columns) if c != "sensor_nivel"]
        p = dict(random_state=SEMENTE, categorical_features=cat)
        p.update(params)
        modelo = HistGradientBoostingRegressor(**p)
        modelo.fit(X_tr.values, tr["temp"].values - X_tr["sensor_nivel"].values)
        return modelo.predict(X_te.values) + X_te["sensor_nivel"].values
    return f


def est_long_lgbm(params, variaveis=VARIAVEIS, com_area=False):
    def f(tr, te, cod):
        medias = tr.groupby("sensor")["temp"].mean()
        X_tr = _long_features(tr, cod, variaveis, medias, False, com_area)
        X_te = _long_features(te, cod, variaveis, medias, False, com_area)
        cat = [c for c in X_tr.columns if c != "sensor_nivel"]
        for c in cat:
            X_tr[c] = X_tr[c].astype("category")
            X_te[c] = pd.Categorical(X_te[c], categories=X_tr[c].cat.categories)
        p = dict(random_state=SEMENTE, verbose=-1, min_child_samples=5)
        p.update(params)
        modelo = lgb.LGBMRegressor(**p)
        modelo.fit(X_tr, tr["temp"].values - X_tr["sensor_nivel"].values)
        return modelo.predict(X_te) + X_te["sensor_nivel"].values
    return f


def est_long_catboost(params, variaveis=VARIAVEIS, com_area=False):
    def f(tr, te, cod):
        medias = tr.groupby("sensor")["temp"].mean()
        cols = list(variaveis) + ["sensor"] + (["area"] if com_area else [])
        X_tr = tr[cols].copy()
        X_te = te[cols].copy()
        X_tr["sensor_nivel"] = tr["sensor"].map(medias).values
        X_te["sensor_nivel"] = te["sensor"].map(medias).fillna(medias.mean()).values
        p = dict(random_seed=SEMENTE, verbose=0, cat_features=cols, thread_count=-1, allow_writing_files=False)
        p.update(params)
        modelo = CatBoostRegressor(**p)
        modelo.fit(X_tr, tr["temp"].values - X_tr["sensor_nivel"].values)
        return modelo.predict(X_te) + X_te["sensor_nivel"].values
    return f


def est_media(*fns):
    """Ensemble por media simples das previsoes de outras estrategias."""
    def f(tr, te, cod):
        return np.mean([fn(tr, te, cod) for fn in fns], axis=0)
    return f


# Ensembles calculados por media das previsoes das estrategias componentes (sem retreinar).
ENSEMBLES = {
    "14_ens_gb_long+gb_wide": ["8_gb_long_resid", "4_gb_conservador"],
    "18_ens_cat+gb_long": ["16_catboost_long", "8_gb_long_resid"],
    "19_ens_rf+gb_notebook": ["6_rf_wide", "1_gb_notebook"],
    "20_ens_rf+gb_long_5v": ["6_rf_wide", "9_gb_long_resid_5v"],
    "23_ens_rf+gb_nb+gb_long5v": ["6_rf_wide", "1_gb_notebook", "9_gb_long_resid_5v"],
    "26_ens_rf+gb_lr03": ["6_rf_wide", "24_gb_wide_lr03"],
    "27_ens_rf+gb_lr03_1h": ["6_rf_wide", "25_gb_wide_lr03_1h"],
    "28_ens_rf+gb_lr03+gb_long5v": ["6_rf_wide", "24_gb_wide_lr03", "9_gb_long_resid_5v"],
    "29_ens_gb_lr03+gb_lr03_1h": ["24_gb_wide_lr03", "25_gb_wide_lr03_1h"],
}


def estrategias(incluir_grid: bool) -> dict[str, tuple]:
    """nome -> (funcao, global?, descricao)."""
    conserv = dict(n_estimators=300, learning_rate=0.03, max_depth=2, subsample=0.8, min_samples_leaf=2)
    long_p = dict(n_estimators=600, learning_rate=0.03, max_depth=4, subsample=0.8, min_samples_leaf=5)
    E = {
        "0_media_sensor": (est_media_sensor, False, "baseline: media do sensor no treino"),
        "1_gb_notebook": (est_wide_gb(PARAMS_NOTEBOOK), False, "notebook: MultiOutput GBR, ordinal, 7 vars, params vencedores"),
        "2_gb_notebook_5vars": (est_wide_gb(PARAMS_NOTEBOOK, VARIAVEIS_5), False, "idem com 5 vars (sem losses/board_position, H2)"),
        "3_gb_notebook_onehot": (est_wide_gb(PARAMS_NOTEBOOK, onehot=True), False, "idem com one-hot"),
        "4_gb_conservador": (est_wide_gb(conserv), False, "MultiOutput GBR regularizado (lr .03, depth 2, leaf 2)"),
        "5_gb_conserv_huber": (est_wide_gb({**conserv, "loss": "huber"}), False, "idem com perda Huber"),
        "6_rf_wide": (est_wide_rf, False, "referencia: RandomForest multi-saida"),
        "7_gb_long": (est_long_gb(long_p, residual=False), False, "1 GBR por area, formato longo, sensor como feature"),
        "8_gb_long_resid": (est_long_gb(long_p), False, "idem, alvo = desvio da media do sensor"),
        "9_gb_long_resid_5v": (est_long_gb(long_p, VARIAVEIS_5), False, "idem com 5 vars"),
        "10_gb_long_resid_1h": (est_long_gb(long_p, onehot=True), False, "idem com one-hot"),
        "11_hgb_long_cat": (est_long_hgb(dict(max_iter=600, learning_rate=0.03, max_depth=4, min_samples_leaf=5, l2_regularization=1.0)), False, "HistGB, categoricas nativas, longo residual"),
        "12_gb_global_resid": (est_long_gb(long_p, com_area=True), True, "1 GBR para TODAS as areas (area+sensor como features)"),
        "13_hgb_global_cat": (est_long_hgb(dict(max_iter=800, learning_rate=0.03, max_depth=5, min_samples_leaf=5, l2_regularization=1.0), com_area=True), True, "HistGB global, categoricas nativas"),
        "24_gb_wide_lr03": (est_wide_gb(PARAMS_LR03), False, "MultiOutput GBR, ordinal, lr .03 / depth 3 / 100 arvores (melhor da grade P3)"),
        "25_gb_wide_lr03_1h": (est_wide_gb(PARAMS_LR03, onehot=True), False, "idem com one-hot"),
        "21_gb_long_q70": (est_long_gb({**long_p, "loss": "quantile", "alpha": 0.70}), False, "8 com perda quantilica a=0.70 (vies para cima: seguranca)"),
        "22_gb_wide_q70": (est_wide_gb({**PARAMS_NOTEBOOK, "loss": "quantile", "alpha": 0.70}), False, "1 com perda quantilica a=0.70"),
    }
    if lgb is not None:
        E["15_lgbm_long_cat"] = (est_long_lgbm(dict(n_estimators=600, learning_rate=0.03, num_leaves=15, subsample=0.8, subsample_freq=1, colsample_bytree=0.9)), False, "LightGBM, longo residual, categoricas nativas")
    if CatBoostRegressor is not None:
        E["16_catboost_long"] = (est_long_catboost(dict(iterations=300, learning_rate=0.08, depth=4)), False, "CatBoost, longo residual")
        E["17_catboost_global"] = (est_long_catboost(dict(iterations=400, learning_rate=0.08, depth=5), com_area=True), True, "CatBoost global (todas as areas)")
    if incluir_grid:
        E["1g_gb_notebook_grid"] = (est_wide_gb_grid, False, "notebook fiel: GridSearchCV 16 combos x 3 folds por area")
    return E


# ============================================================================
# 4. Metricas
# ============================================================================
def metricas_por_sensor(df: pd.DataFrame) -> pd.DataFrame:
    linhas = []
    for (estr, area, sensor), g in df.groupby(["estrategia", "area", "sensor"]):
        real, prev = g["real"].values, g["pred"].values
        mse = mean_squared_error(real, prev)
        linhas.append({
            "estrategia": estr, "area": area, "sensor": sensor, "n": len(g),
            "MAE": mean_absolute_error(real, prev),
            "RMSE": np.sqrt(mse),
            "R2": r2_score(real, prev) if len(g) > 1 and real.std() > 0 else np.nan,
            "MAPE_%": np.mean(np.abs((real - prev) / real)) * 100,
            "dentro_10%": np.mean(np.abs((real - prev) / real) <= 0.10),
        })
    return pd.DataFrame(linhas)


def metricas_seguranca(df: pd.DataFrame, chaves) -> pd.DataFrame:
    """RN22: falso-negativo de seguranca (real > limite, previsto <= limite) e
    erro normalizado pela folga ate o limite."""
    d = df.dropna(subset=["limite"]).copy()
    d["excede"] = d["real"] > d["limite"]
    d["fn"] = d["excede"] & (d["pred"] <= d["limite"])
    d["fp"] = (~d["excede"]) & (d["pred"] > d["limite"])
    folga = (d["limite"] - d["real"]).abs().clip(lower=1.0)
    d["erro_folga"] = (d["real"] - d["pred"]).abs() / folga
    out = d.groupby(chaves).agg(
        casos_acima_limite=("excede", "sum"),
        FN_seguranca=("fn", "sum"),
        FP_alarme=("fp", "sum"),
        erro_sobre_folga_mediana=("erro_folga", "median"),
    ).reset_index()
    out["FN_taxa"] = out["FN_seguranca"] / out["casos_acima_limite"].replace(0, np.nan)
    return out


def resumo_por_area(oof: pd.DataFrame) -> pd.DataFrame:
    ms = metricas_por_sensor(oof)
    por_area = ms.groupby(["estrategia", "area"]).agg(
        sensores=("sensor", "nunique"),
        MAE=("MAE", "mean"), RMSE=("RMSE", "mean"),
        R2_mediana=("R2", "median"), MAPE_pct=("MAPE_%", "mean"),
        dentro_10=("dentro_10%", "mean"),
    ).reset_index()
    seg = metricas_seguranca(oof, ["estrategia", "area"])
    return por_area.merge(seg, on=["estrategia", "area"], how="left")


def resumo_geral(por_area: pd.DataFrame, oof: pd.DataFrame) -> pd.DataFrame:
    g = por_area.groupby("estrategia").agg(
        MAE=("MAE", "mean"), RMSE=("RMSE", "mean"), R2_mediana=("R2_mediana", "mean"),
        MAPE_pct=("MAPE_pct", "mean"), dentro_10=("dentro_10", "mean"),
    )
    seg = metricas_seguranca(oof, ["estrategia"]).set_index("estrategia")
    g["FN_seg"] = seg["FN_seguranca"].astype(int).astype(str) + "/" + seg["casos_acima_limite"].astype(int).astype(str)
    g["FP_alarme"] = seg["FP_alarme"].astype(int)
    g["erro/folga_med"] = seg["erro_sobre_folga_mediana"]
    # MAE ponderado por sensor (ipc_comp tem 25 sensores e pesa mais no uso real).
    ms = metricas_por_sensor(oof)
    g["MAE_pond_sensor"] = ms.groupby("estrategia")["MAE"].mean()
    return g.sort_values("MAE")


# ============================================================================
# 5. Protocolos
# ============================================================================
def executar_folds(df: pd.DataFrame, cod: Codificador, E: dict, folds, rotulo: str,
                   usar_ensembles: bool = True) -> pd.DataFrame:
    """Roda todas as estrategias nos folds dados (listas de config_id) e devolve OOF."""
    registros = []
    tempos = {k: 0.0 for k in E}
    configs = np.sort(df["config_id"].unique())
    for k, (idx_tr, idx_te) in enumerate(folds):
        cfg_tr, cfg_te = configs[idx_tr], configs[idx_te]
        tr_all = df[df["config_id"].isin(cfg_tr)]
        te_all = df[df["config_id"].isin(cfg_te)]
        previsoes: dict[str, pd.Series] = {}
        for nome, (fn, global_, _) in E.items():
            t0 = time.perf_counter()
            if global_:
                pred = pd.Series(fn(tr_all, te_all, cod), index=te_all.index)
            else:
                partes = []
                for area in te_all["area"].unique():
                    tr = tr_all[tr_all["area"] == area]
                    te = te_all[te_all["area"] == area]
                    partes.append(pd.Series(fn(tr, te, cod), index=te.index))
                pred = pd.concat(partes)
            tempos[nome] += time.perf_counter() - t0
            previsoes[nome] = pred.reindex(te_all.index)
        if usar_ensembles:
            for nome, comps in ENSEMBLES.items():
                if all(c in previsoes for c in comps):
                    previsoes[nome] = sum(previsoes[c] for c in comps) / len(comps)
        for nome, pred in previsoes.items():
            registros.append(pd.DataFrame({
                "protocolo": rotulo, "fold": k, "estrategia": nome,
                "area": te_all["area"].values, "sensor": te_all["sensor"].values,
                "config_id": te_all["config_id"].values, "real": te_all["temp"].values,
                "pred": pred.values, "limite": te_all["limite"].values,
            }))
        print(f"  fold {k + 1}/{len(folds)} concluido", flush=True)
    print("  tempo por estrategia (s): " + ", ".join(f"{k}={v:.0f}" for k, v in tempos.items()))
    return pd.concat(registros, ignore_index=True)


def folds_notebook(df: pd.DataFrame):
    """Indices do teste da divisao 70/20/10 (semente 42) sobre as 33 configs, na
    ordem das planilhas wide (ordem de groupby, a mesma para as 7 areas)."""
    configs = np.sort(df["config_id"].unique())
    idx = np.arange(len(configs))
    tr, resto = train_test_split(idx, train_size=0.70, random_state=SEMENTE)
    te, ve = train_test_split(resto, test_size=0.10 / 0.30, random_state=SEMENTE)
    return [(np.sort(tr), np.sort(te))], [(np.sort(tr), np.sort(ve))]


def protocolo_notebook(df, cod, E):
    print("\n" + "=" * 100)
    print("P1 - DIVISAO 70/20/10, SEMENTE 42 (igual ao notebook) - metricas no TESTE (7 configs)")
    print("=" * 100)
    fold_te, fold_ve = folds_notebook(df)
    oof = executar_folds(df, cod, E, fold_te, "P1_teste")
    por_area = resumo_por_area(oof)
    geral = resumo_geral(por_area, oof)
    print(geral.round(3).to_string())
    print("\nMAE de teste por area (linhas = estrategia):")
    print(por_area.pivot(index="estrategia", columns="area", values="MAE").round(2).to_string())
    return oof, por_area, geral


def protocolo_cv(df, cod, E, n_folds, n_rep):
    print("\n" + "=" * 100)
    print(f"P2 - REPEATED K-FOLD sobre as {df['config_id'].nunique()} configuracoes: {n_folds} folds x {n_rep} repeticoes")
    print("=" * 100)
    rkf = RepeatedKFold(n_splits=n_folds, n_repeats=n_rep, random_state=SEMENTE)
    folds = list(rkf.split(np.arange(df["config_id"].nunique())))
    oof = executar_folds(df, cod, E, folds, "P2_cv")
    por_area = resumo_por_area(oof)
    geral = resumo_geral(por_area, oof)
    print("\nMEDIA ENTRE AREAS (fora da amostra):")
    print(geral.round(3).to_string())
    print("\nMAE fora da amostra por area:")
    print(por_area.pivot(index="estrategia", columns="area", values="MAE").round(2).to_string())
    print("\nR2 (mediana entre sensores) por area:")
    print(por_area.pivot(index="estrategia", columns="area", values="R2_mediana").round(2).to_string())
    print("\nFalsos-negativos de seguranca por area (real > limite e previsto <= limite):")
    print(por_area.pivot(index="estrategia", columns="area", values="FN_seguranca").fillna(0).astype(int).to_string())
    # Erro-padrao da diferenca entre estrategias, por repeticao, para saber se a
    # distancia entre duas estrategias e maior que o ruido do sorteio.
    oof["rep"] = oof["fold"] // n_folds
    por_rep = (oof.assign(ae=(oof.real - oof.pred).abs())
                  .groupby(["estrategia", "rep"])["ae"].mean().unstack("rep"))
    print("\nMAE (todas as areas, pond. por sensor) por repeticao - media +- desvio entre repeticoes:")
    print(pd.DataFrame({"media": por_rep.mean(axis=1), "desvio": por_rep.std(axis=1)})
          .sort_values("media").round(3).to_string())
    return oof, por_area, geral


def estudo_grade(df, cod, n_folds, n_rep):
    """Sensibilidade a hiperparametros das duas familias (wide MultiOutput e longo)."""
    print("\n" + "=" * 100)
    print("P3 - SENSIBILIDADE A HIPERPARAMETROS (mesmo protocolo de CV)")
    print("=" * 100)
    rkf = RepeatedKFold(n_splits=n_folds, n_repeats=n_rep, random_state=SEMENTE)
    folds = list(rkf.split(np.arange(df["config_id"].nunique())))

    grade_wide = []
    for lr in (0.03, 0.1):
        for depth in (1, 2, 3):
            for n in (100, 300):
                grade_wide.append(dict(learning_rate=lr, max_depth=depth, n_estimators=n,
                                       min_samples_leaf=1, subsample=0.8))
    grade_long = []
    for lr in (0.03, 0.1):
        for depth in (2, 3, 4, 6):
            for n in (300, 800):
                grade_long.append(dict(learning_rate=lr, max_depth=depth, n_estimators=n,
                                       min_samples_leaf=5, subsample=0.8))

    E = {}
    for i, p in enumerate(grade_wide):
        E[f"wide_{i:02d}"] = (est_wide_gb(p), False, str(p))
    for i, p in enumerate(grade_long):
        E[f"long_{i:02d}"] = (est_long_gb(p), False, str(p))
    oof = executar_folds(df, cod, E, folds, "P3_grade", usar_ensembles=False)
    por_area = resumo_por_area(oof)
    geral = resumo_geral(por_area, oof)
    geral["params"] = [E[k][2] for k in geral.index]
    pd.set_option("display.width", 250)
    print("\nWIDE (MultiOutput GBR) - melhores 8:")
    print(geral[geral.index.str.startswith("wide")].head(8)[["MAE", "RMSE", "R2_mediana", "dentro_10", "params"]].round(3).to_string())
    print("\nLONGO (1 GBR por area, residual) - melhores 8:")
    print(geral[geral.index.str.startswith("long")].head(8)[["MAE", "RMSE", "R2_mediana", "dentro_10", "params"]].round(3).to_string())
    print("\nPiores 3 de cada familia (para ver a amplitude):")
    print(geral[geral.index.str.startswith("wide")].tail(3)[["MAE", "params"]].round(3).to_string())
    print(geral[geral.index.str.startswith("long")].tail(3)[["MAE", "params"]].round(3).to_string())
    return oof, geral


def estudo_vazamento(n_folds, n_rep):
    """Mostra o efeito de dividir por RUN (como o notebook fazia sobre as 56 linhas)
    em vez de por CONFIGURACAO, quando ha runs repetidos com a mesma configuracao."""
    print("\n" + "=" * 100)
    print("P4 - VAZAMENTO: base de 56 runs (pre-unificacao), divisao por run vs. por configuracao")
    print("=" * 100)
    df = carregar_longo_56()
    cod = Codificador(df)
    n_runs, n_cfg = df["run_idx"].nunique(), df["config_id"].nunique()
    print(f"  runs: {n_runs} | configuracoes distintas: {n_cfg}")
    E = {
        "0_media_sensor": (est_media_sensor, False, ""),
        "1_gb_notebook": (est_wide_gb(PARAMS_NOTEBOOK), False, ""),
        "8_gb_long_resid": (est_long_gb(dict(n_estimators=600, learning_rate=0.03, max_depth=4, subsample=0.8, min_samples_leaf=5)), False, ""),
    }
    resultados = {}
    for modo in ("por_run", "por_config"):
        registros = []
        for rep in range(n_rep):
            runs = np.sort(df["run_idx"].unique())
            if modo == "por_run":
                splitter = KFold(n_folds, shuffle=True, random_state=SEMENTE + rep).split(runs)
            else:
                grupos = df.drop_duplicates("run_idx").set_index("run_idx").loc[runs, "config_id"].values
                rng = np.random.RandomState(SEMENTE + rep)
                perm = rng.permutation(n_cfg)
                grupos_perm = perm[grupos]  # embaralha os grupos para variar entre repeticoes
                splitter = GroupKFold(n_folds).split(runs, groups=grupos_perm)
            for k, (i_tr, i_te) in enumerate(splitter):
                tr_all = df[df["run_idx"].isin(runs[i_tr])]
                te_all = df[df["run_idx"].isin(runs[i_te])]
                for nome, (fn, _, _) in E.items():
                    partes, preds = [], []
                    for area in te_all["area"].unique():
                        tr = tr_all[tr_all["area"] == area]
                        te = te_all[te_all["area"] == area]
                        # no formato wide, o pivot precisa ser por run (linhas repetidas)
                        tr = tr.assign(config_id=tr["run_idx"])
                        te = te.assign(config_id=te["run_idx"])
                        preds.append(fn(tr, te, cod))
                        partes.append(te)
                    base = pd.concat(partes)
                    registros.append(pd.DataFrame({
                        "protocolo": modo, "fold": rep * n_folds + k, "estrategia": nome,
                        "area": base["area"].values, "sensor": base["sensor"].values,
                        "config_id": base["config_id"].values, "real": base["temp"].values,
                        "pred": np.concatenate(preds), "limite": base["limite"].values,
                    }))
        oof = pd.concat(registros, ignore_index=True)
        resultados[modo] = resumo_geral(resumo_por_area(oof), oof)[["MAE", "RMSE", "R2_mediana", "dentro_10"]]
    tabela = pd.concat(resultados, axis=1)
    print("\nMetricas fora da amostra (media entre areas), 56 runs:")
    print(tabela.round(3).to_string())
    print("\nLeitura: 'por_run' deixa a mesma configuracao cair em treino e teste (e o que a\n"
          "divisao aleatoria do notebook fazia nas planilhas de 56 linhas); 'por_config' nao.")
    return tabela


# ============================================================================
# 6. Main
# ============================================================================
def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--so", nargs="+", choices=["notebook", "cv", "grade", "vazamento"],
                    default=["notebook", "cv", "grade", "vazamento"])
    ap.add_argument("--rapido", action="store_true", help="5 folds x 1 repeticao")
    ap.add_argument("--folds", type=int, default=5)
    ap.add_argument("--repeticoes", type=int, default=5)
    ap.add_argument("--grid", action="store_true", help="inclui a replica fiel do GridSearchCV do notebook (lento)")
    ap.add_argument("--sem-catboost", action="store_true", help="pula as estrategias CatBoost (lentas)")
    ap.add_argument("--estrategias", nargs="+", default=None,
                    help="roda so estas estrategias (prefixos numericos, ex.: 1 6 24). Ensembles cujos componentes rodaram sao incluidos.")
    ap.add_argument("--sufixo", default="", help="sufixo dos CSVs de saida (para nao sobrescrever uma rodada anterior)")
    args = ap.parse_args()
    n_rep = 1 if args.rapido else args.repeticoes

    pd.set_option("display.width", 220)
    pd.set_option("display.max_columns", 40)

    df = carregar_longo()
    cod = Codificador(df)
    print(f"Base: {len(df)} leituras | {df['config_id'].nunique()} configuracoes | "
          f"{df['sensor'].nunique()} sensores | {df['area'].nunique()} areas")
    print("Sensores por area:", df.groupby("area")["sensor"].nunique().to_dict())
    print(f"Leituras acima do active_limit: {int((df.temp > df.limite).sum())} ({(df.temp > df.limite).mean():.1%})")
    if lgb is None:
        print("lightgbm nao instalado - estrategia 15 ignorada")
    if CatBoostRegressor is None:
        print("catboost nao instalado - estrategias 16-18 ignoradas")

    E = estrategias(incluir_grid=args.grid)
    if args.sem_catboost:
        E = {k: v for k, v in E.items() if "catboost" not in k}
    if args.estrategias:
        E = {k: v for k, v in E.items() if k.split("_")[0] in set(args.estrategias)}
    print("\nEstrategias:")
    for k, (_, g, d) in E.items():
        print(f"  {k:24s} {'[global] ' if g else ''}{d}")

    saidas = []
    if "notebook" in args.so:
        oof, por_area, geral = protocolo_notebook(df, cod, E)
        saidas += [(oof, "oof_p1"), (por_area, "p1_por_area"), (geral.reset_index(), "p1_geral")]
    if "cv" in args.so:
        oof, por_area, geral = protocolo_cv(df, cod, E, args.folds, n_rep)
        saidas += [(oof, "oof_p2"), (por_area, "p2_por_area"), (geral.reset_index(), "p2_geral")]
    if "grade" in args.so:
        oof, geral = estudo_grade(df, cod, args.folds, n_rep)
        saidas += [(geral.reset_index(), "p3_grade")]
    if "vazamento" in args.so:
        tabela = estudo_vazamento(args.folds, 3 if not args.rapido else 1)
        tabela.columns = ["_".join(c) for c in tabela.columns]
        saidas += [(tabela.reset_index(), "p4_vazamento")]

    for obj, nome in saidas:
        obj.to_csv(DATA / f"gb_experimentos_{nome}{args.sufixo}.csv", index=False)
    print(f"\nCSVs salvos em {DATA / 'gb_experimentos_*.csv'}")


if __name__ == "__main__":
    main()
