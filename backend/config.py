import sys
from pathlib import Path
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from dotenv import load_dotenv

def _resolve_env_file() -> str:
    if getattr(sys, "frozen", False):
        return str(Path(sys.executable).resolve().parent / ".env")
    return str(Path(__file__).resolve().parents[2] / ".env")

ENV_FILE_PATH = _resolve_env_file()
if Path(ENV_FILE_PATH).exists():
    load_dotenv(ENV_FILE_PATH, override=False)

class Settings(BaseSettings):
    # Application
    APP_NAME: str = "KashiKart"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    API_V1_PREFIX: str = "/api/v1"

    # Database
    DATABASE_URL: str
    DATABASE_PASSWORD: str

    # Security
    SECRET_KEY: str
    ENCRYPTION_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # SMTP
    SMTP_USER: str
    SMTP_PASSWORD: str
    SMTP_FROM_EMAIL: str
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_TLS: bool = True

    # Frontend
    FRONTEND_URL: str = "http://localhost:3000"
    BACKEND_URL: str = "http://localhost:8000"

    # Pydantic v2 settings
    model_config = SettingsConfigDict(
        env_file=ENV_FILE_PATH,
        case_sensitive=True,
        extra="ignore"
    )

settings = Settings()
