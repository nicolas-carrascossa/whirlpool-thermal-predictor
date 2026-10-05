"""Estado dos modelos treinados e troca para os dados mockados.

Fica fora do contrato v1 (`src/contracts/api_v1.schema.json`): não é predição,
é a operação da própria API quando ela sobe sem os modelos (ver
`app.model_setup`).
"""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app import model_setup
from app.db import User
from app.deps import current_user

router = APIRouter(prefix="/api/v1/system", tags=["sistema"])


class ModelStatus(BaseModel):
    state: Literal["ready", "training", "no_dataset", "failed", "mock"]
    message: str


def _response(current: model_setup.Status) -> ModelStatus:
    return ModelStatus(state=current.state, message=current.message)


@router.get("/models", response_model=ModelStatus)
def get_models_status(_user: User = Depends(current_user)) -> ModelStatus:
    """Estado dos modelos. Sem modelos e com as planilhas em `data/`, inicia a geração."""
    return _response(model_setup.status())


@router.post("/mock-mode", response_model=ModelStatus)
def enable_mock_mode(_user: User = Depends(current_user)) -> ModelStatus:
    """Passa a responder com os dados mockados até a API reiniciar."""
    return _response(model_setup.use_mock_mode())
