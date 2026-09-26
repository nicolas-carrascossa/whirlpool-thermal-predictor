"""SQLite persistence: users and the access log (RF06, RF10 base)."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Iterator

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
    """One row per API call. The prediction route fills the model columns.

    Traceability is the point: three months from now, with the area -> algorithm
    mapping already changed, one has to be able to tell which model produced a
    given number. That is why `model_set_version` and `area_algorithms` are
    recorded per call, and not merely derived from today's manifest.
    """

    __tablename__ = "access_log"

    id: int | None = Field(default=None, primary_key=True)
    username: str | None = Field(default=None, index=True)
    ts_utc: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), index=True)
    method: str
    path: str
    request_id: str | None = None
    status_code: int
    duration_ms: float

    # --- prediction context (NULL on every other route) --------------------
    #: Own column: it is what one filters by later.
    architecture: str | None = Field(default=None, index=True)
    #: Own column, same reason.
    model_set_version: str | None = Field(default=None, index=True)
    #: The 7 config variables, one column each — they are the query itself.
    blower_direction: str | None = None
    housing: str | None = None
    board_position: str | None = None
    run_case: str | None = None
    losses: str | None = None
    deflector_hole: str | None = None
    material_coil_support: str | None = None
    #: Slice as submitted, JSON text: keeps the schema from exploding.
    targets_json: str | None = None
    #: key_area -> algorithm ACTUALLY applied in this call, JSON text. The
    #: mapping is configuration and changes over time; the response does not
    #: stay reproducible from the manifest alone.
    area_algorithms_json: str | None = None
    #: Areas left out because their model never saw a requested category.
    skipped_areas_json: str | None = None


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


def _add_missing_columns(engine) -> None:
    """Minimal migration for `access_log`.

    `create_all` does not ALTER existing tables, so a `thermal.db` created
    before the v1.1 columns would keep failing on every write. SQLite accepts
    `ADD COLUMN` for nullable columns, which is all these are.
    """
    from sqlalchemy import inspect, text

    inspector = inspect(engine)
    if "access_log" not in inspector.get_table_names():
        return
    existing = {c["name"] for c in inspector.get_columns("access_log")}
    wanted = {
        name: "TEXT"
        for name in (
            "architecture",
            "model_set_version",
            "blower_direction",
            "housing",
            "board_position",
            "run_case",
            "losses",
            "deflector_hole",
            "material_coil_support",
            "targets_json",
            "area_algorithms_json",
            "skipped_areas_json",
        )
    }
    missing = {name: kind for name, kind in wanted.items() if name not in existing}
    if not missing:
        return
    with engine.begin() as connection:
        for name, kind in missing.items():
            connection.execute(text(f"ALTER TABLE access_log ADD COLUMN {name} {kind}"))


def init_db() -> None:
    """Create tables, migrate `access_log` and seed the demo users (idempotent)."""
    engine = get_engine()
    _add_missing_columns(engine)
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
    prediction: dict[str, Any] | None = None,
) -> None:
    """Persist one access. `prediction` is the context published by the
    predictions route in `request.state`; every other route passes `None` and
    the model columns stay NULL."""
    context = prediction or {}
    with Session(get_engine()) as session:
        session.add(
            AccessLog(
                username=username,
                method=method,
                path=path,
                request_id=request_id,
                status_code=status_code,
                duration_ms=duration_ms,
                architecture=context.get("architecture"),
                model_set_version=context.get("model_set_version"),
                blower_direction=context.get("blower_direction"),
                housing=context.get("housing"),
                board_position=context.get("board_position"),
                run_case=context.get("run_case"),
                losses=context.get("losses"),
                deflector_hole=context.get("deflector_hole"),
                material_coil_support=context.get("material_coil_support"),
                targets_json=context.get("targets_json"),
                area_algorithms_json=context.get("area_algorithms_json"),
                skipped_areas_json=context.get("skipped_areas_json"),
            )
        )
        session.commit()
