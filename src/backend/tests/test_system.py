"""API subindo sem os modelos treinados: gera a partir do dataset ou oferece o mock."""

from __future__ import annotations

import subprocess
from pathlib import Path

import pytest

from app import model_setup
from app.config import get_settings
from app.predictors import get_predictor


@pytest.fixture
def real_without_models(monkeypatch, tmp_path: Path):
    """`MODEL_MODE=real`, `MODEL_DIR` vazio e `data/` sem planilhas.

    A geração roda na mesma thread do teste e nunca chama o script de verdade.
    """
    settings = get_settings()
    monkeypatch.setattr(settings, "model_mode", "real")
    monkeypatch.setattr(settings, "model_dir", tmp_path / "models")
    monkeypatch.setattr(model_setup, "DATASET_DIR", tmp_path / "data")
    monkeypatch.setattr(model_setup, "_spawn", lambda target: target())
    model_setup.reset()
    get_predictor.cache_clear()
    yield tmp_path
    model_setup.reset()
    get_predictor.cache_clear()


def _put_dataset(root: Path) -> None:
    (root / "data").mkdir()
    for name in model_setup.AREA_FILES:
        (root / "data" / name).write_text("run_id\n", encoding="utf-8")


def test_status_requires_auth(client) -> None:
    assert client.get("/api/v1/system/models").status_code == 401
    assert client.post("/api/v1/system/mock-mode").status_code == 401


def test_mock_mode_from_env_is_reported(client, auth) -> None:
    body = client.get("/api/v1/system/models", headers=auth).json()
    assert body["state"] == "mock"


def test_without_models_and_dataset_asks_for_mock(client, auth, real_without_models) -> None:
    body = client.get("/api/v1/system/models", headers=auth).json()
    assert body == {
        "state": "no_dataset",
        "message": "Sem dataset. Deseja utilizar comando de dados mockados?",
    }
    # Sem modelos, o preditor real não sobe: 503 com o motivo, não 500.
    response = client.get("/api/v1/metadata", headers=auth)
    assert response.status_code == 503
    assert "npm run modelos:gerar" in response.json()["detail"]


def test_choosing_mock_switches_the_predictor(client, auth, real_without_models) -> None:
    assert client.get("/api/v1/system/models", headers=auth).json()["state"] == "no_dataset"

    body = client.post("/api/v1/system/mock-mode", headers=auth).json()

    assert body["state"] == "mock"
    assert client.get("/api/v1/metadata", headers=auth).status_code == 200
    assert client.get("/health").json()["model_mode"] == "mock"


def test_dataset_present_generates_the_models(client, auth, real_without_models, monkeypatch) -> None:
    _put_dataset(real_without_models)
    calls: list[Path] = []

    def fake_export(model_dir: Path) -> subprocess.CompletedProcess[str]:
        calls.append(model_dir)
        model_dir.mkdir(parents=True)
        (model_dir / "manifest.json").write_text("{}", encoding="utf-8")
        return subprocess.CompletedProcess([], 0, stdout="", stderr="")

    monkeypatch.setattr(model_setup, "_run_export", fake_export)

    first = client.get("/api/v1/system/models", headers=auth).json()

    # O script recebe o MODEL_DIR configurado na API.
    assert calls == [get_settings().model_dir]
    assert first["state"] == "training"
    assert client.get("/api/v1/system/models", headers=auth).json()["state"] == "ready"


def test_failed_generation_is_reported(client, auth, real_without_models, monkeypatch) -> None:
    _put_dataset(real_without_models)
    monkeypatch.setattr(
        model_setup,
        "_run_export",
        lambda _dir: subprocess.CompletedProcess([], 1, stdout="", stderr="ModuleNotFoundError: pandas"),
    )

    client.get("/api/v1/system/models", headers=auth)
    body = client.get("/api/v1/system/models", headers=auth).json()

    assert body["state"] == "failed"
    assert "ModuleNotFoundError: pandas" in body["message"]
