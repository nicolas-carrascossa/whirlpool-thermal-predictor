"""JS-parity primitives shared by the predictors and their `request_id` hash.

Bit-for-bit equivalents of the TypeScript arithmetic used across the contract:
same FNV-1a 32-bit hash, same `Math.imul` semantics and the same
`Math.round(v * 100) / 100` rounding. Both `real.py` and the (now retired)
mock relied on these — kept here as the single shared seam.
"""

from __future__ import annotations

import json
import math
from typing import Any

from app.data import CONFIG_FIELDS

UINT32 = 0xFFFFFFFF


def imul(a: int, b: int) -> int:
    """`Math.imul` as an unsigned 32-bit value (bit pattern is identical)."""
    return (a * b) & UINT32


def fnv1a(text: str) -> int:
    """FNV-1a over UTF-16 code units (JS `charCodeAt`), returned as uint32."""
    h = 0x811C9DC5
    for unit in _utf16_code_units(text):
        h = (h ^ unit) & UINT32
        h = imul(h, 0x01000193)
    return h & UINT32


def _utf16_code_units(text: str) -> list[int]:
    """Code units exactly as `String.prototype.charCodeAt` yields them."""
    units: list[int] = []
    for char in text:
        code = ord(char)
        if code > 0xFFFF:  # astral plane -> surrogate pair
            code -= 0x10000
            units.append(0xD800 + (code >> 10))
            units.append(0xDC00 + (code & 0x3FF))
        else:
            units.append(code)
    return units


def js_round(value: float) -> float:
    """`Math.round`: half rounds towards +Infinity (Python's round does not)."""
    floor = math.floor(value)
    return float(floor + 1) if value - floor >= 0.5 else float(floor)


def round2(value: float) -> float:
    return js_round(value * 100) / 100


def js_json_stringify(value: Any) -> str:
    """`JSON.stringify` for the plain JSON subset used by `request_id`."""
    return json.dumps(
        _js_numbers(value), ensure_ascii=False, separators=(",", ":"), allow_nan=False
    )


def _js_numbers(value: Any) -> Any:
    """JS prints `1.0` as `1`; normalize integral floats before dumping."""
    if isinstance(value, bool):
        return value
    if isinstance(value, float) and value.is_integer():
        return int(value)
    if isinstance(value, dict):
        return {k: _js_numbers(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_js_numbers(v) for v in value]
    return value


def canonical_config_key(config: dict[str, str]) -> str:
    return "|".join(f"{f}={config[f]}" for f in CONFIG_FIELDS)
