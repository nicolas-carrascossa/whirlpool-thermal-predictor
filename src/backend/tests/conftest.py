"""Shared pytest fixtures: an isolated SQLite file and an authenticated client."""

from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Iterator

import pytest

BACKEND_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = BACKEND_DIR.parent.parent
sys.path.insert(0, str(BACKEND_DIR))

CONTRACT_SCHEMA = REPO_ROOT / "contracts" / "api_v1.schema.json"


@pytest.fixture(scope="session", autouse=True)
def _test_env(tmp_path_factory: pytest.TempPathFactory) -> Iterator[None]:
    """Point the app at a throwaway database before anything imports it."""
    db_path = tmp_path_factory.mktemp("db") / "test.db"
    os.environ["DB_PATH"] = str(db_path)
    os.environ["JWT_SECRET"] = "test-secret-" + "0" * 32

    from app.config import get_settings

    get_settings.cache_clear()
    yield


@pytest.fixture(scope="session")
def client():
    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(scope="session")
def token(client) -> str:
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "engenheiro", "password": "thermal2026"},
    )
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


@pytest.fixture(scope="session")
def auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="session")
def reference_config(client, auth) -> dict[str, str]:
    response = client.get("/api/v1/metadata", headers=auth)
    assert response.status_code == 200, response.text
    return response.json()["reference_config"]
