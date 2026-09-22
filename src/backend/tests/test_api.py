"""End-to-end tests of the HTTP surface (Ponto de parada 2)."""

from __future__ import annotations

import json

import pytest
from jsonschema import Draft202012Validator
from sqlmodel import Session, select

from app.db import AccessLog, get_engine

from .conftest import CONTRACT_SCHEMA

with CONTRACT_SCHEMA.open("r", encoding="utf-8") as _handle:
    SCHEMA = json.load(_handle)


def _validator(definition: str) -> Draft202012Validator:
    return Draft202012Validator({"$ref": f"#/$defs/{definition}", "$defs": SCHEMA["$defs"]})


RESPONSE_VALIDATOR = _validator("PredictionResponse")
METADATA_VALIDATOR = _validator("Metadata")


# --- health ---------------------------------------------------------------


def test_health_is_public(client) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert "X-Request-Id" in response.headers


def test_docs_are_served(client) -> None:
    assert client.get("/docs").status_code == 200


# --- auth -----------------------------------------------------------------


def test_login_ok(client) -> None:
    response = client.post(
        "/api/v1/auth/login", data={"username": "engenheiro", "password": "thermal2026"}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["expires_in"] == 480 * 60
    assert body["user"] == {
        "username": "engenheiro",
        "display_name": "João — Engenharia Térmica",
        "role": "engineer",
    }
    assert body["access_token"]


def test_login_admin_ok(client) -> None:
    response = client.post(
        "/api/v1/auth/login", data={"username": "admin", "password": "admin2026"}
    )
    assert response.status_code == 200
    assert response.json()["user"]["role"] == "admin"


def test_login_wrong_password(client) -> None:
    response = client.post(
        "/api/v1/auth/login", data={"username": "engenheiro", "password": "errada"}
    )
    assert response.status_code == 401
    assert response.json() == {"detail": "Usuário ou senha inválidos"}


def test_me_returns_the_user(client, auth) -> None:
    response = client.get("/api/v1/auth/me", headers=auth)
    assert response.status_code == 200
    assert response.json()["username"] == "engenheiro"


@pytest.mark.parametrize(
    "method,path",
    [
        ("get", "/api/v1/metadata"),
        ("post", "/api/v1/predictions"),
        ("get", "/api/v1/auth/me"),
    ],
)
def test_requires_bearer_token(client, method: str, path: str) -> None:
    response = getattr(client, method)(path)
    assert response.status_code == 401
    assert response.json() == {"detail": "Não autenticado"}
    assert response.headers.get("WWW-Authenticate") == "Bearer"


def test_invalid_token_is_rejected(client) -> None:
    response = client.get("/api/v1/metadata", headers={"Authorization": "Bearer nope"})
    assert response.status_code == 401
    assert response.json() == {"detail": "Não autenticado"}


# --- metadata -------------------------------------------------------------


def test_metadata_shape(client, auth) -> None:
    response = client.get("/api/v1/metadata", headers=auth)
    assert response.status_code == 200
    meta = response.json()
    METADATA_VALIDATOR.validate(meta)

    assert meta["contract_version"] == "1.0.0"
    assert len(meta["variables"]) == 7
    assert len(meta["sensors"]) == 77
    assert len(meta["key_areas"]) == 7
    assert sum(a["n_sensors"] for a in meta["key_areas"]) == 77
    assert meta["architectures"] == [
        {"code": "BR", "available": True, "label_pt": "Brasil"},
        {"code": "MX", "available": False, "label_pt": "México (sem dados de treino)"},
    ]
    assert sorted(v["name"] for v in meta["variables"] if not v["used_by_model"]) == [
        "board_position",
        "losses",
    ]
    assert all(v["label_pt"] and len(v["help_pt"]) > 20 for v in meta["variables"])


# --- predictions ----------------------------------------------------------


def test_prediction_happy_path(client, auth, reference_config) -> None:
    response = client.post(
        "/api/v1/predictions",
        headers=auth,
        json={"architecture": "BR", "config": reference_config},
    )
    assert response.status_code == 200
    body = response.json()
    RESPONSE_VALIDATOR.validate(body)

    assert len(body["predictions"]) == 77
    assert body["model_version"] == "mock-0.1.0"
    assert body["architecture_available"] is True
    assert body["ignored_fields"] == ["losses", "board_position"]
    assert response.headers["X-Request-Id"] == body["request_id"]
    assert all(p["reliability"] == "interpolation" for p in body["predictions"])


def test_prediction_targets_filter(client, auth, reference_config) -> None:
    response = client.post(
        "/api/v1/predictions",
        headers=auth,
        json={
            "architecture": "BR",
            "config": reference_config,
            "targets": {"key_areas": ["IPC Comp"]},
        },
    )
    assert response.status_code == 200
    rows = response.json()["predictions"]
    assert rows and all(r["key_area"] == "IPC Comp" for r in rows)


def test_prediction_is_deterministic(client, auth, reference_config) -> None:
    payload = {"architecture": "BR", "config": reference_config}
    first = client.post("/api/v1/predictions", headers=auth, json=payload).json()
    second = client.post("/api/v1/predictions", headers=auth, json=payload).json()
    assert first["predictions"] == second["predictions"]
    assert first["request_id"] == second["request_id"]


def test_mx_is_unavailable_and_empty(client, auth, reference_config) -> None:
    response = client.post(
        "/api/v1/predictions",
        headers=auth,
        json={"architecture": "MX", "config": reference_config},
    )
    assert response.status_code == 200
    body = response.json()
    RESPONSE_VALIDATOR.validate(body)
    assert body["architecture_available"] is False
    assert body["predictions"] == []


def test_invalid_option_returns_422_in_portuguese(client, auth, reference_config) -> None:
    response = client.post(
        "/api/v1/predictions",
        headers=auth,
        json={"architecture": "BR", "config": {**reference_config, "housing": "Aberta"}},
    )
    assert response.status_code == 422
    detail = response.json()["detail"]
    assert isinstance(detail, str)
    assert 'Valor inválido para "housing"' in detail
    assert "Valores aceitos" in detail


def test_invalid_architecture_returns_422(client, auth, reference_config) -> None:
    response = client.post(
        "/api/v1/predictions",
        headers=auth,
        json={"architecture": "AR", "config": reference_config},
    )
    assert response.status_code == 422
    assert "architecture" in response.json()["detail"]


def test_missing_config_field_returns_422(client, auth, reference_config) -> None:
    config = {k: v for k, v in reference_config.items() if k != "losses"}
    response = client.post(
        "/api/v1/predictions", headers=auth, json={"architecture": "BR", "config": config}
    )
    assert response.status_code == 422
    assert "obrigatório" in response.json()["detail"]


# --- access log -----------------------------------------------------------


def test_access_log_records_api_calls(client, auth, reference_config) -> None:
    client.post(
        "/api/v1/predictions",
        headers=auth,
        json={"architecture": "BR", "config": reference_config},
    )
    with Session(get_engine()) as session:
        rows = session.exec(select(AccessLog)).all()

    assert rows, "nenhuma linha em access_log"
    logins = [r for r in rows if r.path.endswith("/auth/login") and r.status_code == 200]
    assert logins and all(r.username in {"engenheiro", "admin"} for r in logins)

    predictions = [r for r in rows if r.path == "/api/v1/predictions" and r.status_code == 200]
    assert predictions
    last = predictions[-1]
    assert last.username == "engenheiro"
    assert last.request_id and last.request_id.startswith("req-")
    assert last.method == "POST"
    assert last.duration_ms >= 0
    assert last.ts_utc is not None

    # /health is public and must not be logged.
    assert all(not r.path.startswith("/health") for r in rows)
