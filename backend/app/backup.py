"""Create consistent, rotating backups of the production SQLite database."""

import sqlite3
from contextlib import closing
from datetime import UTC, datetime, timedelta
from pathlib import Path

from app.core.config import get_settings


def sqlite_database_path(database_url: str) -> Path:
    if not database_url.startswith("sqlite:///"):
        raise ValueError("Backups are supported only for a local SQLite database.")
    return Path(database_url.removeprefix("sqlite:///"))


def create_backup() -> Path:
    settings = get_settings()
    source_path = sqlite_database_path(settings.database_url)
    if not source_path.is_file():
        raise FileNotFoundError(f"SQLite database does not exist: {source_path}")

    backup_directory = Path(settings.backup_directory)
    backup_directory.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    destination_path = backup_directory / f"signal-{timestamp}.db"

    with closing(sqlite3.connect(source_path)) as source, closing(
        sqlite3.connect(destination_path)
    ) as destination:
        source.backup(destination)

    cutoff = datetime.now(UTC) - timedelta(days=settings.backup_retention_days)
    for backup_path in backup_directory.glob("signal-*.db"):
        modified_at = datetime.fromtimestamp(backup_path.stat().st_mtime, tz=UTC)
        if modified_at < cutoff:
            backup_path.unlink()

    return destination_path


def main() -> None:
    backup_path = create_backup()
    print(f"SQLite backup created: {backup_path}")


if __name__ == "__main__":
    main()
