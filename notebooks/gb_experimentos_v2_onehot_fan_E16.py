"""
gb_experimentos_v2_onehot_fan_E16.py - E16: one-hot so em fan_level, dentro do F3

Pergunta: o ordinal de fan_level (NA=0, low_or_on=1, medium_or_high=2) engana o
modelo, porque NA nao e "menos ventilador que low", e "sem informacao" - nao
deveria estar na mesma reta numerica dos niveis reais. One-hot so nessa coluna
(2 colunas binarias: fan_low_or_on, fan_medium_or_high; NA fica implicito
quando as duas sao 0) resolve isso sem pagar o custo de dimensionalidade de
fazer one-hot nas 7 variaveis todas (que ja foi testado na bancada antiga e
empatou tecnicamente com ordinal, mas la a dimensionalidade explode por causa
de `losses`, 14 categorias).

Comparacao 1:1 direta: mesmas 36 configs do F3 nos dois lados (so a
codificacao de fan_level muda, a construcao das configs nao), entao nao
precisa da visao "limpa/reconciliada" do E13 - dá pra comparar direto por
config_id, igual ao E15.

Uso:
    .venv\\Scripts\\python.exe notebooks\\gb_experimentos_v2_onehot_fan_E16.py
"""

from __future__ import annotations

import sys
import time
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.multioutput import MultiOutputRegressor

sys.path.insert(0, str(Path(__file__).parent))
import gb_experimentos as gb  # noqa: E402
import gb_experimentos_v2 as v2  # noqa: E402
import gb_experimentos_v2_fan as fan  # noqa: E402

RAIZ = gb.RAIZ
DATA = gb.DATA
SEMENTE = gb.SEMENTE
VARS_7 = list(gb.VARIAVEIS)
NIVEIS_FAN = ["low_or_on", "medium_or_high"]  # NA fica implicito (as duas = 0)


class CodMistoFanOnehot:
    """Ordinal nas 7 variaveis originais + one-hot (2 colunas) so em fan_level."""

    def __init__(self, df_cfg: pd.DataFrame):
        self.cod_base = v2.CodVariant(df_cfg, VARS_7)

    def X(self, configs_df: pd.DataFrame) -> pd.DataFrame:
        X = self.cod_base.X(configs_df)
        for nivel in NIVEIS_FAN:
            X[f"fan_{nivel}"] = (configs_df["fan_level"].astype(str) == nivel).astype(int).values
        return X


def montar_df_cfg_f3():
    pp, limites = v2.carregar_base_runs_E2()
    pp["fan_level"] = pp["reason"].apply(fan.parse_fan_level_fixed)
    pp_c = v2.relabel_material(pp)
    pp3 = pp_c.copy()
    pp3["fan_level"] = fan.colapsar_fan3(pp3["fan_level"])
    df_cfg = v2.agregar_por_config(pp3, VARS_7 + ["fan_level"], limites)
    return df_cfg


def rodar_logo(df_cfg: pd.DataFrame, cod, nome: str) -> pd.DataFrame:
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
            configs_tr = tr.drop_duplicates("config_id").set_index("config_id")
            Y_tr = tr.pivot_table(index="config_id", columns="sensor", values="temp", aggfunc="mean")
            configs_tr = configs_tr.loc[Y_tr.index]
            X_tr = cod.X(configs_tr)
            Y_fill = Y_tr.fillna(Y_tr.mean())
            modelo = MultiOutputRegressor(gb.gbr(**gb.PARAMS_LR03))
            modelo.fit(X_tr.values, Y_fill.values)

            configs_te = te.drop_duplicates("config_id").set_index("config_id")
            X_te = cod.X(configs_te)
            P = pd.DataFrame(modelo.predict(X_te.values), index=X_te.index, columns=Y_tr.columns)
            media_geral = Y_fill.values.mean()
            pred = np.array([
                P.at[c, s] if s in P.columns else media_geral
                for c, s in zip(te["config_id"], te["sensor"])
            ])
            registros.append(pd.DataFrame({
                "estrategia": "gb_lr03", "variante": nome,
                "area": te["area"].values, "sensor": te["sensor"].values,
                "config_id": te["config_id"].values, "real": te["temp"].values,
                "pred": pred, "limite": te["limite"].values, "fold": i,
            }))
    return pd.concat(registros, ignore_index=True)


def main():
    t0 = time.time()
    pd.set_option("display.width", 220)
    df_cfg = montar_df_cfg_f3()
    print(f"n_configs (F3): {df_cfg['config_id'].nunique()}")

    cod_ordinal = v2.CodVariant(df_cfg, VARS_7 + ["fan_level"])
    cod_onehot = CodMistoFanOnehot(df_cfg)

    print("\n--- LOGO F3 (fan_level ordinal, referencia desta comparacao) ---")
    oof_ord = rodar_logo(df_cfg, cod_ordinal, "F3_ordinal")
    print(gb.resumo_por_area(oof_ord)[["area", "MAE", "R2_mediana"]].round(3).to_string(index=False))

    print("\n--- LOGO F3-onehot (fan_level em 2 colunas binarias, resto ordinal) ---")
    oof_oh = rodar_logo(df_cfg, cod_onehot, "F3_onehot")
    print(gb.resumo_por_area(oof_oh)[["area", "MAE", "R2_mediana"]].round(3).to_string(index=False))

    oof_all = pd.concat([oof_ord, oof_oh], ignore_index=True)
    oof_all.to_csv(DATA / "gb_v2_E16_oof.csv", index=False)

    d = oof_ord.merge(
        oof_oh[["area", "sensor", "config_id", "pred"]].rename(columns={"pred": "pred_oh"}),
        on=["area", "sensor", "config_id"],
    )
    d["ae_R"] = (d["real"] - d["pred"]).abs()
    d["ae_V"] = (d["real"] - d["pred_oh"]).abs()
    ic = fan.ic_bootstrap_generico(d, "config_id")
    ic = ic.rename(columns={"MAE_R": "MAE_F3_ordinal", "MAE_V": "MAE_F3_onehot"})
    ic.to_csv(DATA / "gb_v2_E16_ic.csv", index=False)
    print("\nIC95% (F3-onehot - F3-ordinal), por area, negativo = onehot melhora:")
    print(ic.round(3).to_string(index=False))

    print(f"\ntempo total: {time.time() - t0:.0f}s")
    print("CSVs salvos: gb_v2_E16_oof.csv, gb_v2_E16_ic.csv")


if __name__ == "__main__":
    main()
