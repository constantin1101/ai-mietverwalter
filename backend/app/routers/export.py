"""Export router — delegates to services/excel_export.py."""
from __future__ import annotations

import asyncio
import logging
from datetime import date

from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse

from app.core.dependencies import CurrentUser, SupabaseClient
from app.services.excel_export import build_workbook

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/export", tags=["export"])


def _run(db, fn):
    return asyncio.get_event_loop().run_in_executor(None, fn)


@router.get("/excel")
async def export_excel(
    current_user: CurrentUser,
    db: SupabaseClient,
    date_from: date | None = Query(None, description="Fristen-Filter von (ISO-Datum)"),
    date_to: date | None = Query(None, description="Fristen-Filter bis (ISO-Datum)"),
    city: str | None = Query(None, description="Nur Einheiten dieser Stadt"),
) -> StreamingResponse:
    """Generate an 8-sheet Excel workbook for the user's portfolio."""
    uid = current_user.sub

    # ── Fetch units ─────────────────────────────────────────────────────────
    units_resp = await _run(db, lambda: db.table("units")
        .select("id, property_id, unit_number, area_sqm, rooms, floor, has_cellar, has_parking, parking_number")
        .eq("user_id", uid).execute())
    units: list[dict] = units_resp.data or []

    prop_ids = list({u["property_id"] for u in units if u.get("property_id")})
    if prop_ids:
        props_resp = await _run(db, lambda: db.table("properties")
            .select("id, street, house_number, city, postal_code")
            .in_("id", prop_ids).execute())
        props: dict[str, dict] = {p["id"]: p for p in (props_resp.data or [])}
    else:
        props = {}

    # Optional city filter — remove units whose property is not in the requested city
    if city:
        city_lower = city.strip().lower()
        units = [u for u in units if props.get(u.get("property_id", ""), {}).get("city", "").lower() == city_lower]

    # ── Fetch leases ─────────────────────────────────────────────────────────
    leases_resp = await _run(db, lambda: db.table("leases")
        .select("*").eq("user_id", uid).eq("is_active", True).execute())
    leases: list[dict] = leases_resp.data or []

    unit_ids = {u["id"] for u in units}
    leases = [l for l in leases if l.get("unit_id") in unit_ids]
    lease_by_unit: dict[str, dict] = {l["unit_id"]: l for l in leases}

    # ── Fetch tenants ────────────────────────────────────────────────────────
    lease_ids = [l["id"] for l in leases]
    if lease_ids:
        lt_resp = await _run(db, lambda: db.table("lease_tenants")
            .select("lease_id, tenant_id, is_primary")
            .in_("lease_id", lease_ids).execute())
        all_lt: list[dict] = lt_resp.data or []
        primary_by_lease: dict[str, str] = {lt["lease_id"]: lt["tenant_id"] for lt in all_lt if lt.get("is_primary")}
        all_tenant_ids = list({lt["tenant_id"] for lt in all_lt})
        t_resp = await _run(db, lambda: db.table("tenants")
            .select("id, first_name, last_name, email, phone")
            .in_("id", all_tenant_ids).execute())
        tenants_by_id: dict[str, dict] = {t["id"]: t for t in (t_resp.data or [])}
    else:
        all_lt = []
        primary_by_lease = {}
        tenants_by_id = {}

    # ── Fetch deadlines ──────────────────────────────────────────────────────
    dl_resp = await _run(db, lambda: db.table("deadlines")
        .select("id, title, due_date, deadline_type, is_completed, unit_id")
        .eq("user_id", uid).eq("is_completed", False)
        .order("due_date").execute())
    deadlines: list[dict] = dl_resp.data or []

    # ── Fetch rent adjustments ───────────────────────────────────────────────
    if lease_ids:
        ra_resp = await _run(db, lambda: db.table("rent_adjustments")
            .select("*")
            .in_("lease_id", lease_ids)
            .order("effective_date").execute())
        rent_adjustments: list[dict] = ra_resp.data or []
    else:
        rent_adjustments = []

    # ── Fetch documents ──────────────────────────────────────────────────────
    docs_resp = await _run(db, lambda: db.table("documents")
        .select("id, filename, document_type, status, created_at, file_size_bytes, unit_id")
        .eq("user_id", uid)
        .order("created_at", desc=True).execute())
    documents: list[dict] = docs_resp.data or []

    # ── Build & stream ───────────────────────────────────────────────────────
    data = {
        "units": units,
        "props": props,
        "leases": leases,
        "lease_by_unit": lease_by_unit,
        "all_lt": all_lt,
        "primary_by_lease": primary_by_lease,
        "tenants_by_id": tenants_by_id,
        "deadlines": deadlines,
        "rent_adjustments": rent_adjustments,
        "documents": documents,
    }

    xlsx_bytes = await asyncio.get_event_loop().run_in_executor(
        None, lambda: build_workbook(data, date_from=date_from, date_to=date_to)
    )

    filename = f"heimio-export-{date.today().isoformat()}.xlsx"
    return StreamingResponse(
        iter([xlsx_bytes]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
