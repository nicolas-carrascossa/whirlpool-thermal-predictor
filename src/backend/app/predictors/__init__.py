"""Predictor selection by `MODEL_MODE`."""

from __future__ import annotations

from functools import lru_cache

from app.config import get_settings
from app.predictors.base import ContractError, Predictor
from app.predictors.mock import MockPredictor
from app.predictors.real import RealPredictor

__all__ = [
    "ContractError",
    "Predictor",
    "MockPredictor",
    "RealPredictor",
    "get_predictor",
]


@lru_cache
def get_predictor() -> Predictor:
    mode = get_settings().model_mode.lower()
    if mode == "mock":
        return MockPredictor()
    if mode == "real":
        # One object loads the 7 artifacts and routes internally: `get_predictor`
        # is lru_cached and hands out a single predictor.
        return RealPredictor()
    raise ValueError(f'MODEL_MODE desconhecido: "{mode}". Use "mock" ou "real".')
