"""Audit the user-selectable configuration coverage of each area model.

This script is intentionally read-only. It reproduces the preprocessing and
the first train split from ``export_models.py`` and prints JSON to stdout so
the coverage report can be independently reviewed.
"""

from __future__ import annotations

import itertools
import json
import argparse
from pathlib import Path
from typing import Any

import pandas as pd
from sklearn.model_selection import train_test_split

from export_models import (
    AREA_FILES,
    MIN_TARGET_COVERAGE,
    SEED,
    TRAIN_SIZE,
    VARIABLES,
    consolidate_igbts,
    standardize,
    target_columns,
)


ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
BACKEND_DATA = ROOT / "src" / "backend" / "data"
MANIFEST_PATH = ROOT / "models" / "manifest.json"


def _config_tuple(config: dict[str, str]) -> tuple[str, ...]:
    return tuple(str(config[field]) for field in VARIABLES)


def _user_aliases(
    entry: dict[str, Any], options: dict[str, Any], trained_config: dict[str, str]
) -> dict[str, list[str]] | None:
    """Return every UI spelling that maps to one training configuration."""
    aliases: dict[str, list[str]] = {}
    mappings = entry["canonical_to_training"]
    for field in VARIABLES:
        target = str(trained_config[field])
        values = [
            option
            for option in options[field]["options"]
            if mappings.get(field, {}).get(option) == target
        ]
        if not values:
            return None
        aliases[field] = values
    return aliases


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--area", help="Emit only one key_area.")
    parser.add_argument(
        "--summary",
        action="store_true",
        help="Omit sensor and exact-configuration details.",
    )
    parser.add_argument(
        "--sensors-only",
        action="store_true",
        help="Emit sensor details but omit exact-configuration patterns.",
    )
    parser.add_argument(
        "--patterns-only",
        action="store_true",
        help="Emit exact-configuration patterns but omit sensor details.",
    )
    parser.add_argument(
        "--markdown",
        action="store_true",
        help="Emit compact Markdown tables instead of JSON.",
    )
    args = parser.parse_args()
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    options = json.loads((BACKEND_DATA / "variable_options.json").read_text(encoding="utf-8"))
    registry = json.loads((BACKEND_DATA / "sensor_registry.json").read_text(encoding="utf-8"))
    sensors_by_area: dict[str, list[dict[str, Any]]] = {}
    for sensor in registry:
        sensors_by_area.setdefault(sensor["key_area"], []).append(sensor)

    user_values = [options[field]["options"] for field in VARIABLES]
    all_user_configs = [dict(zip(VARIABLES, values)) for values in itertools.product(*user_values)]

    result: dict[str, Any] = {
        "variables": VARIABLES,
        "total_ui_combinations": len(all_user_configs),
        "areas": {},
    }

    for area, filename in AREA_FILES.items():
        if args.area and area != args.area:
            continue
        entry = manifest["areas"][area]
        raw = pd.read_csv(DATA / filename)
        prepared, fused_igbts = consolidate_igbts(raw)
        candidates = target_columns(prepared)
        kept = [name for name in candidates if prepared[name].notna().mean() >= MIN_TARGET_COVERAGE]
        dropped = [name for name in candidates if name not in kept]
        clean = standardize(prepared.dropna(subset=kept), entry["algorithm"])

        x_train, x_rest = train_test_split(clean[VARIABLES], train_size=TRAIN_SIZE, random_state=SEED)
        x_test, x_validation = train_test_split(
            x_rest,
            test_size=(0.10 / 0.30),
            random_state=SEED,
        )

        fit_configs = [dict(row) for row in x_train.drop_duplicates().to_dict("records")]
        fit_tuples = {_config_tuple(config) for config in fit_configs}
        clean_tuples = {
            _config_tuple(dict(row)) for row in clean[VARIABLES].drop_duplicates().to_dict("records")
        }

        exact_ui: list[dict[str, str]] = []
        clean_only_ui: list[dict[str, str]] = []
        distance_one_ui: list[dict[str, str]] = []
        distance_two_plus_ui: list[dict[str, str]] = []
        blocked_ui: list[dict[str, str]] = []
        mappings = entry["canonical_to_training"]

        for config in all_user_configs:
            if any(config[field] not in mappings.get(field, {}) for field in VARIABLES):
                blocked_ui.append(config)
                continue
            trained = {field: mappings[field][config[field]] for field in VARIABLES}
            key = _config_tuple(trained)
            if key in fit_tuples:
                exact_ui.append(config)
                continue
            if key in clean_tuples:
                clean_only_ui.append(config)
                continue
            distance = min(
                sum(a != b for a, b in zip(key, known)) for known in fit_tuples
            )
            if distance == 1:
                distance_one_ui.append(config)
            else:
                distance_two_plus_ui.append(config)

        reachable_fit_patterns = []
        for config in sorted(fit_configs, key=_config_tuple):
            aliases = _user_aliases(entry, options, config)
            if aliases is None:
                continue
            reachable_fit_patterns.append(
                {
                    "training": config,
                    "ui_values": aliases,
                    "n_ui_combinations": int(
                        pd.Series([len(values) for values in aliases.values()]).prod()
                    ),
                }
            )

        classified = (
            len(exact_ui)
            + len(clean_only_ui)
            + len(distance_one_ui)
            + len(distance_two_plus_ui)
            + len(blocked_ui)
        )
        if classified != len(all_user_configs):
            raise AssertionError(
                f"{area}: classification is not exhaustive: "
                f"{classified} != {len(all_user_configs)}"
            )
        represented_exact = sum(
            pattern["n_ui_combinations"] for pattern in reachable_fit_patterns
        )
        if represented_exact != len(exact_ui):
            raise AssertionError(
                f"{area}: exact UI patterns disagree: "
                f"{represented_exact} != {len(exact_ui)}"
            )

        expanded: dict[int, str] = {}
        for target, numbers in entry["sensor_expansion"].items():
            for number in numbers:
                expanded[int(number)] = target
        sensors = []
        for sensor in sorted(sensors_by_area.get(area, []), key=lambda item: item["tc_number"]):
            number = int(sensor["tc_number"])
            sensors.append(
                {
                    "tc_number": number,
                    "tc_name": sensor["tc_name"],
                    "model_target": expanded.get(number),
                    "predicted": number in expanded,
                    "shared_target": sum(1 for value in expanded.values() if value == expanded.get(number)) > 1,
                }
            )

        result["areas"][area] = {
            "algorithm": entry["algorithm"],
            "rows_source": len(prepared),
            "rows_complete_case": len(clean),
            "rows_fit": len(x_train),
            "rows_test": len(x_test),
            "rows_validation_unused_for_metrics": len(x_validation),
            "targets_candidate": len(candidates),
            "targets_kept": kept,
            "targets_dropped": dropped,
            "fused_igbt_columns": fused_igbts,
            "unique_fit_configurations": len(fit_tuples),
            "unique_clean_configurations": len(clean_tuples),
            "ui_exact_fit": len(exact_ui),
            "ui_seen_only_outside_fit": len(clean_only_ui),
            "ui_encodable_distance_one": len(distance_one_ui),
            "ui_encodable_distance_two_plus": len(distance_two_plus_ui),
            "ui_blocked_by_unseen_value": len(blocked_ui),
            "unmapped_options": entry.get("unmapped_options", {}),
            "reachable_fit_patterns": reachable_fit_patterns,
            "sensors": sensors,
        }

        if args.summary:
            result["areas"][area].pop("reachable_fit_patterns")
            result["areas"][area].pop("sensors")
        elif args.sensors_only:
            result["areas"][area].pop("reachable_fit_patterns")
        elif args.patterns_only:
            result["areas"][area].pop("sensors")

    if args.markdown:
        labels = {
            "blower_direction": "Fluxo",
            "housing": "Housing",
            "board_position": "Placa",
            "run_case": "Run case",
            "losses": "Losses",
            "deflector_hole": "Defletor",
            "material_coil_support": "Material",
        }
        for area, data in result["areas"].items():
            print(f"### {area}\n")
            print("| TC | Sensor | Alvo do modelo | Situação |")
            print("| ---: | --- | --- | --- |")
            for sensor in data.get("sensors", []):
                situation = "previsto"
                if not sensor["predicted"]:
                    situation = "não previsto"
                elif sensor["shared_target"]:
                    situation = "previsto; alvo compartilhado"
                print(
                    f"| {sensor['tc_number']} | {sensor['tc_name']} | "
                    f"{sensor['model_target'] or '—'} | {situation} |"
                )
            print("\n| ID | " + " | ".join(labels[field] for field in VARIABLES) + " | Combinações UI |")
            print("| ---: | " + " | ".join("---" for _ in VARIABLES) + " | ---: |")
            for index, pattern in enumerate(data.get("reachable_fit_patterns", []), start=1):
                cells = [" / ".join(pattern["ui_values"][field]) for field in VARIABLES]
                print(
                    f"| {index} | " + " | ".join(cells) +
                    f" | {pattern['n_ui_combinations']} |"
                )
            print()
        return

    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
