"""Garante que a API tenha o que servir quando sobe sem os modelos treinados.

Os modelos (`.joblib` + `manifest.json`) nao sao versionados: vem da base
confidencial do parceiro e sao gerados por `src/scripts/export_models.py`
(`npm run modelos:gerar`). Quem so sobe o back-end e o front-end, sem rodar o
script, cai num destes casos:

- ha modelos em `MODEL_DIR` -> `ready`, nada a fazer;
- nao ha modelos, mas as planilhas de treino estao em `data/` -> a propria API
  roda o script em segundo plano (`training`) e passa a `ready` ao terminar;
- nao ha modelos nem planilhas -> `no_dataset`: a interface pergunta se a
  pessoa quer usar os dados mockados, e o "sim" chama `use_mock_mode()`.

A escolha pelo mock vale enquanto o processo da API viver. Reiniciar volta a
procurar os modelos, para quem colocar a base depois nao ficar preso no mock.
"""

from __future__ import annotations

import os
import subprocess
import sys
import threading
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Literal

from app.config import BACKEND_DIR, get_settings

REPO_ROOT = BACKEND_DIR.parent.parent
EXPORT_SCRIPT = REPO_ROOT / "src" / "scripts" / "export_models.py"
#: Onde o script le as planilhas (`DATA_DIR` de `export_models.py`).
DATASET_DIR = REPO_ROOT / "data"
#: Mesmos nomes de `AREA_FILES` em `src/scripts/export_models.py`. Duplicados de
#: proposito: o script importa pandas no topo, e o back-end nao depende de pandas.
AREA_FILES = (
    "mainback_data.csv",
    "coil_temps_data.csv",
    "main_vent_sys_data.csv",
    "ipc_cooling_data.csv",
    "ipc_comp_data.csv",
    "ct_knobs_data.csv",
    "oven_hmi_data.csv",
)
MANIFEST_NAME = "manifest.json"

State = Literal["ready", "training", "no_dataset", "failed", "mock"]


@dataclass(frozen=True)
class Status:
    state: State
    message: str


_lock = threading.Lock()
_training = False
_error: str | None = None
_mode_override: str | None = None


def _run_export(model_dir: Path) -> subprocess.CompletedProcess[str]:
    """Roda o mesmo script de `npm run modelos:gerar`, com o Python desta API."""
    return subprocess.run(
        [sys.executable, str(EXPORT_SCRIPT), "--model-dir", str(model_dir)],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        env={**os.environ, "PYTHONIOENCODING": "utf-8"},
    )


def _spawn(target: Callable[[], None]) -> None:
    threading.Thread(target=target, name="export-models", daemon=True).start()


def effective_mode() -> str:
    """`MODEL_MODE` do `.env`, ou `mock` depois que a interface escolheu o mock."""
    return _mode_override or get_settings().model_mode.lower()


def models_available() -> bool:
    return (get_settings().model_dir / MANIFEST_NAME).exists()


def dataset_available() -> bool:
    return all((DATASET_DIR / name).exists() for name in AREA_FILES)


def _clear_caches() -> None:
    # Import local: `app.predictors` importa este modulo.
    from app.data import load_dataset
    from app.predictors import get_predictor

    get_predictor.cache_clear()
    # O script tambem regrava `data/model_manifest.json`, que o dataset le.
    load_dataset.cache_clear()


def _train() -> None:
    global _training, _error
    try:
        result = _run_export(get_settings().model_dir)
        if result.returncode != 0:
            output = (result.stderr or result.stdout or "").strip().splitlines()
            _error = "\n".join(output[-5:]) or f"o script terminou com codigo {result.returncode}"
        else:
            _error = None
            _clear_caches()
    except OSError as exc:
        _error = str(exc)
    finally:
        with _lock:
            _training = False


def status() -> Status:
    """Estado atual; inicia a geracao dos modelos quando ha planilhas e nao ha modelos."""
    global _training
    if effective_mode() == "mock":
        return Status("mock", "A API está respondendo com os dados mockados.")
    if models_available():
        return Status("ready", "Modelos treinados carregados.")
    with _lock:
        if _training:
            return Status("training", "Gerando os modelos a partir do dataset encontrado em data/.")
        if _error is not None:
            return Status("failed", f"Não foi possível gerar os modelos: {_error}")
        if not dataset_available():
            return Status("no_dataset", "Sem dataset. Deseja utilizar comando de dados mockados?")
        _training = True
    _spawn(_train)
    return Status("training", "Gerando os modelos a partir do dataset encontrado em data/.")


def use_mock_mode() -> Status:
    """Troca o preditor para o mock até a API reiniciar."""
    global _mode_override
    _mode_override = "mock"
    _clear_caches()
    return status()


def unavailable_message(original: str) -> str:
    """Mensagem para o 503 de quando o preditor real não pode ser criado."""
    if _training:
        return "Os modelos estão sendo gerados a partir do dataset. Aguarde cerca de 1 minuto."
    return original


def reset() -> None:
    """Volta ao estado inicial. Usado pelos testes."""
    global _training, _error, _mode_override
    with _lock:
        _training = False
        _error = None
        _mode_override = None
