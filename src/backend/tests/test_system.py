"""API subindo sem os modelos treinados: gera a pedido a partir do dataset ou oferece o mock."""

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
    # O script nunca roda de verdade aqui; o ambiente de testes nem precisa de pandas.
    monkeypatch.setattr(model_setup, "missing_dependencies", lambda: [])
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
    assert client.post("/api/v1/system/models/generate").status_code == 401


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


def test_a_new_login_forgets_the_mock_choice(client, auth, real_without_models) -> None:
    """Quem sai e entra de novo recomeça da pergunta, não da plataforma em mock."""
    assert client.post("/api/v1/system/mock-mode", headers=auth).json()["state"] == "mock"

    login = client.post("/api/v1/auth/login", data={"username": "engenheiro", "password": "thermal2026"})
    assert login.status_code == 200
    fresh = {"Authorization": f"Bearer {login.json()['access_token']}"}

    assert client.get("/api/v1/system/models", headers=fresh).json()["state"] == "no_dataset"


def test_dataset_without_models_waits_for_the_button(client, auth, real_without_models, monkeypatch) -> None:
    """Com os CSVs e sem modelos, consultar o estado não gera nada sozinho."""
    _put_dataset(real_without_models)
    calls: list[Path] = []
    monkeypatch.setattr(model_setup, "_run_export", lambda model_dir: calls.append(model_dir))

    body = client.get("/api/v1/system/models", headers=auth).json()

    assert body["state"] == "pending"
    assert calls == []


def test_generate_runs_the_script_with_the_configured_model_dir(
    client, auth, real_without_models, monkeypatch
) -> None:
    _put_dataset(real_without_models)
    calls: list[Path] = []

    def fake_export(model_dir: Path) -> subprocess.CompletedProcess[str]:
        calls.append(model_dir)
        model_dir.mkdir(parents=True)
        (model_dir / "manifest.json").write_text("{}", encoding="utf-8")
        return subprocess.CompletedProcess([], 0, stdout="", stderr="")

    monkeypatch.setattr(model_setup, "_run_export", fake_export)

    first = client.post("/api/v1/system/models/generate", headers=auth).json()

    assert calls == [get_settings().model_dir]
    assert first["state"] == "training"
    assert client.get("/api/v1/system/models", headers=auth).json()["state"] == "ready"


def test_generate_without_dataset_does_nothing(client, auth, real_without_models, monkeypatch) -> None:
    calls: list[Path] = []
    monkeypatch.setattr(model_setup, "_run_export", lambda model_dir: calls.append(model_dir))

    body = client.post("/api/v1/system/models/generate", headers=auth).json()

    assert body["state"] == "no_dataset"
    assert calls == []


def test_missing_library_is_reported_before_running_the_script(
    client, auth, real_without_models, monkeypatch
) -> None:
    """O caso real: a API instalada sem pandas não pode rodar o script."""
    _put_dataset(real_without_models)
    monkeypatch.setattr(model_setup, "missing_dependencies", lambda: ["pandas"])
    calls: list[Path] = []
    monkeypatch.setattr(model_setup, "_run_export", lambda model_dir: calls.append(model_dir))

    body = client.post("/api/v1/system/models/generate", headers=auth).json()

    assert body["state"] == "failed"
    assert "falta pandas no Python da API" in body["message"]
    assert "pip install -r src/backend/requirements.txt" in body["message"]
    assert calls == []

    # Depois do `pip install`, clicar de novo já inicia a geração, sem reiniciar.
    monkeypatch.setattr(model_setup, "missing_dependencies", lambda: [])
    monkeypatch.setattr(
        model_setup,
        "_run_export",
        lambda _dir: subprocess.CompletedProcess([], 1, stdout="", stderr="erro"),
    )
    assert client.post("/api/v1/system/models/generate", headers=auth).json()["state"] == "training"


def test_failed_generation_shows_only_the_last_line(client, auth, real_without_models, monkeypatch) -> None:
    _put_dataset(real_without_models)
    traceback = (
        "Traceback (most recent call last):\n"
        '  File "export_models.py", line 64, in <module>\n'
        "    import numpy\n"
        "ValueError: planilha sem a coluna run_id\n"
    )
    monkeypatch.setattr(
        model_setup,
        "_run_export",
        lambda _dir: subprocess.CompletedProcess([], 1, stdout="", stderr=traceback),
    )

    client.post("/api/v1/system/models/generate", headers=auth)
    body = client.get("/api/v1/system/models", headers=auth).json()

    assert body["state"] == "failed"
    assert body["message"] == "Não foi possível gerar os modelos: ValueError: planilha sem a coluna run_id"


def test_the_api_requirements_cover_the_script() -> None:
    """A geração a pedido roda o script com o Python da API: ele precisa de pandas."""
    requirements = (Path(model_setup.BACKEND_DIR) / "requirements.txt").read_text(encoding="utf-8")
    assert "pandas" in requirements
