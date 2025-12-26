"""Application configuration loaded from environment variables."""

import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")


def _require_env(key: str) -> str:
    """Fetch a required environment variable or raise a clear error."""
    value = os.getenv(key)
    if not value:
        raise RuntimeError(f"Environment variable '{key}' must be set.")
    return value


class Config:
    """Default configuration used by the Flask application."""

    SECRET_KEY = _require_env("SECRET_KEY")
    MONGO_URI = _require_env("MONGO_URI")
    MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "Users")
    RAGFLOW_API_BASE = os.getenv("RAGFLOW_API_BASE", "http://localhost:8000").rstrip("/")
    RAGFLOW_UPLOADS_KBID = os.getenv("RAGFLOW_UPLOADS_KBID", "")
    RAGFLOW_AGENT_ID = os.getenv("RAGFLOW_AGENT_ID", "")
    RAGFLOW_API_KEY = os.getenv("RAGFLOW_API_KEY", "")
    ACCOUNT_BUNDLE_DEFAULT_REDIRECT = "/chat"
