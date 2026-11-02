from pathlib import Path
from typing import Literal

from pydantic import SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ROOT / "backend-ml/.env", extra="ignore")
    database_url: SecretStr
    jwt_secret: SecretStr
    environment: Literal["development", "test", "production"] = "development"
    auth_provider: Literal["local", "supabase"] = "local"
    public_web_url: str = "http://localhost:5173"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    public_api_url: str = "http://localhost:8000"
    storage_backend: Literal["local", "supabase"] = "local"
    storage_path: Path = ROOT / ".local/images"
    storage_bucket: str = "waste-images"
    supabase_url: str = ""
    supabase_publishable_key: str = ""
    supabase_service_key: SecretStr = SecretStr("")
    model_path: Path = ROOT / "backend-ml/ml/models/wastewise-v1.pth"
    rate_limit_enabled: bool = True

    @model_validator(mode="after")
    def validate_secrets(self):
        if len(self.jwt_secret.get_secret_value()) < 32:
            raise ValueError("JWT_SECRET must contain at least 32 characters")
        if self.environment == "production" and self.storage_backend == "local":
            raise ValueError("Production requires private Supabase storage")
        if self.auth_provider == "supabase" and (
            not self.supabase_url.startswith("https://") or not self.supabase_publishable_key
        ):
            raise ValueError("Supabase Auth requires an HTTPS URL and publishable key")
        if self.storage_backend == "supabase" and (
            not self.supabase_url.startswith("https://")
            or not self.supabase_service_key.get_secret_value()
        ):
            raise ValueError("Supabase HTTPS URL and service key are required")
        return self


settings = Settings()
