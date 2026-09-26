"""Predictor protocol: the single seam between the API and the model."""

from __future__ import annotations

from typing import Any, Protocol, runtime_checkable

from app.schemas import Metadata, PredictionRequest, PredictionResponse


class ContractError(Exception):
    """Contract violation (value outside the canonical options, etc.).

    Carries a pt-BR message, the offending field and its value; the routers
    turn it into a `422 {"detail": "..."}`.
    """

    def __init__(self, message: str, field: str, value: Any) -> None:
        super().__init__(message)
        self.message = message
        self.field = field
        self.value = value


@runtime_checkable
class Predictor(Protocol):
    """Every predictor (mock now, real RandomForest in Fase 3) implements this."""

    model_version: str

    def get_metadata(self) -> Metadata: ...

    def predict(
        self,
        req: PredictionRequest,
        raw_targets: dict[str, Any] | None = None,
    ) -> PredictionResponse:
        """Predict.

        `raw_targets` is the `targets` object exactly as it arrived in the JSON
        body: `request_id` hashes its serialization, so key order matters and
        must not be normalized by Pydantic.
        """
        ...
