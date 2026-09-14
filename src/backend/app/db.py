"""SQLite persistence: users and the access log (RF06, RF10 base)."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Iterator

from sqlmodel import Field, Session, SQLModel, create_engine, select

from app.config import get_settings
from app.security import hash_password


class User(SQLModel, table=True):
    __tablename__ = "user"

    id: int | None = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    display_name: str
    role: str = "engineer"
    password_hash: str


class AccessLog(SQLModel, table=True):
    __tablename__ = "access_log"

    id: int | None = Field(default=None, primary_key=True)
    username: str | None = Field(default=None, index=True)
    ts_utc: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), index=True)
    method: str
    path: str
    request_id: str | None = None
    status_code: int
    duration_ms: float


#: Seed users. Passwords are hashed on first run; never stored in plain text.
SEED_USERS: list[dict[str, str]] = [
    {
        "username": "engenheiro",
        "display_name": "João — Engenharia Térmica",
        "role": "engineer",
        "password": "thermal2026",
    },
    {
        "username": "admin",
        "display_name": "Administrador",
        "role": "admin",
        "password": "admin2026",
    },
]

_engine = None


def get_engine():
    global _engine
    if _engine is None:
        settings = get_settings()
        settings.db_path.parent.mkdir(parents=True, exist_ok=True)
        _engine = create_engine(
            settings.database_url,
            connect_args={"check_same_thread": False},
        )
    return _engine


def reset_engine() -> None:
    """Testing hook: drop the memoized engine so a new DB_PATH takes effect."""
    global _engine
    if _engine is not None:
        _engine.dispose()
    _engine = None


def init_db() -> None:
    """Create tables and seed the demo users (idempotent)."""
    engine = get_engine()
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        for seed in SEED_USERS:
            existing = session.exec(
                select(User).where(User.username == seed["username"])
            ).first()
            if existing:
                continue
            session.add(
                User(
                    username=seed["username"],
                    display_name=seed["display_name"],
                    role=seed["role"],
                    password_hash=hash_password(seed["password"]),
                )
            )
        session.commit()


def get_session() -> Iterator[Session]:
    with Session(get_engine()) as session:
        yield session


def record_access(
    *,
    username: str | None,
    method: str,
    path: str,
    request_id: str | None,
    status_code: int,
    duration_ms: float,
) -> None:
    with Session(get_engine()) as session:
        session.add(
            AccessLog(
                username=username,
                method=method,
                path=path,
                request_id=request_id,
                status_code=status_code,
                duration_ms=duration_ms,
            )
        )
        session.commit()
