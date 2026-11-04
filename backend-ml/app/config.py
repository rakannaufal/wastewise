from ipaddress import IPv4Network, IPv6Network, collapse_addresses, ip_address, ip_network
from pathlib import Path
from typing import Literal
from urllib.parse import urlsplit

from pydantic import SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import make_url

ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ROOT / "backend-ml/.env", extra="ignore")
    database_url: SecretStr
    jwt_secret: SecretStr
    environment: Literal["development", "test", "production"] = "development"
    auth_provider: Literal["local", "supabase"] = "local"
    public_web_url: str = "http://localhost:5173"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    trusted_proxy_cidrs: str = ""
    public_api_url: str = "http://localhost:8000"
    storage_backend: Literal["local", "supabase"] = "local"
    storage_path: Path = ROOT / ".local/images"
    storage_bucket: str = "waste-images"
    supabase_url: str = ""
    supabase_publishable_key: str = ""
    supabase_service_key: SecretStr = SecretStr("")
    model_path: Path = ROOT / "backend-ml/ml/models/wastewise-v1.pth"
    rate_limit_enabled: bool = True

    @field_validator("trusted_proxy_cidrs")
    @classmethod
    def validate_trusted_proxy_cidrs(cls, value: str) -> str:
        networks = []
        for item in value.split(","):
            item = item.strip()
            if not item:
                continue
            try:
                network = ip_network(item, strict=False)
            except ValueError as exc:
                raise ValueError("TRUSTED_PROXY_CIDRS must contain valid IP networks") from exc
            networks.append(network)
        ipv4_networks = [network for network in networks if isinstance(network, IPv4Network)]
        ipv6_networks = [network for network in networks if isinstance(network, IPv6Network)]
        if any(network.prefixlen == 0 for network in collapse_addresses(ipv4_networks)) or any(
            network.prefixlen == 0 for network in collapse_addresses(ipv6_networks)
        ):
            raise ValueError("TRUSTED_PROXY_CIDRS cannot trust every IP address")
        return ",".join(str(network) for network in networks)

    @property
    def cors_origin_list(self) -> list[str]:
        origins = [value.strip() for value in self.cors_origins.split(",") if value.strip()]
        if self.environment == "production":
            return [self._require_https_origin("CORS_ORIGINS", value) for value in origins]
        return origins

    @property
    def trusted_proxy_networks(self):
        return tuple(ip_network(value) for value in self.trusted_proxy_cidrs.split(",") if value)

    @model_validator(mode="after")
    def validate_secrets(self):
        jwt_secret = self.jwt_secret.get_secret_value()
        if len(jwt_secret.encode()) < 32:
            raise ValueError("JWT_SECRET must contain at least 32 characters")
        if self.environment == "production":
            database_url = make_url(self.database_url.get_secret_value())
            if (
                database_url.get_backend_name() != "postgresql"
                or str(database_url.query.get("sslmode", "")).lower() != "verify-full"
            ):
                raise ValueError("Production DATABASE_URL requires PostgreSQL sslmode=verify-full")
            if jwt_secret.upper().startswith(("REPLACE", "CHANGE_ME", "YOUR_")):
                raise ValueError("Production requires a non-placeholder JWT_SECRET")
            if self.auth_provider != "supabase":
                raise ValueError("Production requires Supabase Auth")
            if self.storage_backend != "supabase":
                raise ValueError("Production requires private Supabase storage")
            if not self.rate_limit_enabled:
                raise ValueError("Production requires rate limiting")
            if not self.trusted_proxy_networks:
                raise ValueError("Production requires explicit trusted proxy CIDRs")
            self.public_web_url = self._require_https_origin(
                "PUBLIC_WEB_URL", self.public_web_url
            )
            self.public_api_url = self._require_https_origin(
                "PUBLIC_API_URL", self.public_api_url
            )
            self.supabase_url = self._require_https_origin("SUPABASE_URL", self.supabase_url)
            origins = self.cors_origin_list
            if not origins or "*" in origins:
                raise ValueError("Production CORS_ORIGINS must be an explicit allowlist")
            if self.public_web_url not in origins:
                raise ValueError("Production CORS_ORIGINS must include PUBLIC_WEB_URL")
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

    @staticmethod
    def _require_https_origin(label: str, value: str) -> str:
        value = value.strip()
        parsed = urlsplit(value)
        hostname = (parsed.hostname or "").lower()
        try:
            port = parsed.port
            hostname = hostname.encode("idna").decode("ascii")
        except (UnicodeError, ValueError) as exc:
            raise ValueError(f"{label} must be a valid HTTPS origin") from exc
        try:
            non_public_ip = not ip_address(hostname).is_global
        except ValueError:
            non_public_ip = False
        if (
            parsed.scheme != "https"
            or not parsed.hostname
            or "@" in parsed.netloc
            or parsed.path not in {"", "/"}
            or parsed.query
            or parsed.fragment
            or "?" in value
            or "#" in value
            or hostname.endswith(".")
            or non_public_ip
            or hostname in {"localhost", "localhost.localdomain"}
            or hostname.endswith((".local", ".localhost", ".internal", ".test"))
            or "." not in hostname
        ):
            raise ValueError(f"{label} must be a public HTTPS origin without a path")
        host = f"[{hostname}]" if ":" in hostname else hostname
        netloc = f"{host}:{port}" if port and port != 443 else host
        return f"https://{netloc}"


settings = Settings()
