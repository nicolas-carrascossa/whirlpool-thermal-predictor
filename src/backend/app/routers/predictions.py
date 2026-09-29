"""Contract v1 routers: metadata and predictions (both require a Bearer token)."""

from __future__ import annotations

import json
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from app.db import User
from app.deps import current_user, predictor
from app.predictors.base import ContractError, Predictor
from app.schemas import Metadata, MetricsResponse, PredictionRequest, PredictionResponse

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
    # Published for the access-log middleware, which never reads the body.
    # `area_algorithms` is the mapping ACTUALLY applied here: the manifest may
    # change, and then the response would no longer be reproducible from it.
    request.state.prediction_context = {
        "architecture": body.architecture,
        "model_set_version": response.model_version,
        **body.config.model_dump(),
        "targets_json": json.dumps(raw_targets or {}, ensure_ascii=False, sort_keys=True),
        "area_algorithms_json": json.dumps(
            response.algorithm_by_area, ensure_ascii=False, sort_keys=True
        ),
        "skipped_areas_json": json.dumps(
            getattr(engine, "skipped_areas", {}) or {}, ensure_ascii=False, sort_keys=True
        ),
    }
    return response


@router.get("/metrics", response_model=MetricsResponse)
def get_metrics(
    key_areas: Annotated[list[str] | None, Query(description="Filtra por área.")] = None,
    _user: User = Depends(current_user),
    engine: Predictor = Depends(predictor),
) -> MetricsResponse:
    """Validation metrics per area, from the model manifest.

    There is no filter by algorithm on purpose: the user reasons by area, and
    the algorithm is a consequence of the area. But every row carries
    `algorithm`, because comparing MAE across areas served by different models
    demands the provenance in plain sight.
    """
    try:
        return engine.get_metrics(key_areas)
    except ContractError as exc:
        raise HTTPException(status_code=422, detail=exc.message) from exc


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
