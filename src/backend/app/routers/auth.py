"""Authentication router (RF06): OAuth2 password flow issuing a JWT."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select

from app import model_setup
from app.db import User, get_session
from app.deps import current_user
from app.schemas import TokenResponse, UserPublic
from app.security import create_access_token, verify_password

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

INVALID_CREDENTIALS = "Usuário ou senha inválidos"


@router.post("/login", response_model=TokenResponse)
def login(
    request: Request,
    form: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session),
) -> TokenResponse:
    user = session.exec(select(User).where(User.username == form.username)).first()
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=INVALID_CREDENTIALS,
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Cada login recomeca da pergunta dos modelos, sem herdar o mock de outra sessao.
    model_setup.forget_mock_choice()
    token, expires_in = create_access_token(user.username)
    # Successful login is attributed to the user in the access log.
    request.state.username = user.username
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=expires_in,
        user=UserPublic(
            username=user.username, display_name=user.display_name, role=user.role
        ),
    )


@router.get("/me", response_model=UserPublic)
def me(user: User = Depends(current_user)) -> UserPublic:
    return UserPublic(username=user.username, display_name=user.display_name, role=user.role)
