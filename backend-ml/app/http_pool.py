"""Reuse TLS connections without caching credentials, identity checks or roles."""

from functools import lru_cache

import httpx


@lru_cache(maxsize=1)
def supabase_client() -> httpx.Client:
    return httpx.Client(
        timeout=15,
        follow_redirects=False,
        limits=httpx.Limits(max_connections=12, max_keepalive_connections=6, keepalive_expiry=30),
    )


def close_http_pool():
    if supabase_client.cache_info().currsize:
        supabase_client().close()
        supabase_client.cache_clear()
