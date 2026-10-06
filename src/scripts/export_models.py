"""Treina e exporta os modelos por `key_area`, mais o manifesto que o back-end
e o mock do front-end consomem.

Materializa em disco a VERSAO ATUAL descrita na Secao 4.4 da documentacao —
a mesma que fundamentou o roteamento por regiao da Secao 4.4.4:

- base: `data/<area>_data.csv`, 32 configuracoes distintas por regiao (replicas
  ja unificadas e `IGBT 1`..`IGBT 16` ja fundidos pelo
  `notebooks/tratamento_final_dos_dados.ipynb`);
- padronizacao de categorias de `notebooks/comparacao_modelos.ipynb`: primeiro
  normaliza espacos, depois aplica as grafias canonicas (inclusive
  "Aluminium Plate" -> "Aluminium");
- codificacao one-hot (uma coluna 0/1 por categoria observada);
- Random Forest com o estimador hibrido (`app.hybrid_forest`) e os
  hiperparametros por regiao escolhidos no espaco one-hot
  (`Random_for_regre.ipynb`, Celula 25b); Gradient Boosting com os
  hiperparametros oficiais fixos (`Grad_Boosting_Regre.ipynb`, Secao 8);
- metricas por validacao Leave-One-Group-Out (grupo = configuracao), e o
  artefato final treinado com TODAS as configuracoes da regiao.

Nao ha busca de hiperparametros aqui: eles ja foram escolhidos nos notebooks, e
repetir a busca sobre o mesmo LOGO que depois e reportado deixaria a metrica
otimista.

Roteamento area -> algoritmo (Secao 4.4.4). O mapa vive AQUI e vai para o
manifesto; nem o back-end nem o front-end o escrevem a mao:

    Random Forest     -> Mainback, IPC Comp, IPC Cooling
    Gradient Boosting -> Coil Temps, CT Knobs, Main Vent Sys, Oven HMI

Dois pontos que o script trata explicitamente, porque errar neles produz numero
plausivel e errado, sem erro nenhum:

1. COLUNAS ONE-HOT POR ARTEFATO. Cada modelo carrega no manifesto a SUA lista
   ordenada de colunas (`feature_columns`), e o back-end monta a linha de
   entrada a partir dela. Uma categoria a mais ou a menos numa area desloca
   todas as colunas seguintes; a lista explicita torna isso impossivel.
2. SEM DESCARTE SILENCIOSO DE ENSAIOS. A versao anterior fazia
   `dropna(subset=alvos)` e perdia ensaios inteiros quando faltava um sensor —
   o modelo de IPC Comp chegou a ser treinado com 16 ensaios. Aqui um alvo com
   leitura faltante interrompe a exportacao com a lista de lacunas, em vez de
   encolher a base sem aviso.

A fusao dos IGBTs segue a do tratamento final: o modelo de `IPC Comp` preve uma
coluna `IGBT`, e o manifesto registra em `sensor_expansion` que ela cobre os 16
termopares `IGBT 1`..`IGBT 16`, para o back-end replicar o valor.

Uso (a partir da raiz do repositorio):
    .\\.venv\\Scripts\\python.exe scripts\\export_models.py
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
import sklearn
from joblib import dump
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import LeaveOneGroupOut
from sklearn.multioutput import MultiOutputRegressor

REPO_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = REPO_ROOT / "data"
MODEL_DIR = REPO_ROOT / "src" / "backend" / "models"
# Catalogo servido pela API. O manifesto recortado tambem e escrito aqui: o
# front-end o consome pela API em runtime e so o importa em build/teste, para
# alimentar o `LocalMockSource`.
BACKEND_DIR = REPO_ROOT / "src" / "backend"
BACKEND_DATA_DIR = BACKEND_DIR / "data"
REGISTRY_PATH = BACKEND_DATA_DIR / "sensor_registry.json"
VARIABLE_OPTIONS_PATH = BACKEND_DATA_DIR / "variable_options.json"

# O artefato do Random Forest guarda o caminho de importacao da classe; ele tem
# de ser o mesmo que o back-end enxerga (`app.hybrid_forest`).
sys.path.insert(0, str(BACKEND_DIR))
from app.hybrid_forest import HybridForestRegressor  # noqa: E402

#: Versao do CONJUNTO de artefatos. Sobe a cada reexportacao que mude numeros.
MODEL_SET_VERSION = "models-2.0.0"

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

#: Decisao da equipe (Secao 4.4.4): cada area e atendida por um algoritmo fixo.
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

#: Grafias canonicas, as mesmas de `comparacao_modelos.ipynb` (Secao 1). Sao
#: aplicadas DEPOIS da normalizacao de espacos (ver `standardize`).
SPELLING_FIXES: dict[str, dict[str, str]] = {
    "blower_direction": {"To back": "To Back", "To front": "To Front"},
    "losses": {"No losses": "No Losses"},
    "run_case": {
        "Broil Case 2": "Broil C2",
        "Broil Qual": "Broil Qualitative",
        "Qualitative": "Broil Qualitative",
    },
    "housing": {"Open - Updated": "Open"},
    # Glossario do parceiro documenta so 2 niveis; "Aluminium Plate" aparece em
    # 1 run (ver `documents/extras/hipotese_material_sem_correcao_E17.md`).
    "material_coil_support": {"Aluminium Plate": "Aluminium"},
}

#: Um termopar so vira alvo se medido em pelo menos esta fracao dos runs.
MIN_TARGET_COVERAGE = 0.50

#: Hiperparametros do Random Forest por area, escolhidos por `GridSearchCV` no
#: espaco one-hot (`Random_for_regre.ipynb`, Celula 25b) — os mesmos de
#: `comparacao_modelos.ipynb` (`PARAMS_RF`). So as areas roteadas ao RF.
RF_PARAMS = {
    "Mainback": dict(n_estimators=100, max_depth=8, min_samples_leaf=1, max_features=None),
    "IPC Comp": dict(n_estimators=300, max_depth=5, min_samples_leaf=1, max_features="sqrt"),
    "IPC Cooling": dict(n_estimators=100, max_depth=None, min_samples_leaf=1, max_features=None),
}
#: Hiperparametros oficiais do Gradient Boosting, fixos entre areas
#: (`Grad_Boosting_Regre.ipynb`, Secao 8; confirmados por busca em LOGO).
GB_PARAMS = dict(n_estimators=100, learning_rate=0.03, max_depth=3, subsample=0.8)

IGBT_PATTERN = re.compile(r"^IGBT (?:[1-9]|1[0-6])$")
#: Nome da coluna consolidada gerada pelo notebook de tratamento final.
IGBT_COLUMN = "IGBT"


# --------------------------------------------------------------------------- #
# Preparacao — espelha `identificar_alvos` / `filtrar_alvos_por_cobertura` /
# `padronizar_categorias` / `codificar_onehot` de `comparacao_modelos.ipynb`.
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


def normalize_spaces(value: Any) -> Any:
    """Remove espacos nas bordas e colapsa espacos internos repetidos."""
    return " ".join(value.split()) if isinstance(value, str) else value


def standardize(df: pd.DataFrame) -> pd.DataFrame:
    """Normaliza espacos, aplica as grafias canonicas e materializa nulos.

    A ordem importa: o dado bruto tem "Aluminium " (com espaco) e
    "Aluminium Plate", que vira "Aluminium". Corrigindo antes de normalizar,
    as duas grafias viram duas colunas one-hot para a mesma categoria.
    """
    df = df.copy()
    for variable in VARIABLES:
        df[variable] = df[variable].apply(normalize_spaces)
    for variable, fixes in SPELLING_FIXES.items():
        df[variable] = df[variable].replace(fixes)
    for variable in VARIABLES:
        df[variable] = df[variable].fillna("Nao Informado").astype(str)
    return df


def categories_for(df: pd.DataFrame) -> dict[str, list[str]]:
    """Categorias observadas por variavel, em ordem alfabetica."""
    return {variable: sorted(df[variable].unique()) for variable in VARIABLES}


def feature_columns_for(categories: dict[str, list[str]]) -> list[list[str]]:
    """Colunas one-hot `[variavel, categoria]`, na ordem do `pd.get_dummies`."""
    return [[variable, category] for variable in VARIABLES for category in categories[variable]]


def encode(df: pd.DataFrame, columns: list[list[str]]) -> np.ndarray:
    """Uma coluna 0/1 por `[variavel, categoria]`, na ordem de `columns`."""
    return np.column_stack(
        [(df[variable] == category).to_numpy(dtype=int) for variable, category in columns]
    )


def canonical_to_training(
    categories: dict[str, list[str]],
    options: dict[str, Any],
) -> tuple[dict[str, dict[str, str]], dict[str, list[str]]]:
    """Tabela explicita `opcao canonica da API -> categoria de treino`.

    As duas normalizacoes nao coincidem e nao da para deduzi-las em runtime sem
    heuristica: `src/scripts/build_registry.py` canonicaliza "To Back" -> "To back"
    para a API, enquanto o treino usa "To Back". Esta funcao resolve a
    correspondencia UMA VEZ, na exportacao, e grava o resultado no manifesto —
    o back-end so consulta a tabela.

    Opcoes canonicas que a area nunca viu no treino ficam FORA da tabela e sao
    devolvidas em `unmapped`; em runtime elas viram 422, nunca um chute.
    """
    table: dict[str, dict[str, str]] = {}
    unmatched: dict[str, list[str]] = {}
    for variable in VARIABLES:
        known = categories[variable]
        by_loose = {normalize_spaces(c).casefold(): c for c in known}
        mapping: dict[str, str] = {}
        for option in options.get(variable, {}).get("options", []):
            fixed = SPELLING_FIXES.get(variable, {}).get(normalize_spaces(option), option)
            match = by_loose.get(normalize_spaces(fixed).casefold())
            if match is None:
                unmatched.setdefault(variable, []).append(option)
            else:
                mapping[option] = match
        # "Nao Informado" e materializado no treino, mas nao e opcao canonica:
        # mantem a identidade para o caso de chegar do proprio manifesto.
        if "Nao Informado" in known:
            mapping.setdefault("Nao Informado", "Nao Informado")
        table[variable] = mapping
    return table, unmatched


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


def build_model(area: str, algorithm: str) -> Any:
    """Estimador novo, sem treino — um por fold do LOGO e um para o artefato."""
    if algorithm == "random_forest":
        return HybridForestRegressor(random_state=SEED, n_jobs=-1, **RF_PARAMS[area])
    return MultiOutputRegressor(GradientBoostingRegressor(random_state=SEED, **GB_PARAMS), n_jobs=1)


def logo_predictions(area: str, algorithm: str, X: np.ndarray, Y: np.ndarray, groups: np.ndarray) -> np.ndarray:
    """Previsoes fora da amostra: cada configuracao prevista por um modelo que nao a viu."""
    predicted = np.empty_like(Y, dtype=float)
    for train, test in LeaveOneGroupOut().split(X, Y, groups=groups):
        model = build_model(area, algorithm).fit(X[train], Y[train])
        predicted[test] = model.predict(X[test])
    return predicted


def metrics_of(actual: np.ndarray, predicted: np.ndarray, targets: list[str]) -> dict[str, Any]:
    """Metricas da area e por termopar, sobre as previsoes do LOGO.

    Agregacao da area: MAE, RMSE, MAPE e "dentro de 10%" sobre todos os pares
    (termopar, configuracao); R² pela MEDIANA entre termopares, a convencao
    unica adotada em `comparacao_modelos.ipynb` (Secao 3) — um termopar quase
    constante tem R² com denominador perto de zero e dominaria a media. A
    media tambem vai para o manifesto, em `r2_mean`.
    """
    errors = predicted - actual
    abs_pct = np.abs(errors / actual)
    ss_res = (errors**2).sum(axis=0)
    ss_tot = ((actual - actual.mean(axis=0)) ** 2).sum(axis=0)
    r2 = np.where(ss_tot > 0, 1 - ss_res / np.where(ss_tot > 0, ss_tot, 1), np.nan)
    return {
        "mae": float(np.mean(np.abs(errors))),
        "rmse": float(np.sqrt(np.mean(errors**2))),
        "r2": float(np.nanmedian(r2)),
        "r2_mean": float(np.nanmean(r2)),
        "mape_pct": float(np.mean(abs_pct) * 100),
        "within_ten_pct_rate": float(np.mean(abs_pct <= 0.10)),
        # Margem por sensor: o MAE daquele termopar, nao o da area — e o que
        # `SensorPrediction.error_margin_c` precisa informar.
        "mae_by_target": {t: float(np.mean(np.abs(errors[:, i]))) for i, t in enumerate(targets)},
        "rmse_by_target": {t: float(np.sqrt(np.mean(errors[:, i] ** 2))) for i, t in enumerate(targets)},
        "r2_by_target": {t: (None if np.isnan(r2[i]) else float(r2[i])) for i, t in enumerate(targets)},
    }


def fit_area(area: str, df: pd.DataFrame, algorithm: str) -> dict[str, Any]:
    """Valida por LOGO, treina o artefato final e devolve metricas + codificacao."""
    targets = target_columns(df)
    kept = [t for t in targets if df[t].notna().mean() >= MIN_TARGET_COVERAGE]
    dropped = [t for t in targets if t not in kept]
    if not kept:
        raise ValueError(f"{area}: nenhum termopar com cobertura >= {MIN_TARGET_COVERAGE:.0%}")

    gaps = df[kept].isna().sum()
    if gaps.any():
        raise SystemExit(
            f"{area}: leituras faltantes em {gaps[gaps > 0].to_dict()}. A exportacao nao "
            "descarta ensaios em silencio; regenere os CSVs pelo tratamento final ou "
            "decida explicitamente como tratar essas lacunas."
        )

    clean = standardize(df)
    categories = categories_for(clean)
    columns = feature_columns_for(categories)
    X = encode(clean, columns)
    Y = clean[kept].to_numpy(dtype=float)
    # Grupo = configuracao. Hoje cada linha ja e uma configuracao distinta (o
    # LOGO equivale a Leave-One-Out); se replicas voltarem a aparecer, elas
    # saem juntas do treino em vez de vazar para o proprio teste.
    configs = clean[VARIABLES]
    groups = configs.apply(tuple, axis=1).factorize()[0]

    predicted = logo_predictions(area, algorithm, X, Y, groups)
    metrics = metrics_of(Y, predicted, kept)
    metrics["n_configs"] = int(len(np.unique(groups)))
    metrics["n_rows"] = int(len(clean))

    # Artefato final: todas as configuracoes. As metricas acima estimam o erro
    # dele em configuracoes novas; nenhuma linha fica de fora do treino.
    # Treina sobre array, nao DataFrame: o back-end (que nao depende de pandas)
    # prediz a partir de uma lista na ordem de `feature_columns`.
    model = build_model(area, algorithm).fit(X, Y)

    # Pares previsto/real do LOGO, um por (configuracao, coluna-alvo). Sao os
    # unicos valores REAIS medidos que o produto tem: a dispersao e o mapa de
    # calor da aba de metricas leem daqui.
    #
    # Nao se expande sobre os 16 IGBTs fundidos aqui. Replicar uma observacao
    # 16 vezes inventaria amostras independentes e achataria mediana, p90 e
    # maximo do mapa de calor. A expansao para termopares acontece na resposta
    # da API, onde e explicitamente um valor compartilhado.
    validation = {
        "protocol": "leave_one_group_out",
        "runs": [{"label": run_label(config), "config": config} for config in configs.to_dict("records")],
        "points": [
            {
                "target": target,
                "run": run,
                "actual_c": round(float(Y[run, i]), 2),
                "predicted_c": round(float(predicted[run, i]), 2),
            }
            for run in range(Y.shape[0])
            for i, target in enumerate(kept)
        ],
    }

    return {
        "model": model,
        "validation": validation,
        "targets": kept,
        "dropped_targets": dropped,
        "categories": categories,
        "feature_columns": columns,
        "metrics": metrics,
        "feature_importance": feature_importance_of(model, algorithm, columns),
        "params": RF_PARAMS[area] if algorithm == "random_forest" else GB_PARAMS,
        "train_configs": configs.drop_duplicates().to_dict("records"),
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
    return {**validation, "points": points}


def feature_importance_of(model: Any, algorithm: str, columns: list[list[str]]) -> dict[str, float]:
    """Importancia das 7 variaveis (soma das suas colunas one-hot), normalizada para 1."""
    if algorithm == "random_forest":
        values = np.asarray(model.feature_importances_, dtype=float)
    else:
        # MultiOutputRegressor: um GBR por termopar, cada um com seu vetor.
        values = np.mean([e.feature_importances_ for e in model.estimators_], axis=0)
    by_variable = {variable: 0.0 for variable in VARIABLES}
    for (variable, _), value in zip(columns, values):
        by_variable[variable] += float(value)
    total = sum(by_variable.values()) or 1.0
    return {variable: float(round(value / total, 6)) for variable, value in by_variable.items()}


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


def data_fingerprint() -> str:
    """SHA-256 dos CSVs de entrada: os CSVs nao sao versionados no git."""
    digest = hashlib.sha256()
    for filename in sorted(AREA_FILES.values()):
        digest.update(filename.encode())
        digest.update((DATA_DIR / filename).read_bytes())
    return digest.hexdigest()


def git_commit() -> str | None:
    try:
        out = subprocess.run(
            ["git", "rev-parse", "HEAD"], cwd=REPO_ROOT, capture_output=True, text=True, check=True
        )
        return out.stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        return None


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
        "--skip-catalog",
        action="store_true",
        help="nao regravar src/backend/data/model_manifest.json",
    )
    args = parser.parse_args()

    # A base e confidencial e nao vem com o repositorio: sem as planilhas por
    # area, falha aqui com instrucao, e nao com um FileNotFoundError no meio do treino.
    missing = [name for name in AREA_FILES.values() if not (DATA_DIR / name).exists()]
    if missing:
        raise SystemExit(
            "Faltam as planilhas de treino em data/: " + ", ".join(missing) + ".\n"
            "Elas sao geradas pelos notebooks expl_preprocessamenro_hipote.ipynb e "
            "tratamento_final_dos_dados.ipynb a partir de data/dataset_bruto.csv, que e "
            "confidencial e nao esta no repositorio. Veja a secao de execucao do README."
        )

    registry = json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))
    variable_options = json.loads(VARIABLE_OPTIONS_PATH.read_text(encoding="utf-8"))
    trained_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    args.model_dir.mkdir(parents=True, exist_ok=True)

    areas: dict[str, Any] = {}
    print(f"sklearn {sklearn.__version__} | semente {SEED} | conjunto {args.version} | validacao LOGO\n")
    print(f"{'area':15s} {'algoritmo':18s} {'configs':>7s} {'alvos':>5s} {'MAE':>7s} {'MAPE':>7s} {'R2 med':>7s} {'<=10%':>6s}")

    for area, filename in AREA_FILES.items():
        algorithm = AREA_ALGORITHMS[area]
        df = pd.read_csv(DATA_DIR / filename)
        df, fused = consolidate_igbts(df)
        result = fit_area(area, df, algorithm)

        artifact = args.model_dir / f"{algorithm}__{area.lower().replace(' ', '_')}.joblib"
        dump(result["model"], artifact)

        translation, unmapped = canonical_to_training(result["categories"], variable_options)
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
            # Codificacao one-hot: categorias por variavel e a ordem exata das
            # colunas que o artefato espera.
            "encoding": result["categories"],
            "feature_columns": result["feature_columns"],
            "spelling_fixes": SPELLING_FIXES,
            "canonical_to_training": translation,
            # Opcoes canonicas que esta area nunca viu no treino: pedidas em
            # runtime, viram 422 em vez de predicao inventada.
            "unmapped_options": unmapped,
            "hybrid_estimator": algorithm == "random_forest",
            "params": result["params"],
            "metrics": m,
            "feature_importance": result["feature_importance"],
            "train_configs": result["train_configs"],
            "validation": resolve_validation(result["validation"], expansion, registry),
        }
        print(
            f"{area:15s} {ALGORITHM_LABELS[algorithm]:18s} {m['n_configs']:7d} {len(result['targets']):5d} "
            f"{m['mae']:7.2f} {m['mape_pct']:6.2f}% {m['r2']:7.3f} {m['within_ten_pct_rate']:6.1%}"
        )

    manifest = {
        "model_set_version": args.version,
        "contract_version": "1.2.0",
        "trained_at": trained_at,
        "sklearn_version": sklearn.__version__,
        "seed": SEED,
        "git_commit": git_commit(),
        "data_sha256": data_fingerprint(),
        "validation_protocol": "leave_one_group_out",
        "encoding_scheme": "one_hot",
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

    if not args.skip_catalog:
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
                    # Este catalogo e versionado no git, entao NAO leva os pares
                    # previsto/real: `actual_c` e leitura medida da base
                    # confidencial do parceiro. Os pares ficam so no manifesto
                    # local (`models/manifest.json`, ignorado pelo git), de onde
                    # a API os serve. So o rotulo do ensaio viaja.
                    "validation": {
                        "runs": [{"label": r["label"]} for r in data["validation"]["runs"]],
                        "points": [],
                    },
                }
                for area, data in areas.items()
            },
        }
        write_json(front, BACKEND_DATA_DIR / "model_manifest.json")
        print(f"catalogo:   {BACKEND_DATA_DIR / 'model_manifest.json'}")


if __name__ == "__main__":
    main()
