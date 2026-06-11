"""JWT validation for Supabase-issued tokens.

Supabase new projects use ES256 (asymmetric). We fetch the public keys
from the JWKS endpoint and verify with PyJWT.
Falls back to HS256 with the legacy secret for backwards compatibility.
"""
from __future__ import annotations

import logging
import time
from typing import Annotated

import httpx
import jwt as pyjwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

from app.core.config import settings

logger = logging.getLogger(__name__)
bearer = HTTPBearer()

# JWKS cache — refreshed every 5 minutes
_jwks_cache: dict = {}
_jwks_fetched_at: float = 0.0
_JWKS_TTL = 300  # seconds


def _get_jwks() -> dict:
    global _jwks_cache, _jwks_fetched_at
    now = time.monotonic()
    if _jwks_cache and (now - _jwks_fetched_at) < _JWKS_TTL:
        return _jwks_cache
    url = f"{settings.supabase_url}/auth/v1/.well-known/jwks.json"
    resp = httpx.get(url, timeout=10)
    resp.raise_for_status()
    _jwks_cache = resp.json()
    _jwks_fetched_at = now
    logger.info("[Auth] JWKS refreshed from %s", url)
    return _jwks_cache


class TokenPayload(BaseModel):
    sub: str
    email: str | None = None
    role: str | None = None


def _decode_token(token: str) -> TokenPayload:
    # Peek at header to determine algorithm
    try:
        unverified_header = pyjwt.get_unverified_header(token)
    except pyjwt.DecodeError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Ungültiges Token-Format") from exc

    alg = unverified_header.get("alg", "HS256")

    try:
        if alg == "HS256":
            # Legacy secret path
            import base64
            secret_bytes = base64.b64decode(settings.supabase_jwt_secret)
            payload = pyjwt.decode(
                token,
                secret_bytes,
                algorithms=["HS256"],
                options={"verify_aud": False},
            )
        else:
            # ES256 / RS256 — use JWKS
            kid = unverified_header.get("kid")
            jwks = _get_jwks()
            # Find the matching key
            key_data = None
            for k in jwks.get("keys", []):
                if k.get("kid") == kid:
                    key_data = k
                    break
            if key_data is None:
                # Key not found — refresh cache once and retry
                _jwks_fetched_at = 0
                jwks = _get_jwks()
                for k in jwks.get("keys", []):
                    if k.get("kid") == kid:
                        key_data = k
                        break
            if key_data is None:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                                    detail=f"JWT key id '{kid}' not found in JWKS")

            public_key = pyjwt.algorithms.ECAlgorithm.from_jwk(key_data)
            payload = pyjwt.decode(
                token,
                public_key,
                algorithms=[alg],
                options={"verify_aud": False},
            )

        return TokenPayload(
            sub=payload["sub"],
            email=payload.get("email"),
            role=payload.get("role"),
        )

    except pyjwt.ExpiredSignatureError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Token abgelaufen") from exc
    except pyjwt.InvalidTokenError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Ungültiges Token") from exc
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("[Auth] Token decode error: %s", exc)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Token-Verifikation fehlgeschlagen") from exc


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer)],
) -> TokenPayload:
    return _decode_token(credentials.credentials)


CurrentUser = Annotated[TokenPayload, Depends(get_current_user)]
