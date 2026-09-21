from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str | None = None
    gemini_api_key: str | None = None
    # Second free-tier key from a different GCP project, used only when the
    # first is rate-limited. Quota is per project, not per key.
    gemini_api_key_2: str | None = None
    gemini_model: Literal["gemini-3.5-flash"] = "gemini-3.5-flash"
    jev_model: Literal["jev-1.13.0"] = "jev-1.13.0"
    rule_version: str = "gate-2-v1"
    data_policy: Literal["synthetic-only"] = "synthetic-only"
    typesafe_api_key: str | None = None
    gcs_bucket: str | None = None
    app_version: str = "dev"
    web_dist: str | None = None


@lru_cache
def get_settings() -> Settings:
    return Settings()
