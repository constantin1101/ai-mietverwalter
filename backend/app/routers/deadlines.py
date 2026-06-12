"""Deadlines router — portfolio-wide deadline listing."""
from __future__ import annotations

import asyncio
import logging
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

from app.core.dependencies import CurrentUser, SupabaseClient

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/deadlines", tags=["deadlines"])


# ── Response models ────────────────────────────────────────────────────────────

class DeadlineCard(BaseModel):
    id: str
    title: str
    due_date: str
    deadline_type: str
    is_completed: bool
    unit_id: Optional[str] = None
    address: Optional[str] = None
    tenant_name: Optional[str] = None


# ── Helpers ────────────────────────────────────────────────────────────────────

def _run(db, fn):
    return asyncio.get_event_loop().run_in_executor(None, fn)


# ── GET /deadlines ─────────────────────────────────────────────────────────────

@router.get("", response_model=list[DeadlineCard])
async def list_deadlines(
    current_user: CurrentUser,
    db: SupabaseClient,
) -> list[DeadlineCard]:
    uid = current_user.sub

    dl_resp = await _run(db, lambda: db.table("deadlines")
        .select("id, title, due_date, deadline_type, is_completed, unit_id")
        .eq("user_id", uid)
        .eq("is_completed", False)
        .order("due_date")
        .execute())
    deadlines = dl_resp.data or []

    if not deadlines:
        return []

    unit_ids = list({d["unit_id"] for d in deadlines if d.get("unit_id")})

    prop_map: dict = {}
    unit_map: dict = {}
    primary_tenant_by_unit: dict = {}

    if unit_ids:
        units_resp = await _run(db, lambda: db.table("units")
            .select("id, property_id, unit_number")
            .in_("id", unit_ids)
            .execute())
        unit_map = {u["id"]: u for u in (units_resp.data or [])}

        prop_ids = list({u["property_id"] for u in unit_map.values()})
        if prop_ids:
            props_resp = await _run(db, lambda: db.table("properties")
                .select("id, street, house_number, city, postal_code")
                .in_("id", prop_ids)
                .execute())
            prop_map = {p["id"]: p for p in (props_resp.data or [])}

        leases_resp = await _run(db, lambda: db.table("leases")
            .select("id, unit_id")
            .eq("user_id", uid)
            .eq("is_active", True)
            .in_("unit_id", unit_ids)
            .execute())
        lease_by_unit = {l["unit_id"]: l["id"] for l in (leases_resp.data or [])}

        lease_ids = list(lease_by_unit.values())
        if lease_ids:
            lt_resp = await _run(db, lambda: db.table("lease_tenants")
                .select("lease_id, tenant_id")
                .eq("is_primary", True)
                .in_("lease_id", lease_ids)
                .execute())
            lease_to_tenant = {lt["lease_id"]: lt["tenant_id"] for lt in (lt_resp.data or [])}

            tenant_ids = list(lease_to_tenant.values())
            if tenant_ids:
                tenants_resp = await _run(db, lambda: db.table("tenants")
                    .select("id, first_name, last_name")
                    .in_("id", tenant_ids)
                    .execute())
                tenants_by_id = {t["id"]: t for t in (tenants_resp.data or [])}

                for unit_id, lease_id in lease_by_unit.items():
                    tid = lease_to_tenant.get(lease_id)
                    if tid:
                        tenant = tenants_by_id.get(tid, {})
                        primary_tenant_by_unit[unit_id] = (
                            f"{tenant.get('first_name', '')} {tenant.get('last_name', '')}".strip()
                            or "Unbekannt"
                        )

    result: list[DeadlineCard] = []
    for d in deadlines:
        uid_dl = d.get("unit_id")
        address: Optional[str] = None
        tenant_name: Optional[str] = None

        if uid_dl:
            unit = unit_map.get(uid_dl, {})
            prop = prop_map.get(unit.get("property_id", ""), {})
            if prop:
                address = (
                    f"{prop.get('street', '')} {prop.get('house_number', '')}, "
                    f"{prop.get('postal_code', '')} {prop.get('city', '')}".strip(", ")
                )
            tenant_name = primary_tenant_by_unit.get(uid_dl)

        result.append(DeadlineCard(
            id=d["id"],
            title=d["title"],
            due_date=str(d["due_date"]),
            deadline_type=d["deadline_type"],
            is_completed=bool(d["is_completed"]),
            unit_id=uid_dl,
            address=address,
            tenant_name=tenant_name,
        ))

    return result
