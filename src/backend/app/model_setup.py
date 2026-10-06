"""Garante que a API tenha o que servir quando sobe sem os modelos treinados.

Os modelos (`.joblib` + `manifest.json`) nao sao versionados: vem da base
confidencial do parceiro e sao gerados por `src/scripts/export_models.py`
(`npm run modelos:gerar`). Quem so sobe o back-end e o front-end, sem rodar o
script, cai num destes casos:

- ha modelos em `MODEL_DIR` -> `ready`, nada a fazer;
- nao ha modelos, mas as planilhas de treino estao em `data/` -> `pending`: a
  interface oferece o botao "Gerar os modelos", que chama `start_generation()`;
  a API roda o script em segundo plano (`training`) e passa a `ready` ao terminar.
  Nada comeca sozinho: gerar leva de 5 a 10 minutos de CPU e e escolha da pessoa;
- nao ha modelos nem planilhas -> `no_dataset`: a interface pergunta se a
  pessoa quer usar os dados mockados, e o "sim" chama `use_mock_mode()`.

A escolha pelo mock vale enquanto o processo da API viver ou ate o proximo login
(`forget_mock_choice()`). Reiniciar volta a procurar os modelos, para quem colocar a base depois nao ficar preso no mock.
"""

from __future__ import annotations

import importlib
import importlib.util
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
#: Bibliotecas que o script importa, alem das que a API ja usa.
SCRIPT_DEPENDENCIES = ("pandas", "numpy", "sklearn", "joblib")

State = Literal["ready", "training", "pending", "no_dataset", "failed", "mock"]


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


def missing_dependencies() -> list[str]:
    """Bibliotecas do script ausentes no Python que roda a API."""
    # Sem invalidar, um `pip install` feito com a API no ar so seria visto
    # depois de reinicia-la.
    importlib.invalidate_caches()
    return [name for name in SCRIPT_DEPENDENCIES if importlib.util.find_spec(name) is None]


def _missing_dependencies_message(missing: list[str]) -> str:
    return (
        f"falta {', '.join(missing)} no Python da API. "
        "Instale com `pip install -r src/backend/requirements.txt` no mesmo ambiente "
        "em que a API roda; a geração começa sozinha em seguida."
    )


def _summarize(output: str, returncode: int) -> str:
    """Última linha útil da saída do script, sem o traceback inteiro."""
    lines = [line.strip() for line in output.strip().splitlines() if line.strip()]
    return lines[-1] if lines else f"o script terminou com código {returncode}"


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
            _error = _summarize(result.stderr or result.stdout or "", result.returncode)
        else:
            _error = None
            _clear_caches()
    except OSError as exc:
        _error = str(exc)
    finally:
        with _lock:
            _training = False


def status() -> Status:
    """Estado atual. Nao inicia nada: quem inicia a geracao e `start_generation()`."""
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
    return Status("pending", "Os CSVs foram encontrados em data/, mas os modelos ainda não foram gerados.")


def start_generation() -> Status:
    """Inicia a geracao dos modelos em segundo plano (tambem serve para tentar de novo apos uma falha)."""
    global _training, _error
    if effective_mode() == "mock" or models_available() or not dataset_available():
        return status()
    with _lock:
        if _training:
            return status()
        # Conferido a cada pedido: depois do `pip install`, tentar de novo funciona sem reiniciar a API.
        missing = missing_dependencies()
        if missing:
            _error = _missing_dependencies_message(missing)
            return Status("failed", f"Não foi possível gerar os modelos: {_error}")
        _error = None
        _training = True
    _spawn(_train)
    return Status("training", "Gerando os modelos a partir do dataset encontrado em data/.")


def use_mock_mode() -> Status:
    """Troca o preditor para o mock até a API reiniciar."""
    global _mode_override
    _mode_override = "mock"
    _clear_caches()
    return status()


def forget_mock_choice() -> None:
    """Desfaz a escolha do mock feita pela interface (nao o `MODEL_MODE=mock` do `.env`).

    Chamado a cada login: quem entra de novo recomeca da pergunta dos modelos,
    em vez de cair direto na plataforma por causa de uma escolha de outra sessao.
    """
    global _mode_override
    if _mode_override is None:
        return
    _mode_override = None
    _clear_caches()


def unavailable_message(original: str) -> str:
    """Mensagem para o 503 de quando o preditor real não pode ser criado."""
    if _training:
        return "Os modelos estão sendo gerados a partir do dataset. Aguarde de 5 a 10 minutos."
    return original


def reset() -> None:
    """Volta ao estado inicial. Usado pelos testes."""
    global _training, _error, _mode_override
    with _lock:
        _training = False
        _error = None
        _mode_override = None
