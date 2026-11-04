import pytest
from pydantic import ValidationError
from starlette.requests import Request

from app.config import Settings, settings
from app.security import client_ip

PRODUCTION = {
    "database_url": "postgresql+psycopg://runtime:password@db.example.com/wastewise?sslmode=verify-full",
    "jwt_secret": "a-different-random-production-secret-value",
    "environment": "production",
    "auth_provider": "supabase",
    "storage_backend": "supabase",
    "rate_limit_enabled": True,
    "trusted_proxy_cidrs": "10.0.0.0/8",
    "public_web_url": "https://app.example.com",
    "public_api_url": "https://api.example.com",
    "cors_origins": "https://app.example.com",
    "supabase_url": "https://project.supabase.co",
    "supabase_publishable_key": "sb_publishable_test",
    "supabase_service_key": "sb_secret_test",
}


def settings_with(**overrides):
    values = {**PRODUCTION, **overrides}
    return Settings(_env_file=None, **values)


def test_production_configuration_accepts_private_https_services():
    assert settings_with().environment == "production"

def test_cors_allowlist_trims_whitespace():
    value = settings_with(
        cors_origins="https://app.example.com, https://admin.example.com,"
    )
    assert value.cors_origin_list == [
        "https://app.example.com",
        "https://admin.example.com",
    ]

def test_production_cors_origins_are_normalized_for_exact_origin_matching():
    value = settings_with(
        public_web_url="https://APP.example.com:443/",
        cors_origins=" https://app.example.com:443/ ",
    )
    assert value.cors_origin_list == ["https://app.example.com"]
    assert value.public_web_url == "https://app.example.com"

def test_forwarded_ip_requires_a_trusted_proxy(monkeypatch):
    monkeypatch.setattr(settings, "trusted_proxy_cidrs", "10.0.0.0/8")
    request = Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/",
            "headers": [(b"x-forwarded-for", b"198.51.100.8")],
            "client": ("203.0.113.9", 5000),
        }
    )
    assert client_ip(request) == "203.0.113.9"

def test_forwarded_ip_walks_back_through_trusted_proxy_chain(monkeypatch):
    monkeypatch.setattr(settings, "trusted_proxy_cidrs", "10.0.0.0/8")
    request = Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/",
            "headers": [(b"x-forwarded-for", b"198.51.100.8, 10.0.0.7")],
            "client": ("10.0.0.9", 5000),
        }
    )
    assert client_ip(request) == "198.51.100.8"


@pytest.mark.parametrize(
    "override",
    [
        {"auth_provider": "local"},
        {"storage_backend": "local"},
        {"rate_limit_enabled": False},
        {"trusted_proxy_cidrs": ""},
        {"public_web_url": "http://app.example.com"},
        {"public_api_url": "https://192.168.1.8"},
        {"public_api_url": "https://127.0.0.1."},
        {"public_web_url": "https://localhost."},
        {"supabase_url": "https://project.supabase.co/auth"},
        {"cors_origins": "*"},
        {"cors_origins": "https://other.example.com"},
        {"public_web_url": "https://@app.example.com"},
        {"public_web_url": "https://app.example.com:not-a-port"},
        {"jwt_secret": "REPLACE_WITH_A_RANDOM_SECRET_LONG_ENOUGH"},
        {"trusted_proxy_cidrs": "not-an-ip"},
        {"trusted_proxy_cidrs": "0.0.0.0/0"},
        {"trusted_proxy_cidrs": "::/0"},
        {"trusted_proxy_cidrs": "0.0.0.0/1,128.0.0.0/1"},
        {"trusted_proxy_cidrs": "::/1,8000::/1"},
        {"database_url": "postgresql+psycopg://runtime:password@db.example.com/wastewise"},
        {
            "database_url": "postgresql+psycopg://runtime:password@db.example.com/wastewise?sslmode=require"
        },
        {
            "database_url": "postgresql+psycopg://runtime:password@db.example.com/wastewise?sslmode=verify-ca"
        },
    ],
)
def test_production_configuration_rejects_unsafe_settings(override):
    with pytest.raises(ValidationError):
        settings_with(**override)


def test_development_can_use_local_auth_and_http_origins():
    value = Settings(
        _env_file=None,
        database_url="postgresql+psycopg://runtime:password@localhost/wastewise",
        jwt_secret="development-only-secret-at-least-thirty-two",
        environment="development",
    )
    assert value.auth_provider == "local"
