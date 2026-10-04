"""Application settings, loaded from environment / `.env`."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = BACKEND_DIR.parent.parent
#: The API owns its runtime data. It used to read these files from inside the
#: React source tree (`src/frontend/src/data`), which made the server depend on
#: where the client keeps its sources — the dependency pointing the wrong way.
#: `scripts/build_registry.py` writes here, `app/data.py` reads from here, and
#: the front-end gets this data over HTTP like any other client.
DEFAULT_DATA_DIR = BACKEND_DIR / "data"


class Settings(BaseSettings):
    """Runtime configuration. Every field can be overridden by an env var."""

    model_config = SettingsConfigDict(
        env_file=str(BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- auth ---------------------------------------------------------------
    #: Long enough for HS256 out of the box; override it in any real deployment.
    jwt_secret: str = "dev-secret-change-me-antes-de-qualquer-uso-real"
    jwt_algorithm: str = "HS256"
    jwt_expires_min: int = 480

    # --- predictor ----------------------------------------------------------
    #: `real` (trained artifacts, Fase 3) is the default: the product answers
    #: with the trained models unless someone opts out. `mock` (offline demo,
    #: Fase 1) only runs when asked for explicitly (the test suite does).
    #: This is the ONLY operating switch — the algorithm of each area comes
    #: from the manifest, never from a request or another setting.
    model_mode: str = "real"

    #: Directory with one artifact per (algorithm x key_area) plus
    #: `manifest.json`, produced by `scripts/export_models.py`. Only read when
    #: `model_mode == "real"`.
    model_dir: Path = REPO_ROOT / "models"

    # --- data ---------------------------------------------------------------
    #: Directory holding sensor_registry.json / sensor_stats.json /
    #: variable_options.json / model_manifest.json, produced by
    #: `scripts/build_registry.py` and `scripts/export_models.py`.
    data_dir: Path = DEFAULT_DATA_DIR

    #: SQLite file. Relative paths resolve against `src/backend/`.
    db_path: Path = Path("./thermal.db")

    # --- http ---------------------------------------------------------------
    cors_origins: str = "http://localhost:5173,http://localhost:5174,http://localhost:4173"

    @field_validator("data_dir", "db_path", "model_dir")
    @classmethod
    def _resolve(cls, value: Path) -> Path:
        return value if value.is_absolute() else (BACKEND_DIR / value).resolve()

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def database_url(self) -> str:
        return f"sqlite:///{self.db_path.as_posix()}"


@lru_cache
def get_settings() -> Settings:
    return Settings()
