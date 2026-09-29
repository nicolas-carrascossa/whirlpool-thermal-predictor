"""Predictor access: a single cached `RealPredictor` instance."""

from __future__ import annotations

from functools import lru_cache

from app.predictors.base import ContractError, Predictor
from app.predictors.real import RealPredictor

__all__ = [
    "ContractError",
    "Predictor",
    "RealPredictor",
    "get_predictor",
]


@lru_cache
def get_predictor() -> Predictor:
    # One object loads the 7 artifacts and routes internally: cached, so the
    # process hands out a single predictor.
    return RealPredictor()
