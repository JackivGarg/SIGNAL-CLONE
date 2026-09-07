import sqlite3
from contextlib import closing

from app.backup import create_backup


def test_sqlite_backup_is_readable() -> None:
    backup_path = create_backup()
    try:
        with closing(sqlite3.connect(backup_path)) as connection:
            user_count = connection.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        assert user_count == 4
    finally:
        backup_path.unlink(missing_ok=True)
