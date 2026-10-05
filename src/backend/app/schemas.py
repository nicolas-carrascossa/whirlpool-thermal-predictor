"""Pydantic v2 models mirroring `src/frontend/src/contract/v1.ts`.

Structural parity with `contracts/api_v1.schema.json` is enforced by
`tests/test_schema_drift.py`: same property names and same required fields for
every object of the contract.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

CONTRACT_VERSION = "1.2.0"

Architecture = Literal["BR", "MX"]
Reliability = Literal["interpolation", "moderate_extrapolation", "out_of_domain"]
#: Family of model serving a key_area (v1.1). Never chosen by the client.
AlgorithmCode = Literal["random_forest", "gradient_boosting"]


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
    #: Algorithm that produced this prediction (v1.1) — derived from key_area.
    algorithm: AlgorithmCode


class PredictionResponse(StrictModel):
    request_id: str
    #: Version of the artifact SET (v1.1), not of a single predictor.
    model_version: str
    architecture: Architecture
    architecture_available: bool
    ignored_fields: list[str]
    predictions: list[SensorPrediction]
    #: key_area -> algorithm, for the areas present in THIS response (v1.1).
    algorithm_by_area: dict[str, AlgorithmCode]
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


class AlgorithmMeta(StrictModel):
    code: AlgorithmCode
    label_pt: str
    available: bool
    model_version: str
    trained_at: str | None = None


class Metadata(StrictModel):
    contract_version: str
    architectures: list[ArchitectureMeta]
    variables: list[VariableMeta]
    sensors: list[SensorMeta]
    key_areas: list[KeyAreaMeta]
    reference_config: StoveConfig
    #: Model families in the artifact set (v1.1).
    algorithms: list[AlgorithmMeta]
    #: Full key_area -> algorithm map (v1.1); the front-end never duplicates it.
    area_algorithms: dict[str, AlgorithmCode]


class ValidationRun(StrictModel):
    """A lab run of the area, used as the test fold in the LOGO validation."""

    label: str


class ValidationPoint(StrictModel):
    """One predicted/actual pair from the LOGO validation (out-of-fold).

    These are the only real measured values the product has. A configuration
    that never went to the lab has no "actual" to compare against — and cannot.

    `tc_numbers` may hold 16 entries (the fused IGBT column), but this is still
    ONE observation: replicating it would invent independent samples and flatten
    the median/p90/max of the error heat map.
    """

    target: str
    run: int
    tc_numbers: list[int]
    tc_name: str
    active_limit_c: float | None
    actual_c: float
    predicted_c: float


class AreaValidation(StrictModel):
    runs: list[ValidationRun]
    points: list[ValidationPoint]


class AreaMetrics(StrictModel):
    """Validation metrics of one key_area (v1.1) — `GET /api/v1/metrics`."""

    key_area: str
    algorithm: AlgorithmCode
    mae: float
    rmse: float
    r2: float
    mape_pct: float
    within_ten_pct_rate: float
    feature_importance: dict[str, float]
    validation: AreaValidation


class MetricsResponse(StrictModel):
    model_version: str
    areas: list[AreaMetrics]
    generated_at: str


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
