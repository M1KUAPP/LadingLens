from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str | None = None
    gemini_api_key: str | None = None
    # Second free-tier key from a different GCP project, used only when the
    # first is rate-limited. Quota is per project, not per key.
    gemini_api_key_2: str | None = None
    # Flash-Lite: 500 requests/day on the free tier (Flash allows only 20).
    gemini_model: str = "gemini-3.5-flash-lite"
    typesafe_api_key: str | None = None
    openai_api_key: str | None = None
    gcs_bucket: str | None = None
    app_version: str = "dev"
    web_dist: str | None = None


@lru_cache
def get_settings() -> Settings:
    return Settings()
