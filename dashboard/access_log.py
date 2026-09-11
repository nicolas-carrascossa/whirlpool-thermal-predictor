"""
access_log.py - Histórico de acessos ao dashboard (RF10).

Sem autenticação: login foi removido por decisão do time (ver README) e este
módulo NÃO o reintroduz. Não há senha, não há tela de entrada, não há
bloqueio - qualquer pessoa continua acessando o dashboard livremente. O que
existe aqui é só um REGISTRO de uso: cada sessão nova é gravada
automaticamente (usuário + data/hora), sem pedir nada a quem está usando.

Identificação do usuário: usa o usuário do sistema operacional que está
rodando o processo (`getpass.getuser()`).

SUPOSIÇÃO A CONFIRMAR: isto funciona corretamente quando cada analista roda
a própria instância do dashboard localmente (o caso de uso atual). Num
deploy real com um único servidor atendendo vários usuários por HTTP,
`getpass.getuser()` identificaria sempre o usuário do SERVIDOR, não de quem
está do outro lado do navegador - nesse cenário a identificação precisaria
vir de outro lugar (ex.: cabeçalho de um proxy reverso autenticado). Ajustar
`current_user()` quando o modelo de deploy for definido.
"""

from __future__ import annotations

import csv
import getpass
import os
from datetime import datetime

_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ACCESS_LOG_PATH = os.path.join(_BASE_DIR, "logs", "access_log.csv")
ACCESS_LOG_FIELDS = ["timestamp", "usuario"]


def current_user() -> str:
    """Identificador do usuário para o registro de acesso (sem senha)."""
    try:
        return getpass.getuser() or "desconhecido"
    except Exception:
        return "desconhecido"


def _ensure_log_file() -> None:
    os.makedirs(os.path.dirname(ACCESS_LOG_PATH), exist_ok=True)
    if not os.path.exists(ACCESS_LOG_PATH):
        with open(ACCESS_LOG_PATH, "w", newline="", encoding="utf-8") as handle:
            csv.DictWriter(handle, fieldnames=ACCESS_LOG_FIELDS).writeheader()


def log_access(username: str | None = None) -> dict[str, str]:
    """RF10 - registra um acesso ao dashboard (usuário + data/hora).

    Best-effort: se o arquivo não puder ser gravado (ex.: pasta somente
    leitura), a aplicação não pode quebrar por causa disso - o chamador
    mantém um fallback em `st.session_state` (ver `app.py`).
    """
    entry = {
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "usuario": username or current_user(),
    }
    try:
        _ensure_log_file()
        with open(ACCESS_LOG_PATH, "a", newline="", encoding="utf-8") as handle:
            csv.DictWriter(handle, fieldnames=ACCESS_LOG_FIELDS).writerow(entry)
        entry["persistido"] = "sim"
    except OSError as exc:
        entry["persistido"] = f"não ({exc.__class__.__name__})"
    return entry


def read_access_log() -> list[dict[str, str]]:
    """Histórico de acessos persistido, do mais recente para o mais antigo."""
    if not os.path.exists(ACCESS_LOG_PATH):
        return []
    try:
        with open(ACCESS_LOG_PATH, newline="", encoding="utf-8") as handle:
            rows = list(csv.DictReader(handle))
    except OSError:
        return []
    return list(reversed(rows))
