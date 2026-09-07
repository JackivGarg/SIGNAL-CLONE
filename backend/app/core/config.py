from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuration loaded from environment variables and the local .env file."""

    app_env: str = "development"
    app_secret: str = "local-development-secret"
    database_url: str = "sqlite:///./data/signal.db"
    demo_mode: bool = True
    demo_otp: str = "123456"
    session_cookie_secure: bool = False
    session_cookie_name: str = "signal_session"
    session_duration_days: int = 30
    cors_origins: str = "http://localhost:3000"
    turso_database_url: str | None = None
    turso_auth_token: str | None = None

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"

    @property
    def uses_turso(self) -> bool:
        return bool(self.turso_database_url and self.turso_auth_token)

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
