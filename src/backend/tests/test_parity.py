"""TS ↔ Python parity of the mock predictor.

The fixture is produced by `src/frontend/src/sources/exportParityFixture.test.ts`
(`EXPORT_PARITY=1`). If this test fails, the Python port is wrong — never
loosen the tolerance and never touch the TypeScript mock.
"""

from __future__ import annotations

import json

import pytest

from app.predictors.mock import MockPredictor
from app.schemas import PredictionRequest

from .conftest import PARITY_FIXTURE

TOL = 1e-6

NUMERIC_FIELDS = (
    "temp_c",
    "error_margin_c",
    "error_margin_pct",
    "active_limit_c",
    "limit_ratio",
    "monitor_reference_c",
)
EXACT_FIELDS = (
    "tc_number",
    "tc_name",
    "key_area",
    "exceeds_limit",
    "is_monitor",
    "reliability",
)


def _load_cases() -> list[dict]:
    if not PARITY_FIXTURE.exists():  # pragma: no cover - guard for a fresh clone
        pytest.skip(
            "Fixture ausente. Gere com: "
            "$env:EXPORT_PARITY='1'; npx vitest run src/sources/exportParityFixture.test.ts"
        )
    with PARITY_FIXTURE.open("r", encoding="utf-8") as handle:
        return json.load(handle)


CASES = _load_cases()


def test_fixture_has_25_cases() -> None:
    assert len(CASES) == 25


@pytest.mark.parametrize("case", CASES, ids=lambda c: c["response"]["request_id"])
def test_python_mock_matches_typescript(case: dict) -> None:
    predictor = MockPredictor()
    request = PredictionRequest.model_validate(case["request"])
    raw_targets = case["request"].get("targets")
    actual = predictor.predict(request, raw_targets=raw_targets)

    expected = case["response"]
    assert actual.request_id == expected["request_id"]
    assert actual.model_version == expected["model_version"]
    assert actual.architecture == expected["architecture"]
    assert actual.architecture_available == expected["architecture_available"]
    assert actual.ignored_fields == expected["ignored_fields"]
    assert len(actual.predictions) == len(expected["predictions"])

    for got, want in zip(actual.predictions, expected["predictions"]):
        got_dict = got.model_dump()
        for field in EXACT_FIELDS:
            assert got_dict[field] == want[field], f"{field} @ tc {want['tc_number']}"
        for field in NUMERIC_FIELDS:
            a, b = got_dict[field], want[field]
            if a is None or b is None:
                assert a is b or a == b, f"{field} @ tc {want['tc_number']}"
            else:
                assert abs(a - b) <= TOL, f"{field} @ tc {want['tc_number']}: {a} != {b}"


def test_reference_config_matches_the_typescript_one() -> None:
    """Case 0 of the fixture is the TS REFERENCE_CONFIG."""
    predictor = MockPredictor()
    assert predictor.reference_config == CASES[0]["request"]["config"]


def test_max_absolute_deviation_is_zero() -> None:
    """Reports the worst deviation across the whole fixture (should be 0.0)."""
    predictor = MockPredictor()
    worst = 0.0
    for case in CASES:
        request = PredictionRequest.model_validate(case["request"])
        actual = predictor.predict(request, raw_targets=case["request"].get("targets"))
        for got, want in zip(actual.predictions, case["response"]["predictions"]):
            got_dict = got.model_dump()
            for field in NUMERIC_FIELDS:
                a, b = got_dict[field], want[field]
                if a is not None and b is not None:
                    worst = max(worst, abs(a - b))
    assert worst <= TOL, f"maior desvio absoluto: {worst}"
