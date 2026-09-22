"""Contract v1 routers: metadata and predictions (both require a Bearer token)."""

from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request

from app.db import User
from app.deps import current_user, predictor
from app.predictors.base import ContractError, Predictor
from app.schemas import Metadata, PredictionRequest, PredictionResponse

router = APIRouter(prefix="/api/v1", tags=["contrato v1"])


@router.get("/metadata", response_model=Metadata)
def get_metadata(
    _user: User = Depends(current_user),
    engine: Predictor = Depends(predictor),
) -> Metadata:
    return engine.get_metadata()


@router.post("/predictions", response_model=PredictionResponse)
async def post_predictions(
    request: Request,
    body: PredictionRequest,
    _user: User = Depends(current_user),
    engine: Predictor = Depends(predictor),
) -> PredictionResponse:
    # `request_id` hashes the raw `targets` object, so its original key order
    # must survive: read it from the body as received, not from the model.
    raw_targets = _raw_targets(await _raw_body(request))
    try:
        response = engine.predict(body, raw_targets=raw_targets)
    except ContractError as exc:
        raise HTTPException(status_code=422, detail=exc.message) from exc
    request.state.request_id = response.request_id
    return response


async def _raw_body(request: Request) -> Any:
    raw = await request.body()
    try:
        return json.loads(raw or b"{}")
    except ValueError:
        return {}


def _raw_targets(payload: Any) -> dict[str, Any] | None:
    if isinstance(payload, dict):
        targets = payload.get("targets")
        if isinstance(targets, dict):
            return targets
    return None
