"""JWT validation for Supabase-issued tokens."""
from typing import Annotated
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from pydantic import BaseModel

from app.core.config import settings

bearer = HTTPBearer()


class TokenPayload(BaseModel):
    sub: str       # Supabase user UUID
    email: str | None = None
    role: str | None = None


def _decode_token(token: str) -> TokenPayload:
    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
        return TokenPayload(**payload)
    except (JWTError, Exception) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        ) from exc


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer)],
) -> TokenPayload:
    return _decode_token(credentials.credentials)


# Convenience type alias for route signatures
CurrentUser = Annotated[TokenPayload, Depends(get_current_user)]
