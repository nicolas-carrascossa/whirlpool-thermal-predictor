"""Thermal Predictor API — contrato v1 servido pelos modelos treinados."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.db import init_db
from app.middleware import AccessLogMiddleware
from app.predictors import get_predictor
from app.routers import auth, predictions
from app.schemas import CONTRACT_VERSION

API_TITLE = "Thermal Predictor API"


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    yield


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title=API_TITLE,
        version=CONTRACT_VERSION,
        description=(
            "API do Thermal Predictor (Inteli × Whirlpool). Implementa o contrato v1 "
            "definido em `contracts/api_v1.schema.json`. Todas as rotas `/api/v1/*` "
            "exigem um token Bearer obtido em `POST /api/v1/auth/login`."
        ),
        lifespan=lifespan,
    )

    app.add_middleware(AccessLogMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        # Qualquer porta de localhost (ver `Settings.cors_origin_regex`). Sem
        # isto, o Vite migrando de porta vira erro de CORS na cara do usuário.
        allow_origin_regex=settings.cors_origin_regex or None,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Request-Id"],
    )

    app.include_router(auth.router)
    app.include_router(predictions.router)

    @app.get("/health", tags=["infra"])
    def health() -> dict[str, str]:
        """Liveness probe — a única rota pública além do login."""
        return {
            "status": "ok",
            "contract_version": CONTRACT_VERSION,
            "model_version": get_predictor().model_version,
        }

    @app.exception_handler(RequestValidationError)
    async def validation_handler(_request: Request, exc: RequestValidationError):
        """Pydantic errors as `{"detail": "<mensagem em pt-BR>"}` (422)."""
        return JSONResponse(status_code=422, content={"detail": _describe(exc)})

    return app


def _describe(exc: RequestValidationError) -> str:
    parts: list[str] = []
    for error in exc.errors():
        location = ".".join(str(p) for p in error.get("loc", ()) if p != "body")
        expected = error.get("ctx", {}).get("expected")
        if error.get("type") == "literal_error" and expected:
            parts.append(f'Valor inválido para "{location}". Valores aceitos: {expected}.')
        elif error.get("type") == "missing":
            parts.append(f'O campo "{location}" é obrigatório.')
        elif error.get("type") == "extra_forbidden":
            parts.append(f'Campo não previsto no contrato: "{location}".')
        else:
            parts.append(f'Valor inválido para "{location}": {error.get("msg", "")}.')
    return "Requisição inválida. " + " ".join(parts) if parts else "Requisição inválida."


app = create_app()
