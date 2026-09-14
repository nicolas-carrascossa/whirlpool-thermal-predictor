"""Pydantic v2 models mirroring `src/frontend/src/contract/v1.ts`.

Structural parity with `contracts/api_v1.schema.json` is enforced by
`tests/test_schema_drift.py`: same property names and same required fields for
every object of the contract.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

CONTRACT_VERSION = "1.0.0"

Architecture = Literal["BR", "MX"]
Reliability = Literal["interpolation", "moderate_extrapolation", "out_of_domain"]


class StrictModel(BaseModel):
    """Contract objects are closed: unknown properties are rejected."""

    model_config = ConfigDict(extra="forbid")


class StoveConfig(StrictModel):
    """The 7 categorical columns of the dataset."""

    blower_direction: str
    housing: str
    board_position: str
    run_case: str
    losses: str
    deflector_hole: str
    material_coil_support: str


class PredictionTargets(StrictModel):
    """Query slice. Both empty/absent = all 77 sensors."""

    key_areas: list[str] | None = None
    sensors: list[int] | None = None


class PredictionRequest(StrictModel):
    architecture: Architecture
    config: StoveConfig
    targets: PredictionTargets | None = None


class SensorPrediction(StrictModel):
    tc_number: int
    tc_name: str
    key_area: str
    temp_c: float
    error_margin_c: float
    error_margin_pct: float
    active_limit_c: float | None
    exceeds_limit: bool
    limit_ratio: float | None
    is_monitor: bool
    monitor_reference_c: float | None
    reliability: Reliability


class PredictionResponse(StrictModel):
    request_id: str
    model_version: str
    architecture: Architecture
    architecture_available: bool
    ignored_fields: list[str]
    predictions: list[SensorPrediction]
    generated_at: str


class VariableMeta(StrictModel):
    name: str
    label_pt: str
    help_pt: str
    options: list[str]
    used_by_model: bool


class KeyAreaMeta(StrictModel):
    name: str
    label_pt: str
    n_sensors: int


class ArchitectureMeta(StrictModel):
    code: Architecture
    available: bool
    label_pt: str


class SensorMeta(StrictModel):
    tc_number: int
    tc_name: str
    key_area: str
    active_limit_c: float | None
    is_monitor: bool
    monitor_reference_c: float | None


class Metadata(StrictModel):
    contract_version: str
    architectures: list[ArchitectureMeta]
    variables: list[VariableMeta]
    sensors: list[SensorMeta]
    key_areas: list[KeyAreaMeta]
    reference_config: StoveConfig


# ---------------------------------------------------------------------------
# Auth (outside the v1 data contract, agreed with the front-end)
# ---------------------------------------------------------------------------


class UserPublic(BaseModel):
    username: str
    display_name: str
    role: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int = Field(description="Validade do token, em segundos.")
    user: UserPublic


class ErrorDetail(BaseModel):
    detail: str
