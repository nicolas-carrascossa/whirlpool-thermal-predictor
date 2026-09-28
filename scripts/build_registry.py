"""Gera o registro de sensores, as opcoes de variaveis e as estatisticas de
temperatura a partir de `data/dataset_pre_processado.csv`, para consumo do
API (`src/backend/data/*.json`), que os serve por HTTP.

Reproduz a normalizacao de grafia aplicada nos notebooks
`notebooks/tratamento_final_dos_dados.ipynb` e
`notebooks/expl_preprocessamenro_hipote.ipynb` (Secao 2, item 5.1):

- `blower_direction`: "To Back" -> "To back", "To Front" -> "To front"
  (segunda palavra em minuscula, nao title case).
- `run_case`: "Broil Case 2" -> "Broil C2"; "Broil Qual" -> "Broil Qualitative";
  "Qualitative" -> "Broil Qualitative".
- `losses`: "No Losses" -> "No losses" (unifica capitalizacao).
- Todas as 7 variaveis: espacos em branco nas pontas removidos (mesmo
  tratamento aplicado a `board_position` no notebook, generalizado aqui para
  cobrir casos como "Aluminium " / "Plastic " em `material_coil_support`).
- `housing = "Open - Updated"` e mantida como categoria propria (nao e fundida
  com "Open" - o notebook a codifica como uma 3a categoria distinta na Secao
  "Codificacao das variaveis categoricas").
- `losses = "Não informado"` e tratado como ausencia de dado (nao entra na
  lista de opcoes; contabilizado em `n_missing`), pois representa os nulos
  originais ja preenchidos por um passo anterior do pre-processamento.
- `active_limit`: o placeholder generico "Monitor" (sem numero associado) foi
  convertido para 1000 na planilha bruta (ver Secao 2 do notebook de
  pre-processamento); aqui viramos isso de volta em `active_limit_c = null` +
  `is_monitor = true`. O caso especifico "Monitor (150 C)" do sensor
  "Turbo Duct / AC Blower Outlet" foi gravado como 150 (nao 1000) e por isso
  fica indistinguivel de um limite real de 150 C so pelo numero - tratamos
  esse sensor a parte, por nome, gravando `monitor_reference_c = 150`.

Uso (a partir da raiz do repositorio):
    .\\.venv\\Scripts\\python.exe scripts\\build_registry.py
"""
from __future__ import annotations

import json
import math
from pathlib import Path

import pandas as pd

REPO_ROOT = Path(__file__).resolve().parent.parent
DATASET_PATH = REPO_ROOT / "data" / "dataset_pre_processado.csv"
# Os dados de catalogo pertencem ao back-end, que os le em runtime
# (`src/backend/app/config.py`). O front-end os recebe pela API.
OUTPUT_DIR = REPO_ROOT / "src" / "backend" / "data"

VARIABLE_ORDER = [
    "blower_direction",
    "housing",
    "board_position",
    "run_case",
    "losses",
    "deflector_hole",
    "material_coil_support",
]

# Mapas de correcao de grafia extraidos literalmente da Secao 2 (item 5.1) do
# notebook `expl_preprocessamenro_hipote.ipynb`. Aplicados APOS o strip() de
# espacos nas pontas (as chaves ja estao na forma "stripped").
SPELLING_FIXES: dict[str, dict[str, str]] = {
    "blower_direction": {
        "To Back": "To back",
        "To Front": "To front",
    },
    "run_case": {
        "Broil Case 2": "Broil C2",
        "Broil Qual": "Broil Qualitative",
        "Qualitative": "Broil Qualitative",
    },
    "losses": {
        "No Losses": "No losses",
    },
}

# Marcador textual de "sem informacao" usado no dataset (ja preenchido por uma
# etapa anterior do pre-processamento) - tratado como dado ausente, nao como
# categoria valida.
MISSING_MARKERS = {"Não informado", "Nao informado", ""}

# Sensor cujo active_limit textual original era "Monitor (150 C)" (nao o
# placeholder generico "Monitor" -> 1000). Identificado por nome porque, apos
# a conversao para 150 na planilha, o numero sozinho e indistinguivel do
# limite real de 150 C de outros sensores (Storage Drawer, AC Blower Housing,
# Oven RTD Connector Body, Aluminium Plate - ver notebook, Secao 4.1).
MONITOR_WITH_REFERENCE = {
    "Turbo Duct / AC Blower Outlet": 150.0,
}

# Valor placeholder generico de "Monitor" sem numero associado (escolhido no
# notebook por ser tecnicamente inalcancavel nos ensaios).
GENERIC_MONITOR_PLACEHOLDER = 1000.0


def normalize_categorical(raw_value: object, column: str) -> str | None:
    """Aplica strip + correcoes de grafia; retorna None para marcadores de
    ausencia de dado."""
    if pd.isna(raw_value):
        return None
    s = str(raw_value).strip()
    if s in MISSING_MARKERS:
        return None
    fixes = SPELLING_FIXES.get(column, {})
    s = fixes.get(s, s)
    return s


def round_or_none(value: float | None, ndigits: int = 3) -> float | None:
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return None
    return round(float(value), ndigits)


def build_sensor_registry(df: pd.DataFrame) -> list[dict]:
    sensors = (
        df[["tc_number", "tc_name", "key_area", "active_limit"]]
        .drop_duplicates(subset=["tc_number"])
        .sort_values("tc_number")
    )

    # Integridade: um sensor so pode ter uma key_area e um active_limit.
    check = df.groupby("tc_number").agg(
        n_names=("tc_name", "nunique"),
        n_areas=("key_area", "nunique"),
        n_limits=("active_limit", "nunique"),
    )
    bad = check[(check["n_names"] > 1) | (check["n_areas"] > 1) | (check["n_limits"] > 1)]
    assert bad.empty, f"Sensores com key_area/nome/limite ambiguo:\n{bad}"

    records = []
    for row in sensors.itertuples(index=False):
        tc_number = int(row.tc_number)
        tc_name = str(row.tc_name).strip()
        key_area = str(row.key_area).strip()
        raw_limit = row.active_limit

        is_monitor = False
        active_limit_c: float | None = None
        monitor_reference_c: float | None = None

        try:
            limit_val = float(raw_limit)
        except (TypeError, ValueError):
            limit_val = None

        if tc_name in MONITOR_WITH_REFERENCE:
            is_monitor = True
            active_limit_c = None
            monitor_reference_c = MONITOR_WITH_REFERENCE[tc_name]
        elif limit_val is not None and limit_val == GENERIC_MONITOR_PLACEHOLDER:
            is_monitor = True
            active_limit_c = None
            monitor_reference_c = None
        elif limit_val is not None:
            active_limit_c = limit_val
        else:
            # valor textual nao mapeado - trata como "Monitor" sem referencia.
            is_monitor = True
            active_limit_c = None
            monitor_reference_c = None

        records.append(
            {
                "tc_number": tc_number,
                "tc_name": tc_name,
                "key_area": key_area,
                "active_limit_c": round_or_none(active_limit_c, 1),
                "is_monitor": is_monitor,
                "monitor_reference_c": round_or_none(monitor_reference_c, 1),
            }
        )

    assert len(records) == 77, f"Esperado 77 sensores, encontrado {len(records)}"
    n_areas = len({r["key_area"] for r in records})
    assert n_areas == 7, f"Esperado 7 key_areas, encontrado {n_areas}"

    records.sort(key=lambda r: r["tc_number"])
    return records


def build_variable_options(df: pd.DataFrame) -> dict:
    result = {}
    for col in VARIABLE_ORDER:
        raw_series = df[col]
        raw_to_canonical: dict[str, str | None] = {}
        n_missing = 0
        canonical_values: set[str] = set()

        for raw_value in raw_series:
            if pd.isna(raw_value):
                raw_key = "<NaN>"
                canonical = None
            else:
                raw_key = str(raw_value)
                canonical = normalize_categorical(raw_value, col)

            if raw_key not in raw_to_canonical:
                raw_to_canonical[raw_key] = canonical

            if canonical is None:
                n_missing += 1
            else:
                canonical_values.add(canonical)

        result[col] = {
            "name": col,
            "options": sorted(canonical_values),
            "raw_to_canonical": dict(sorted(raw_to_canonical.items())),
            "n_missing": n_missing,
        }
    return result


def build_sensor_stats(df: pd.DataFrame) -> dict:
    df = df.copy()
    df["temp"] = pd.to_numeric(df["temp"], errors="coerce")
    df["run_case_canon"] = df["run_case"].apply(lambda v: normalize_categorical(v, "run_case"))

    n_rows = int(len(df))
    n_runs = int(df["run_id"].nunique())

    per_sensor = {}
    for tc_number, g in df.groupby("tc_number"):
        temps = g["temp"].dropna()
        by_run_case = {}
        for run_case, g2 in g.groupby("run_case_canon"):
            if run_case is None:
                continue
            t2 = g2["temp"].dropna()
            if len(t2) == 0:
                continue
            by_run_case[run_case] = {
                "n": int(len(t2)),
                "mean": round_or_none(t2.mean()),
                "std": round_or_none(t2.std()) if len(t2) > 1 else None,
            }

        per_sensor[str(int(tc_number))] = {
            "n": int(len(temps)),
            "mean": round_or_none(temps.mean()) if len(temps) else None,
            "std": round_or_none(temps.std()) if len(temps) > 1 else None,
            "min": round_or_none(temps.min()) if len(temps) else None,
            "max": round_or_none(temps.max()) if len(temps) else None,
            "by_run_case": dict(sorted(by_run_case.items())),
        }

    per_key_area = {}
    for key_area, g in df.groupby("key_area"):
        temps = g["temp"].dropna()
        per_key_area[str(key_area).strip()] = {
            "n": int(len(temps)),
            "mean": round_or_none(temps.mean()) if len(temps) else None,
            "std": round_or_none(temps.std()) if len(temps) > 1 else None,
            "min": round_or_none(temps.min()) if len(temps) else None,
            "max": round_or_none(temps.max()) if len(temps) else None,
        }

    run_cols = ["run_id"] + VARIABLE_ORDER
    run_df = df[run_cols].drop_duplicates(subset=["run_id"]).sort_values("run_id")
    check = df.groupby("run_id")[VARIABLE_ORDER].nunique()
    bad = check[(check > 1).any(axis=1)]
    assert bad.empty, f"Runs com valores de configuracao ambiguos:\n{bad}"
    assert len(run_df) == 56, f"Esperado 56 runs, encontrado {len(run_df)}"

    run_configs = []
    for row in run_df.itertuples(index=False):
        entry = {"run_id": str(row.run_id)}
        for col in VARIABLE_ORDER:
            raw_value = getattr(row, col)
            entry[col] = normalize_categorical(raw_value, col)
        run_configs.append(entry)
    run_configs.sort(key=lambda r: r["run_id"])

    return {
        "generated_from": "data/dataset_pre_processado.csv",
        "n_rows": n_rows,
        "n_runs": n_runs,
        "per_sensor": dict(sorted(per_sensor.items(), key=lambda kv: int(kv[0]))),
        "per_key_area": dict(sorted(per_key_area.items())),
        "run_configs": run_configs,
    }


def write_json(obj, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2, sort_keys=True)
        f.write("\n")


def main() -> None:
    df = pd.read_csv(DATASET_PATH)

    sensor_registry = build_sensor_registry(df)
    variable_options = build_variable_options(df)
    sensor_stats = build_sensor_stats(df)

    write_json(sensor_registry, OUTPUT_DIR / "sensor_registry.json")
    write_json(variable_options, OUTPUT_DIR / "variable_options.json")
    write_json(sensor_stats, OUTPUT_DIR / "sensor_stats.json")

    # ---- Resumo em stdout ----
    print("=" * 70)
    print("SENSOR REGISTRY")
    print("=" * 70)
    print(f"Total de sensores: {len(sensor_registry)}")
    from collections import Counter

    area_counts = Counter(r["key_area"] for r in sensor_registry)
    for area, n in sorted(area_counts.items()):
        print(f"  {area:16s}: {n} sensores")
    n_monitor = sum(1 for r in sensor_registry if r["is_monitor"])
    print(f"Sensores 'Monitor' (sem active_limit_c): {n_monitor}")
    for r in sensor_registry:
        if r["is_monitor"] and r["monitor_reference_c"] is not None:
            print(f"  -> tc_number={r['tc_number']} ({r['tc_name']}): monitor_reference_c={r['monitor_reference_c']}")

    print()
    print("=" * 70)
    print("VARIABLE OPTIONS")
    print("=" * 70)
    for col in VARIABLE_ORDER:
        info = variable_options[col]
        print(f"{col} ({len(info['options'])} opcoes, {info['n_missing']} ausentes):")
        for opt in info["options"]:
            print(f"    - {opt}")

    print()
    print("=" * 70)
    print("SENSOR STATS / RUN CONFIGS")
    print("=" * 70)
    print(f"n_rows={sensor_stats['n_rows']}  n_runs={sensor_stats['n_runs']}")
    combos = {tuple(rc[c] for c in VARIABLE_ORDER) for rc in sensor_stats["run_configs"]}
    print(f"Combinacoes distintas de configuracao entre os {len(sensor_stats['run_configs'])} runs: {len(combos)}")


if __name__ == "__main__":
    main()
