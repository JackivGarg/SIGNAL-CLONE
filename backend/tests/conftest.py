import os
from collections.abc import Generator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

TEST_DATABASE = Path(__file__).parent / "test_signal.db"
os.environ.update(
    {
        "APP_ENV": "test",
        "APP_SECRET": "test-secret-that-is-not-used-in-production",
        "DATABASE_URL": f"sqlite:///{TEST_DATABASE.as_posix()}",
        "DEMO_MODE": "true",
        "DEMO_OTP": "123456",
        "SESSION_COOKIE_SECURE": "false",
    }
)

from app.core.database import SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Base  # noqa: E402
from app.seed import seed_database  # noqa: E402


@pytest.fixture(autouse=True)
def fresh_database() -> Generator[None, None, None]:
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        seed_database(db)
    yield


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    with TestClient(app) as test_client:
        yield test_client
