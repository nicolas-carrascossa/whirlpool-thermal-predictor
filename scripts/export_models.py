"""Treina e exporta os modelos por `key_area`, mais o manifesto que o back-end
e o mock do front-end consomem.

Reproduz o pipeline dos notebooks `notebooks/Random_for_regre.ipynb` e
`notebooks/Grad_Boosting_Regre.ipynb` — mesmas grafias canonicas, mesma
codificacao ordinal alfabetica, mesma semente (42), mesmo filtro de cobertura.
O script nao inventa nenhuma decisao de modelagem: ele materializa em disco o
que hoje so existe na memoria de quem roda os notebooks.

Roteamento area -> algoritmo (decisao da equipe, pelo desempenho medido em cada
area). O mapa vive AQUI e vai para o manifesto; nem o back-end nem o front-end
o escrevem a mao:

    Random Forest     -> Mainback, IPC Comp, IPC Cooling
    Gradient Boosting -> Coil Temps, CT Knobs, Main Vent Sys, Oven HMI

Dois pontos que o script trata explicitamente, porque errar neles produz numero
plausivel e errado, sem erro nenhum:

1. DICIONARIOS DE CODIFICACAO POR ARTEFATO. Cada modelo carrega o SEU
   dicionario no manifesto, e o roteador aplica o do modelo que vai responder.
   Um de-para global e inseguro por construcao: basta um algoritmo colapsar uma
   categoria para os codigos deixarem de coincidir, e o erro sai como numero
   plausivel, sem excecao nenhuma.

   Sobre `material_coil_support`: os notebooks divergiam — o de Gradient
   Boosting normalizava "Aluminium Plate" -> "Aluminium ", o de Random Forest
   nao. A normalizacao agora e aplicada NOS DOIS, seguindo a decisao registrada
   em `documents/hipotese_material_sem_correcao_E17.md` (o glossario oficial do
   parceiro documenta so 2 niveis; "Aluminium Plate" aparece em 1 run de 56 e
   nao tem confirmacao fisica). Sem isso, escolher esse valor fazia 4 areas
   tratarem como Aluminium, 2 usarem uma categoria treinada com um unico run e
   `IPC Comp` sumir da resposta.
2. CONSOLIDACAO DOS IGBTs. `notebooks/tratamento_final_dos_dados.ipynb` funde
   `IGBT 1`..`IGBT 16` numa unica coluna `IGBT` (media por linha). O modelo de
   `IPC Comp` preve 22 valores, mas a resposta da API precisa de 37
   `SensorPrediction`. O manifesto registra essa expansao em
   `sensor_expansion`, para o back-end replicar o valor nos 16 termopares em
   vez de adivinhar uma distribuicao. Os 16 compartilham o mesmo
   `active_limit_c` (110 C), entao `exceeds_limit` continua coerente entre eles
   — mas a "pior razao" da area deixa de distinguir um IGBT do outro.

Uso (a partir da raiz do repositorio):
    .\\venv\\Scripts\\python.exe scripts\\export_models.py
"""
from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
import sklearn
from joblib import dump
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import GridSearchCV, train_test_split
from sklearn.multioutput import MultiOutputRegressor

REPO_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = REPO_ROOT / "data"
MODEL_DIR = REPO_ROOT / "models"
FRONTEND_DATA_DIR = REPO_ROOT / "src" / "frontend" / "src" / "data"
REGISTRY_PATH = FRONTEND_DATA_DIR / "sensor_registry.json"
VARIABLE_OPTIONS_PATH = FRONTEND_DATA_DIR / "variable_options.json"

#: Versao do CONJUNTO de artefatos. Sobe a cada reexportacao que mude numeros.
MODEL_SET_VERSION = "models-1.0.0"

SEED = 42

VARIABLES = [
    "blower_direction",
    "housing",
    "board_position",
    "run_case",
    "losses",
    "deflector_hole",
    "material_coil_support",
]

#: Arquivo por area (o nome do CSV gerado por `tratamento_final_dos_dados.ipynb`).
AREA_FILES = {
    "Mainback": "mainback_data.csv",
    "Coil Temps": "coil_temps_data.csv",
    "Main Vent Sys": "main_vent_sys_data.csv",
    "IPC Cooling": "ipc_cooling_data.csv",
    "IPC Comp": "ipc_comp_data.csv",
    "CT Knobs": "ct_knobs_data.csv",
    "Oven HMI": "oven_hmi_data.csv",
}

#: Decisao da equipe: cada area e atendida por um algoritmo fixo.
AREA_ALGORITHMS = {
    "Mainback": "random_forest",
    "IPC Comp": "random_forest",
    "IPC Cooling": "random_forest",
    "Coil Temps": "gradient_boosting",
    "CT Knobs": "gradient_boosting",
    "Main Vent Sys": "gradient_boosting",
    "Oven HMI": "gradient_boosting",
}

ALGORITHM_LABELS = {
    "random_forest": "Random Forest",
    "gradient_boosting": "Gradient Boosting",
}

#: Padronizacao de grafias, copiada literalmente de cada notebook. Note a
#: divergencia deliberada em `material_coil_support` (ver docstring).
SPELLING_FIXES: dict[str, dict[str, dict[str, str]]] = {
    "random_forest": {
        "blower_direction": {"To back": "To Back", "To front": "To Front"},
        "losses": {"No losses": "No Losses"},
        "run_case": {
            "Broil Case 2": "Broil C2",
            "Broil Qual": "Broil Qualitative",
            "Qualitative": "Broil Qualitative",
        },
        "housing": {"Open - Updated": "Open"},
        # Mesma normalizacao do Gradient Boosting (ver docstring do modulo): o
        # notebook de RF ainda nao a aplicava, e manter os dois diferentes fazia
        # a mesma consulta significar coisas distintas de area para area.
        "material_coil_support": {"Aluminium Plate": "Aluminium "},
    },
    "gradient_boosting": {
        "blower_direction": {"To back": "To Back", "To front": "To Front"},
        "losses": {"No losses": "No Losses"},
        "run_case": {
            "Broil Case 2": "Broil C2",
            "Broil Qual": "Broil Qualitative",
            "Qualitative": "Broil Qualitative",
        },
        "housing": {"Open - Updated": "Open"},
        "material_coil_support": {"Aluminium Plate": "Aluminium "},
    },
}

#: Um termopar so vira alvo se medido em pelo menos esta fracao dos runs.
MIN_TARGET_COVERAGE = 0.50
#: Proporcoes do split dos notebooks.
TRAIN_SIZE = 0.70
TEST_OF_REMAINDER = 0.10 / 0.30
N_FOLDS = 3

RF_GRID = {
    "n_estimators": [100, 300],
    "max_depth": [3, 5, None],
    "min_samples_leaf": [1, 2],
    "max_features": ["sqrt", None],
}
GB_GRID = {
    "estimator__n_estimators": [100, 300],
    "estimator__learning_rate": [0.05, 0.1],
    "estimator__max_depth": [2, 3],
    "estimator__subsample": [1.0, 0.8],
}

IGBT_PATTERN = re.compile(r"^IGBT (?:[1-9]|1[0-6])$")
#: Nome da coluna consolidada gerada pelo notebook de tratamento final.
IGBT_COLUMN = "IGBT"


# --------------------------------------------------------------------------- #
# Preparacao — espelha `identificar_alvos` / `filtrar_alvos_por_cobertura` /
# `padronizar_categorias` / `codificar_ordinal` dos notebooks.
# --------------------------------------------------------------------------- #


def target_columns(df: pd.DataFrame) -> list[str]:
    """Colunas-alvo validas: nem configuracao, nem coluna sem nome, nem vazia."""
    out = []
    for column in df.columns:
        if column in VARIABLES:
            continue
        if str(column).startswith("Unnamed:") or not str(column).strip():
            continue
        if df[column].isna().all():
            continue
        out.append(column)
    return out


def consolidate_igbts(df: pd.DataFrame) -> tuple[pd.DataFrame, list[str]]:
    """Funde `IGBT 1`..`IGBT 16` numa coluna `IGBT` (media por linha).

    Reproduz a celula "Converter IGBTs 1 a 16 por apenas 1" do notebook de
    tratamento final. Idempotente: se o CSV ja veio consolidado, nao faz nada.
    """
    igbt_columns = [c for c in df.columns if IGBT_PATTERN.fullmatch(str(c))]
    if not igbt_columns:
        return df, []
    df = df.copy()
    mean_igbt = df[igbt_columns].apply(pd.to_numeric, errors="coerce").mean(axis=1).round(2)
    position = min(df.columns.get_loc(c) for c in igbt_columns)
    df = df.drop(columns=igbt_columns)
    df.insert(position, IGBT_COLUMN, mean_igbt)
    return df, igbt_columns


def standardize(df: pd.DataFrame, algorithm: str) -> pd.DataFrame:
    """Aplica as grafias canonicas DO ALGORITMO e materializa nulos."""
    df = df.copy()
    for variable, fixes in SPELLING_FIXES[algorithm].items():
        if variable in df.columns:
            df[variable] = df[variable].replace(fixes)
    for variable in VARIABLES:
        df[variable] = df[variable].fillna("Nao Informado").astype(str)
    return df


def encoding_for(df: pd.DataFrame) -> dict[str, dict[str, int]]:
    """Codificacao ordinal por ordem alfabetica — a mesma dos notebooks."""
    return {
        variable: {category: index for index, category in enumerate(sorted(df[variable].unique()))}
        for variable in VARIABLES
    }


def canonical_to_training(
    encoding: dict[str, dict[str, int]],
    algorithm: str,
    options: dict[str, Any],
) -> tuple[dict[str, dict[str, str]], dict[str, list[str]]]:
    """Tabela explicita `opcao canonica da API -> categoria de treino`.

    As duas normalizacoes sao INVERSAS entre si e nao da para deduzi-las em
    runtime sem heuristica: `scripts/build_registry.py` canonicaliza
    "To Back" -> "To back" e remove espacos nas pontas para a API, enquanto os
    notebooks canonicalizam "To back" -> "To Back" e mantem "Aluminium " com o
    espaco. Esta funcao resolve a correspondencia UMA VEZ, na exportacao, e
    grava o resultado no manifesto — o back-end so consulta a tabela.

    Nem toda opcao canonica existe no dicionario de uma area: o `dropna` por
    area remove runs, e com eles categorias inteiras. Essas opcoes ficam FORA
    da tabela e sao devolvidas em `unmapped`, para o manifesto registrar quais
    sao — em runtime elas viram 422, nunca um chute silencioso.
    """
    fixes = SPELLING_FIXES[algorithm]
    table: dict[str, dict[str, str]] = {}
    unmatched: dict[str, list[str]] = {}
    for variable in VARIABLES:
        categories = list(encoding[variable])
        by_loose = {c.strip().casefold(): c for c in categories}
        mapping: dict[str, str] = {}
        for option in options.get(variable, {}).get("options", []):
            fixed = fixes.get(variable, {}).get(option, option)
            if fixed in categories:
                mapping[option] = fixed
                continue
            loose = by_loose.get(fixed.strip().casefold())
            if loose is not None:
                mapping[option] = loose
                continue
            unmatched.setdefault(variable, []).append(option)
        # "Nao Informado" e materializado no treino, mas nao e opcao canonica:
        # mantem a identidade para o caso de chegar do proprio manifesto.
        if "Nao Informado" in categories:
            mapping.setdefault("Nao Informado", "Nao Informado")
        table[variable] = mapping
    return table, unmatched


def encode(df: pd.DataFrame, encoding: dict[str, dict[str, int]]) -> pd.DataFrame:
    X = df[VARIABLES].copy()
    for variable in VARIABLES:
        X[variable] = X[variable].map(encoding[variable])
    missing = X.isna().any()
    if missing.any():
        broken = [v for v in VARIABLES if missing[v]]
        raise ValueError(f"categoria fora do dicionario em {broken}")
    return X.astype(int)


# --------------------------------------------------------------------------- #
# Treino
# --------------------------------------------------------------------------- #


#: Variaveis que entram no rotulo de um ensaio. Sao as tres com maior
#: importancia media nos 7 modelos — as que de fato distinguem um run do outro
#: para quem le o tooltip. Montado aqui, e nao no back-end nem no front-end,
#: para os dois lerem exatamente o mesmo texto.
LABEL_VARIABLES = ["run_case", "housing", "blower_direction"]


def run_label(config: dict[str, str]) -> str:
    """Rotulo curto de um ensaio, na grafia de treino."""
    return " · ".join(str(config[v]).strip() for v in LABEL_VARIABLES)


def fit_area(area: str, df: pd.DataFrame, algorithm: str) -> dict[str, Any]:
    """Treina o modelo de uma area e devolve artefato + metricas + dicionario."""
    targets = target_columns(df)
    kept = [t for t in targets if df[t].notna().mean() >= MIN_TARGET_COVERAGE]
    dropped = [t for t in targets if t not in kept]
    if not kept:
        raise ValueError(f"{area}: nenhum termopar com cobertura >= {MIN_TARGET_COVERAGE:.0%}")

    clean = df.dropna(subset=kept)
    clean = standardize(clean, algorithm)
    encoding = encoding_for(clean)
    X = encode(clean, encoding)
    Y = clean[kept]

    X_train, X_rest, Y_train, Y_rest = train_test_split(X, Y, train_size=TRAIN_SIZE, random_state=SEED)
    X_test, _, Y_test, _ = train_test_split(X_rest, Y_rest, test_size=TEST_OF_REMAINDER, random_state=SEED)

    folds = max(2, min(N_FOLDS, len(X_train)))
    if algorithm == "random_forest":
        search = GridSearchCV(
            RandomForestRegressor(random_state=SEED, n_jobs=-1),
            RF_GRID,
            cv=folds,
            scoring="neg_mean_absolute_error",
            n_jobs=-1,
        )
    else:
        search = GridSearchCV(
            MultiOutputRegressor(GradientBoostingRegressor(random_state=SEED), n_jobs=1),
            GB_GRID,
            cv=folds,
            scoring="neg_mean_absolute_error",
            n_jobs=-1,
        )
    # Treina sobre array, nao DataFrame: o modelo fica sem `feature_names_in_`,
    # e o back-end (que nao depende de pandas) pode predizer a partir de uma
    # lista sem o aviso de "X does not have valid feature names". A ordem das
    # colunas e sempre `VARIABLES`.
    search.fit(X_train.to_numpy(), Y_train.to_numpy())
    model = search.best_estimator_

    predicted = model.predict(X_test.to_numpy())
    actual = Y_test.values
    errors = predicted - actual
    abs_pct = np.abs(errors / actual)

    metrics = {
        "mae": float(np.mean(np.abs(errors))),
        "rmse": float(np.sqrt(np.mean(errors**2))),
        "r2": float(np.mean([r2_score(actual[:, i], predicted[:, i]) for i in range(actual.shape[1])])),
        "mape_pct": float(np.mean(abs_pct) * 100),
        "within_ten_pct_rate": float(np.mean(abs_pct <= 0.10)),
        # Margem por sensor: o MAE daquele termopar, nao o da area — e o que
        # `SensorPrediction.error_margin_c` precisa informar.
        "mae_by_target": {
            target: float(mean_absolute_error(actual[:, i], predicted[:, i]))
            for i, target in enumerate(kept)
        },
        "rmse_by_target": {
            target: float(np.sqrt(mean_squared_error(actual[:, i], predicted[:, i])))
            for i, target in enumerate(kept)
        },
        "n_train": int(len(X_train)),
        "n_test": int(len(X_test)),
    }

    importance = feature_importance_of(model, algorithm)

    # Pares previsto/real do conjunto de teste, um por (ensaio, coluna-alvo).
    # Sao os unicos valores REAIS medidos que o produto tem: a dispersao e o
    # mapa de calor da aba de metricas leem daqui, nao de dado sintetico.
    #
    # Nao se expande sobre os 16 IGBTs fundidos aqui. Replicar uma observacao
    # 16 vezes inventaria amostras independentes e achataria mediana, p90 e
    # maximo do mapa de calor. A expansao para termopares acontece na resposta
    # da API, onde e explicitamente um valor compartilhado.
    validation = {
        "runs": [
            {"label": run_label(config), "config": config}
            for config in clean.loc[X_test.index, VARIABLES].to_dict("records")
        ],
        "points": [
            {
                "target": target,
                "run": run,
                "actual_c": round(float(actual[run, i]), 2),
                "predicted_c": round(float(predicted[run, i]), 2),
            }
            for run in range(actual.shape[0])
            for i, target in enumerate(kept)
        ],
    }

    return {
        "model": model,
        "validation": validation,
        "targets": kept,
        "dropped_targets": dropped,
        "encoding": encoding,
        "metrics": metrics,
        "feature_importance": importance,
        "best_params": {k.replace("estimator__", ""): v for k, v in search.best_params_.items()},
        "train_configs": clean[VARIABLES].drop_duplicates().to_dict("records"),
    }


def resolve_validation(
    validation: dict[str, Any], expansion: dict[str, list[int]], registry: list[dict]
) -> dict[str, Any]:
    """Liga cada par previsto/real aos termopares que a coluna-alvo cobre.

    A resolucao acontece AQUI, e nao em runtime, para a API e o mock offline
    servirem exatamente os mesmos pontos — a aba de metricas nao pode contar uma
    historia com o back-end ligado e outra sem.
    """
    by_number = {s["tc_number"]: s for s in registry}
    points = []
    for point in validation["points"]:
        numbers = expansion.get(point["target"], [])
        first = by_number.get(numbers[0]) if numbers else None
        points.append(
            {
                **point,
                "tc_numbers": numbers,
                # Coluna fundida: o nome do termopar individual mentiria, porque
                # o valor e um so para os 16.
                "tc_name": (
                    f"{point['target']} (x{len(numbers)})"
                    if len(numbers) > 1
                    else (first or {}).get("tc_name", point["target"])
                ),
                "active_limit_c": (first or {}).get("active_limit_c"),
            }
        )
    return {"runs": validation["runs"], "points": points}


def feature_importance_of(model: Any, algorithm: str) -> dict[str, float]:
    """Importancia media das 7 variaveis, normalizada para somar 1."""
    if algorithm == "random_forest":
        values = np.asarray(model.feature_importances_, dtype=float)
    else:
        # MultiOutputRegressor: um GBR por termopar, cada um com seu vetor.
        values = np.mean([e.feature_importances_ for e in model.estimators_], axis=0)
    total = values.sum() or 1.0
    return {variable: float(round(values[i] / total, 6)) for i, variable in enumerate(VARIABLES)}


# --------------------------------------------------------------------------- #
# Saida
# --------------------------------------------------------------------------- #


def sensor_expansion_for(area: str, targets: list[str], registry: list[dict]) -> dict[str, list[int]]:
    """Mapa `coluna-alvo -> tc_number` cobertos por ela.

    Normalmente 1:1. A excecao e a coluna `IGBT` de `IPC Comp`, que cobre os 16
    termopares `IGBT 1`..`IGBT 16` consolidados no tratamento final.
    """
    by_name: dict[str, list[int]] = {}
    for sensor in registry:
        if sensor["key_area"] != area:
            continue
        by_name.setdefault(sensor["tc_name"].strip(), []).append(sensor["tc_number"])

    expansion: dict[str, list[int]] = {}
    for target in targets:
        name = str(target).strip()
        if name == IGBT_COLUMN:
            numbers = sorted(n for key, nums in by_name.items() if IGBT_PATTERN.fullmatch(key) for n in nums)
        else:
            numbers = sorted(by_name.get(name, []))
        expansion[target] = numbers
    return expansion


def write_json(obj: Any, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(obj, handle, ensure_ascii=False, indent=2, sort_keys=True)
        handle.write("\n")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model-dir", type=Path, default=MODEL_DIR)
    parser.add_argument("--version", default=MODEL_SET_VERSION)
    parser.add_argument(
        "--skip-frontend",
        action="store_true",
        help="nao regravar src/frontend/src/data/model_manifest.json",
    )
    args = parser.parse_args()

    registry = json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))
    variable_options = json.loads(VARIABLE_OPTIONS_PATH.read_text(encoding="utf-8"))
    trained_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    args.model_dir.mkdir(parents=True, exist_ok=True)

    areas: dict[str, Any] = {}
    print(f"sklearn {sklearn.__version__} | semente {SEED} | conjunto {args.version}\n")
    print(f"{'area':15s} {'algoritmo':18s} {'linhas':>6s} {'alvos':>5s} {'MAE':>7s} {'MAPE':>7s} {'R2':>6s}")

    for area, filename in AREA_FILES.items():
        algorithm = AREA_ALGORITHMS[area]
        df = pd.read_csv(DATA_DIR / filename)
        df, fused = consolidate_igbts(df)
        result = fit_area(area, df, algorithm)

        artifact = args.model_dir / f"{algorithm}__{area.lower().replace(' ', '_')}.joblib"
        dump(result["model"], artifact)

        translation, unmapped = canonical_to_training(
            result["encoding"], algorithm, variable_options
        )
        if unmapped:
            total = sum(len(v) for v in unmapped.values())
            print(f"  aviso: {area} nao viu {total} opcao(oes) canonica(s) no treino: "
                  + "; ".join(f"{k}={v}" for k, v in unmapped.items()))

        expansion = sensor_expansion_for(area, result["targets"], registry)
        uncovered = [t for t, numbers in expansion.items() if not numbers]
        if uncovered:
            raise SystemExit(f"{area}: alvos sem termopar correspondente no registry: {uncovered}")

        m = result["metrics"]
        areas[area] = {
            "algorithm": algorithm,
            "artifact": artifact.name,
            "targets": result["targets"],
            "dropped_targets": result["dropped_targets"],
            "fused_igbt_columns": fused,
            "sensor_expansion": expansion,
            "encoding": result["encoding"],
            "spelling_fixes": SPELLING_FIXES[algorithm],
            "canonical_to_training": translation,
            # Opcoes canonicas que esta area nunca viu no treino: pedidas em
            # runtime, viram 422 em vez de predicao inventada.
            "unmapped_options": unmapped,
            "best_params": result["best_params"],
            "metrics": m,
            "feature_importance": result["feature_importance"],
            "train_configs": result["train_configs"],
            "validation": resolve_validation(result["validation"], expansion, registry),
        }
        print(
            f"{area:15s} {ALGORITHM_LABELS[algorithm]:18s} {len(df):6d} {len(result['targets']):5d} "
            f"{m['mae']:7.2f} {m['mape_pct']:6.2f}% {m['r2']:6.2f}"
        )

    manifest = {
        "model_set_version": args.version,
        "contract_version": "1.2.0",
        "trained_at": trained_at,
        "sklearn_version": sklearn.__version__,
        "seed": SEED,
        "variables": VARIABLES,
        "area_algorithms": AREA_ALGORITHMS,
        "algorithms": {
            code: {
                "code": code,
                "label_pt": label,
                "model_version": f"{code}-{args.version.split('-')[-1]}",
                "trained_at": trained_at,
            }
            for code, label in ALGORITHM_LABELS.items()
        },
        "areas": areas,
    }

    write_json(manifest, args.model_dir / "manifest.json")
    print(f"\nmanifesto: {args.model_dir / 'manifest.json'}")

    if not args.skip_frontend:
        # Recorte do manifesto para o mock local: sem artefato, sem dicionario
        # de codificacao (o mock nao roda modelo), so o que a interface precisa.
        front = {
            "model_set_version": args.version,
            "trained_at": trained_at,
            "area_algorithms": AREA_ALGORITHMS,
            "algorithms": manifest["algorithms"],
            "metrics_by_area": {
                area: {
                    "algorithm": data["algorithm"],
                    "mae": round(data["metrics"]["mae"], 4),
                    "rmse": round(data["metrics"]["rmse"], 4),
                    "r2": round(data["metrics"]["r2"], 4),
                    "mape_pct": round(data["metrics"]["mape_pct"], 4),
                    "within_ten_pct_rate": round(data["metrics"]["within_ten_pct_rate"], 4),
                    "feature_importance": data["feature_importance"],
                    # Pares previsto/real reais, tambem no modo offline: a aba de
                    # metricas nao volta a inventar numero quando a API cai. So o
                    # rotulo do ensaio viaja; a config crua nao serve ao front.
                    "validation": {
                        "runs": [{"label": r["label"]} for r in data["validation"]["runs"]],
                        "points": data["validation"]["points"],
                    },
                }
                for area, data in areas.items()
            },
        }
        write_json(front, FRONTEND_DATA_DIR / "model_manifest.json")
        print(f"front-end:  {FRONTEND_DATA_DIR / 'model_manifest.json'}")


if __name__ == "__main__":
    main()
