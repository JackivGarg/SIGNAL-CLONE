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
    turso_database_url: str | None = None
    turso_auth_token: str | None = None

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
