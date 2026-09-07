from collections.abc import Generator
from pathlib import Path

from sqlalchemy import Engine, create_engine, event
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings


def _create_engine() -> Engine:
    settings = get_settings()

    if settings.uses_turso:
        # sqlalchemy-libsql is installed in the production Docker image only.
        database_url = f"sqlite+{settings.turso_database_url}?secure=true"
        connect_args: dict[str, object] = {"auth_token": settings.turso_auth_token}
    else:
        database_url = settings.database_url
        connect_args = {"check_same_thread": False}
        if database_url.startswith("sqlite:///"):
            Path(database_url.removeprefix("sqlite:///")).parent.mkdir(parents=True, exist_ok=True)

    engine = create_engine(database_url, connect_args=connect_args, pool_pre_ping=True)

    if not settings.uses_turso and database_url.startswith("sqlite"):

        @event.listens_for(engine, "connect")
        def configure_sqlite_connection(dbapi_connection: object, _: object) -> None:
            cursor = dbapi_connection.cursor()  # type: ignore[attr-defined]
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.close()

    return engine


engine = _create_engine()
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    """Yield a transaction-scoped SQLAlchemy session for an HTTP request."""

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
