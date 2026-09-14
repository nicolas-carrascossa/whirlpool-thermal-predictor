"""Structural parity between the Pydantic models and `contracts/api_v1.schema.json`.

Fails on any drift: a renamed property, a new property or a changed required
set on either side. The JSON Schema is generated from `contract/v1.ts`, so this
is what keeps front-end types and back-end models honest.
"""

from __future__ import annotations

import json

import pytest

from app.schemas import (
    ArchitectureMeta,
    KeyAreaMeta,
    Metadata,
    PredictionRequest,
    PredictionResponse,
    PredictionTargets,
    SensorMeta,
    SensorPrediction,
    StoveConfig,
    VariableMeta,
)

from .conftest import CONTRACT_SCHEMA

MODELS = {
    "StoveConfig": StoveConfig,
    "PredictionTargets": PredictionTargets,
    "PredictionRequest": PredictionRequest,
    "SensorPrediction": SensorPrediction,
    "PredictionResponse": PredictionResponse,
    "VariableMeta": VariableMeta,
    "KeyAreaMeta": KeyAreaMeta,
    "ArchitectureMeta": ArchitectureMeta,
    "SensorMeta": SensorMeta,
    "Metadata": Metadata,
}


def _defs() -> dict:
    with CONTRACT_SCHEMA.open("r", encoding="utf-8") as handle:
        return json.load(handle)["$defs"]


DEFS = _defs()


def test_every_contract_object_has_a_model() -> None:
    """No object of the contract may be missing from `app/schemas.py`."""
    objects = {name for name, spec in DEFS.items() if spec.get("type") == "object"}
    assert objects == set(MODELS)


@pytest.mark.parametrize("name", sorted(MODELS))
def test_properties_and_required_match(name: str) -> None:
    expected = DEFS[name]
    # The OpenAPI-generated schema of the model, as FastAPI publishes it.
    actual = MODELS[name].model_json_schema(ref_template="#/$defs/{model}")

    assert set(actual["properties"]) == set(expected["properties"]), name
    assert set(actual.get("required", [])) == set(expected.get("required", [])), name


def test_openapi_document_exposes_the_contract(client) -> None:
    openapi = client.get("/openapi.json").json()
    schemas = openapi["components"]["schemas"]
    for name in MODELS:
        assert name in schemas, f"{name} ausente do OpenAPI"
        assert set(schemas[name]["properties"]) == set(DEFS[name]["properties"])
        assert set(schemas[name].get("required", [])) == set(DEFS[name].get("required", []))
