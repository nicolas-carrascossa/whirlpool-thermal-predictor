"""Predictor selection by `MODEL_MODE`."""

from __future__ import annotations

from functools import lru_cache

from app.config import get_settings
from app.predictors.base import ContractError, Predictor
from app.predictors.mock import MockPredictor

__all__ = ["ContractError", "Predictor", "MockPredictor", "get_predictor"]


@lru_cache
def get_predictor() -> Predictor:
    mode = get_settings().model_mode.lower()
    if mode == "mock":
        return MockPredictor()
    if mode == "real":
        raise NotImplementedError(
            "MODEL_MODE=real ainda não está disponível: o modelo treinado entra na Fase 3."
        )
    raise ValueError(f'MODEL_MODE desconhecido: "{mode}". Use "mock" ou "real".')
