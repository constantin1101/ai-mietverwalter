"""Shared FastAPI dependencies."""
from typing import Annotated
from fastapi import Depends, HTTPException, status
from supabase import create_client, Client

from app.core.config import settings
from app.core.auth import get_current_user, TokenPayload


def get_supabase() -> Client:
    """Service-role Supabase client — bypasses RLS for server-side ops."""
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


SupabaseClient = Annotated[Client, Depends(get_supabase)]
CurrentUser = Annotated[TokenPayload, Depends(get_current_user)]


async def check_unit_limit(
    current_user: CurrentUser,
    db: SupabaseClient,
) -> None:
    """Raise 403 if the user has reached their subscription tier's unit limit."""
    sub_resp = (
        db.table("user_subscriptions")
        .select("plan")
        .eq("user_id", current_user.sub)
        .maybe_single()
        .execute()
    )
    plan = (sub_resp.data or {}).get("plan", "free")
    limit = settings.plan_limits.get(plan, 1)

    count_resp = (
        db.table("units")
        .select("id", count="exact")
        .eq("user_id", current_user.sub)
        .execute()
    )
    count = count_resp.count or 0

    if count >= limit:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="unit_limit_reached",
        )
