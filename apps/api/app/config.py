from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

_DEFAULT_BUNDLE_DIR = str(
    Path(__file__).resolve().parents[3] / "data" / "sdoc-hackathon-bundle"
)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", extra="ignore", env_ignore_empty=True
    )

    database_url: str | None = None
    gemini_api_key: str | None = None
    # Second free-tier key from a different GCP project, used only when the
    # first is rate-limited. Quota is per project, not per key.
    gemini_api_key_2: str | None = None
    gemini_model: Literal["gemini-3.5-flash"] = "gemini-3.5-flash"
    # The graph-chat path keeps its own pin; flash-lite dropped the
    # temperature/top_p/top_k knobs the extraction path still sets.
    gemini_chat_model: Literal["gemini-3.5-flash-lite"] = "gemini-3.5-flash-lite"
    jev_model: Literal["jev-1.13.0"] = "jev-1.13.0"
    rule_version: str = "gate-2-v1"
    data_policy: Literal["synthetic-only"] = "synthetic-only"
    typesafe_api_key: str | None = None
    gcs_bucket: str | None = None
    app_version: str = "dev"
    web_dist: str | None = None
    bundle_dir: str = _DEFAULT_BUNDLE_DIR
    max_upload_bytes: int = 5 * 1024 * 1024
    demo_owner_id: str = "docs-demo"
    # A crafted upload can burn hundreds of MB while parsing; this bounds
    # how many judge checks run at once per instance.
    max_concurrent_judge_checks: int = 2
    # Each chat builds the corpus subset and waits on the provider; this
    # bounds how many run at once per instance.
    max_concurrent_graph_chats: int = 2


@lru_cache
def get_settings() -> Settings:
    return Settings()
