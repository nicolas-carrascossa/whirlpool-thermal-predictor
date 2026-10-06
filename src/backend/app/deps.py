"""Shared FastAPI dependencies: authentication and predictor access."""

from __future__ import annotations

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session, select

from app import model_setup
from app.db import User, get_session
from app.predictors import Predictor, get_predictor
from app.security import decode_access_token

NOT_AUTHENTICATED = "Não autenticado"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


def _unauthorized() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=NOT_AUTHENTICATED,
        headers={"WWW-Authenticate": "Bearer"},
    )


def current_user(
    request: Request,
    token: str | None = Depends(oauth2_scheme),
    session: Session = Depends(get_session),
) -> User:
    """Resolve the Bearer token to a user, or raise 401 in pt-BR."""
    if not token:
        raise _unauthorized()
    username = decode_access_token(token)
    if not username:
        raise _unauthorized()
    user = session.exec(select(User).where(User.username == username)).first()
    if not user:
        raise _unauthorized()
    # Picked up by the access-log middleware.
    request.state.username = user.username
    return user


def predictor() -> Predictor:
    try:
        return get_predictor()
    except RuntimeError as exc:
        # Sem modelos treinados (ou gerando-os): 503 com o motivo em pt-BR, em
        # vez de um 500 genérico. A interface oferece o mock a partir de
        # `GET /api/v1/system/models`.
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=model_setup.unavailable_message(str(exc)),
        ) from exc
