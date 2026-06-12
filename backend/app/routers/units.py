"""Units router — portfolio overview and unit detail endpoints."""
from __future__ import annotations

import asyncio
import logging
from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.core.dependencies import CurrentUser, SupabaseClient

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/units", tags=["units"])


# ── Response models ────────────────────────────────────────────────────────────

class TenantSummary(BaseModel):
    id: str
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None

class LeaseSummary(BaseModel):
    id: str
    start_date: str
    end_date: Optional[str] = None
    is_fixed_term: bool
    notice_period_months: int
    base_rent: float
    operating_costs: Optional[float] = None
    deposit: Optional[float] = None
    payment_day: int
    payment_method: Optional[str] = None
    rent_type: str
    cosmetic_repairs_clause: Optional[str] = None
    pets_allowed: Optional[bool] = None
    subletting_allowed: Optional[bool] = None

class PropertySummary(BaseModel):
    id: str
    street: str
    house_number: str
    city: str
    postal_code: str

class UnitCard(BaseModel):
    id: str
    property_id: str
    street: str
    house_number: str
    city: str
    postal_code: str
    unit_number: Optional[str] = None
    floor: Optional[int] = None
    area_sqm: Optional[float] = None
    rooms: Optional[float] = None
    has_cellar: bool = False
    has_parking: bool = False
    lease_id: str
    base_rent: float
    operating_costs: Optional[float] = None
    rent_type: str
    primary_tenant_name: str
    primary_tenant_email: Optional[str] = None

class UnitDetail(BaseModel):
    id: str
    property: PropertySummary
    unit_number: Optional[str] = None
    floor: Optional[int] = None
    area_sqm: Optional[float] = None
    rooms: Optional[float] = None
    has_cellar: bool = False
    has_parking: bool = False
    parking_number: Optional[str] = None
    lease: LeaseSummary
    tenants: list[TenantSummary]
    deadlines: list[dict]
    documents: list[dict]

class PortfolioKPIs(BaseModel):
    total_units: int
    total_monthly_rent: float
    avg_rent_per_sqm: Optional[float] = None
    upcoming_deadlines: int  # deadlines in next 30 days


# ── Helpers ────────────────────────────────────────────────────────────────────

def _run(db, fn):
    return asyncio.get_event_loop().run_in_executor(None, fn)


# ── GET /portfolio/kpis ────────────────────────────────────────────────────────

@router.get("/kpis", response_model=PortfolioKPIs)
async def get_portfolio_kpis(
    current_user: CurrentUser,
    db: SupabaseClient,
) -> PortfolioKPIs:
    uid = current_user.sub

    # Units with active leases
    units_resp = await _run(db, lambda: db.table("units")
        .select("id, area_sqm")
        .eq("user_id", uid)
        .eq("status", "occupied")
        .execute())
    units = units_resp.data or []

    leases_resp = await _run(db, lambda: db.table("leases")
        .select("base_rent")
        .eq("user_id", uid)
        .eq("is_active", True)
        .execute())
    leases = leases_resp.data or []

    total_rent = sum(float(l["base_rent"] or 0) for l in leases)
    areas = [float(u["area_sqm"]) for u in units if u.get("area_sqm")]
    total_area = sum(areas)
    avg_per_sqm = round(total_rent / total_area, 2) if total_area > 0 else None

    # Upcoming deadlines (next 30 days)
    today = date.today().isoformat()
    in_30 = (date.today() + timedelta(days=30)).isoformat()
    deadlines_resp = await _run(db, lambda: db.table("deadlines")
        .select("id", count="exact")
        .eq("user_id", uid)
        .eq("is_completed", False)
        .gte("due_date", today)
        .lte("due_date", in_30)
        .execute())

    return PortfolioKPIs(
        total_units=len(leases),
        total_monthly_rent=total_rent,
        avg_rent_per_sqm=avg_per_sqm,
        upcoming_deadlines=deadlines_resp.count or 0,
    )


# ── GET /units ─────────────────────────────────────────────────────────────────

@router.get("", response_model=list[UnitCard])
async def list_units(
    current_user: CurrentUser,
    db: SupabaseClient,
) -> list[UnitCard]:
    uid = current_user.sub

    # Get occupied units
    units_resp = await _run(db, lambda: db.table("units")
        .select("id, property_id, unit_number, floor, area_sqm, rooms, has_cellar, has_parking")
        .eq("user_id", uid)
        .eq("status", "occupied")
        .execute())
    units = units_resp.data or []
    if not units:
        return []

    unit_ids = [u["id"] for u in units]
    prop_ids = list({u["property_id"] for u in units})

    # Fetch properties
    props_resp = await _run(db, lambda: db.table("properties")
        .select("id, street, house_number, city, postal_code")
        .in_("id", prop_ids)
        .execute())
    props = {p["id"]: p for p in (props_resp.data or [])}

    # Fetch active leases
    leases_resp = await _run(db, lambda: db.table("leases")
        .select("id, unit_id, base_rent, operating_costs, rent_type")
        .eq("user_id", uid)
        .eq("is_active", True)
        .in_("unit_id", unit_ids)
        .execute())
    lease_by_unit = {l["unit_id"]: l for l in (leases_resp.data or [])}

    # Fetch primary tenants via lease_tenants
    lease_ids = [l["id"] for l in (leases_resp.data or [])]
    if lease_ids:
        lt_resp = await _run(db, lambda: db.table("lease_tenants")
            .select("lease_id, tenant_id")
            .eq("is_primary", True)
            .in_("lease_id", lease_ids)
            .execute())
        primary_tenant_ids = {lt["lease_id"]: lt["tenant_id"] for lt in (lt_resp.data or [])}

        tenant_ids = list(primary_tenant_ids.values())
        tenants_resp = await _run(db, lambda: db.table("tenants")
            .select("id, first_name, last_name, email")
            .in_("id", tenant_ids)
            .execute())
        tenants_by_id = {t["id"]: t for t in (tenants_resp.data or [])}
    else:
        primary_tenant_ids = {}
        tenants_by_id = {}

    cards: list[UnitCard] = []
    for unit in units:
        lease = lease_by_unit.get(unit["id"])
        if not lease:
            continue
        prop = props.get(unit["property_id"], {})
        tid = primary_tenant_ids.get(lease["id"])
        tenant = tenants_by_id.get(tid, {}) if tid else {}

        cards.append(UnitCard(
            id=unit["id"],
            property_id=unit["property_id"],
            street=prop.get("street", ""),
            house_number=prop.get("house_number", ""),
            city=prop.get("city", ""),
            postal_code=prop.get("postal_code", ""),
            unit_number=unit.get("unit_number"),
            floor=unit.get("floor"),
            area_sqm=unit.get("area_sqm"),
            rooms=unit.get("rooms"),
            has_cellar=bool(unit.get("has_cellar")),
            has_parking=bool(unit.get("has_parking")),
            lease_id=lease["id"],
            base_rent=float(lease["base_rent"] or 0),
            operating_costs=float(lease["operating_costs"]) if lease.get("operating_costs") else None,
            rent_type=lease.get("rent_type") or "fixed",
            primary_tenant_name=f"{tenant.get('first_name', '')} {tenant.get('last_name', '')}".strip() or "Unbekannt",
            primary_tenant_email=tenant.get("email"),
        ))

    return sorted(cards, key=lambda c: (c.city, c.street))


# ── Tracker response models ────────────────────────────────────────────────────

class StaffelAlert(BaseModel):
    unit_id: str
    address: str
    tenant_name: str
    current_rent: float
    next_rent: float
    next_date: str
    days_until: int

class IndexAlert(BaseModel):
    unit_id: str
    address: str
    tenant_name: str
    current_rent: float
    index_type: str
    base_date: Optional[str]
    interval_months: int
    months_since_base: int

class TrackersResponse(BaseModel):
    staffel_alerts: list[StaffelAlert]
    index_alerts: list[IndexAlert]


# ── GET /units/trackers ────────────────────────────────────────────────────────

@router.get("/trackers", response_model=TrackersResponse)
async def get_trackers(
    current_user: CurrentUser,
    db: SupabaseClient,
) -> TrackersResponse:
    uid = current_user.sub
    today = date.today()

    # ── Staffel alerts ────────────────────────────────────────────────────────
    adj_resp = await _run(db, lambda: db.table("rent_adjustments")
        .select("id, lease_id, effective_date, new_rent, previous_rent, adjustment_type")
        .eq("user_id", uid)
        .eq("adjustment_type", "graduated")
        .gt("effective_date", today.isoformat())
        .order("effective_date")
        .execute())
    adjustments = adj_resp.data or []

    staffel_alerts: list[StaffelAlert] = []
    if adjustments:
        adj_lease_ids = list({a["lease_id"] for a in adjustments})

        adj_leases_resp = await _run(db, lambda: db.table("leases")
            .select("id, unit_id")
            .in_("id", adj_lease_ids)
            .execute())
        adj_lease_map = {l["id"]: l for l in (adj_leases_resp.data or [])}

        adj_unit_ids = list({l["unit_id"] for l in adj_lease_map.values()})
        adj_units_resp = await _run(db, lambda: db.table("units")
            .select("id, property_id, unit_number")
            .in_("id", adj_unit_ids)
            .execute())
        adj_unit_map = {u["id"]: u for u in (adj_units_resp.data or [])}

        adj_prop_ids = list({u["property_id"] for u in adj_unit_map.values()})
        adj_props_resp = await _run(db, lambda: db.table("properties")
            .select("id, street, house_number")
            .in_("id", adj_prop_ids)
            .execute())
        adj_prop_map = {p["id"]: p for p in (adj_props_resp.data or [])}

        adj_lt_resp = await _run(db, lambda: db.table("lease_tenants")
            .select("lease_id, tenant_id")
            .eq("is_primary", True)
            .in_("lease_id", adj_lease_ids)
            .execute())
        adj_primary_tenant_ids = {lt["lease_id"]: lt["tenant_id"] for lt in (adj_lt_resp.data or [])}

        adj_tenant_ids = list(adj_primary_tenant_ids.values())
        adj_tenants_map: dict = {}
        if adj_tenant_ids:
            adj_tenants_resp = await _run(db, lambda: db.table("tenants")
                .select("id, first_name, last_name")
                .in_("id", adj_tenant_ids)
                .execute())
            adj_tenants_map = {t["id"]: t for t in (adj_tenants_resp.data or [])}

        for adj in adjustments:
            lease = adj_lease_map.get(adj["lease_id"])
            if not lease:
                continue
            unit = adj_unit_map.get(lease["unit_id"])
            if not unit:
                continue
            prop = adj_prop_map.get(unit.get("property_id", ""), {})
            address = f"{prop.get('street', '')} {prop.get('house_number', '')}".strip()
            tid = adj_primary_tenant_ids.get(adj["lease_id"])
            tenant = adj_tenants_map.get(tid, {}) if tid else {}
            tenant_name = f"{tenant.get('first_name', '')} {tenant.get('last_name', '')}".strip() or "Unbekannt"

            next_date_str = str(adj["effective_date"])
            next_date = date.fromisoformat(next_date_str)
            days_until = (next_date - today).days

            staffel_alerts.append(StaffelAlert(
                unit_id=lease["unit_id"],
                address=address,
                tenant_name=tenant_name,
                current_rent=float(adj.get("previous_rent") or 0),
                next_rent=float(adj.get("new_rent") or 0),
                next_date=next_date_str,
                days_until=days_until,
            ))

    # ── Index alerts ──────────────────────────────────────────────────────────
    idx_leases_resp = await _run(db, lambda: db.table("leases")
        .select("id, unit_id, base_rent, rent_type, index_type, index_base_date, index_adjustment_interval, start_date")
        .eq("user_id", uid)
        .eq("rent_type", "indexed")
        .eq("is_active", True)
        .execute())
    idx_leases = idx_leases_resp.data or []

    index_alerts: list[IndexAlert] = []
    if idx_leases:
        idx_unit_ids = list({l["unit_id"] for l in idx_leases})
        idx_units_resp = await _run(db, lambda: db.table("units")
            .select("id, property_id, unit_number")
            .in_("id", idx_unit_ids)
            .execute())
        idx_unit_map = {u["id"]: u for u in (idx_units_resp.data or [])}

        idx_prop_ids = list({u["property_id"] for u in idx_unit_map.values()})
        idx_props_resp = await _run(db, lambda: db.table("properties")
            .select("id, street, house_number")
            .in_("id", idx_prop_ids)
            .execute())
        idx_prop_map = {p["id"]: p for p in (idx_props_resp.data or [])}

        idx_lease_ids = [l["id"] for l in idx_leases]
        idx_lt_resp = await _run(db, lambda: db.table("lease_tenants")
            .select("lease_id, tenant_id")
            .eq("is_primary", True)
            .in_("lease_id", idx_lease_ids)
            .execute())
        idx_primary_tenant_ids = {lt["lease_id"]: lt["tenant_id"] for lt in (idx_lt_resp.data or [])}

        idx_tenant_ids = list(idx_primary_tenant_ids.values())
        idx_tenants_map: dict = {}
        if idx_tenant_ids:
            idx_tenants_resp = await _run(db, lambda: db.table("tenants")
                .select("id, first_name, last_name")
                .in_("id", idx_tenant_ids)
                .execute())
            idx_tenants_map = {t["id"]: t for t in (idx_tenants_resp.data or [])}

        for lease in idx_leases:
            interval_months = int(lease.get("index_adjustment_interval") or 12)
            raw_base = lease.get("index_base_date") or lease.get("start_date")
            if not raw_base:
                continue
            base_date = date.fromisoformat(str(raw_base))
            months_since = (today.year - base_date.year) * 12 + (today.month - base_date.month)
            if months_since < interval_months:
                continue

            unit = idx_unit_map.get(lease["unit_id"])
            if not unit:
                continue
            prop = idx_prop_map.get(unit.get("property_id", ""), {})
            address = f"{prop.get('street', '')} {prop.get('house_number', '')}".strip()
            tid = idx_primary_tenant_ids.get(lease["id"])
            tenant = idx_tenants_map.get(tid, {}) if tid else {}
            tenant_name = f"{tenant.get('first_name', '')} {tenant.get('last_name', '')}".strip() or "Unbekannt"

            index_alerts.append(IndexAlert(
                unit_id=lease["unit_id"],
                address=address,
                tenant_name=tenant_name,
                current_rent=float(lease.get("base_rent") or 0),
                index_type=lease.get("index_type") or "VPI",
                base_date=str(lease["index_base_date"]) if lease.get("index_base_date") else None,
                interval_months=interval_months,
                months_since_base=months_since,
            ))

    return TrackersResponse(staffel_alerts=staffel_alerts, index_alerts=index_alerts)


# ── GET /units/{id} ────────────────────────────────────────────────────────────

@router.get("/{unit_id}", response_model=UnitDetail)
async def get_unit_detail(
    unit_id: str,
    current_user: CurrentUser,
    db: SupabaseClient,
) -> UnitDetail:
    uid = current_user.sub

    # Unit
    unit_resp = await _run(db, lambda: db.table("units")
        .select("*")
        .eq("id", unit_id)
        .eq("user_id", uid)
        .single()
        .execute())
    if not unit_resp.data:
        raise HTTPException(status_code=404, detail="Einheit nicht gefunden.")
    unit = unit_resp.data

    # Property
    prop_resp = await _run(db, lambda: db.table("properties")
        .select("id, street, house_number, city, postal_code")
        .eq("id", unit["property_id"])
        .single()
        .execute())
    prop = prop_resp.data or {}

    # Active lease
    lease_resp = await _run(db, lambda: db.table("leases")
        .select("*")
        .eq("unit_id", unit_id)
        .eq("is_active", True)
        .maybe_single()
        .execute())
    lease = lease_resp.data
    if not lease:
        raise HTTPException(status_code=404, detail="Kein aktiver Mietvertrag gefunden.")

    # Tenants
    lt_resp = await _run(db, lambda: db.table("lease_tenants")
        .select("tenant_id, is_primary")
        .eq("lease_id", lease["id"])
        .execute())
    tenant_ids = [lt["tenant_id"] for lt in (lt_resp.data or [])]
    primary_ids = {lt["tenant_id"] for lt in (lt_resp.data or []) if lt["is_primary"]}

    tenants: list[TenantSummary] = []
    if tenant_ids:
        t_resp = await _run(db, lambda: db.table("tenants")
            .select("id, first_name, last_name, email, phone")
            .in_("id", tenant_ids)
            .execute())
        tenants = [
            TenantSummary(
                id=t["id"],
                first_name=t["first_name"],
                last_name=t["last_name"],
                email=t.get("email"),
                phone=t.get("phone"),
            )
            for t in (t_resp.data or [])
        ]
        # Primary tenant first
        tenants.sort(key=lambda t: (t.id not in primary_ids))

    # Deadlines
    dl_resp = await _run(db, lambda: db.table("deadlines")
        .select("id, title, due_date, deadline_type, is_completed, notify_days_before")
        .eq("unit_id", unit_id)
        .eq("is_completed", False)
        .order("due_date")
        .execute())
    deadlines = dl_resp.data or []

    # Documents
    doc_resp = await _run(db, lambda: db.table("documents")
        .select("id, filename, document_type, status, created_at, file_size_bytes")
        .eq("unit_id", unit_id)
        .eq("user_id", uid)
        .order("created_at", desc=True)
        .execute())
    documents = doc_resp.data or []

    return UnitDetail(
        id=unit["id"],
        property=PropertySummary(
            id=prop.get("id", ""),
            street=prop.get("street", ""),
            house_number=prop.get("house_number", ""),
            city=prop.get("city", ""),
            postal_code=prop.get("postal_code", ""),
        ),
        unit_number=unit.get("unit_number"),
        floor=unit.get("floor"),
        area_sqm=unit.get("area_sqm"),
        rooms=unit.get("rooms"),
        has_cellar=bool(unit.get("has_cellar")),
        has_parking=bool(unit.get("has_parking")),
        parking_number=unit.get("parking_number"),
        lease=LeaseSummary(
            id=lease["id"],
            start_date=str(lease["start_date"]),
            end_date=str(lease["end_date"]) if lease.get("end_date") else None,
            is_fixed_term=bool(lease["is_fixed_term"]),
            notice_period_months=int(lease["notice_period_months"] or 3),
            base_rent=float(lease["base_rent"] or 0),
            operating_costs=float(lease["operating_costs"]) if lease.get("operating_costs") else None,
            deposit=float(lease["deposit"]) if lease.get("deposit") else None,
            payment_day=int(lease["payment_day"] or 1),
            payment_method=lease.get("payment_method"),
            rent_type=lease.get("rent_type") or "fixed",
            cosmetic_repairs_clause=lease.get("cosmetic_repairs_clause"),
            pets_allowed=lease.get("pets_allowed"),
            subletting_allowed=lease.get("subletting_allowed"),
        ),
        tenants=tenants,
        deadlines=deadlines,
        documents=documents,
    )


# ── PATCH request models ───────────────────────────────────────────────────────

class UnitPatch(BaseModel):
    unit_number: Optional[str] = None
    floor: Optional[int] = None
    area_sqm: Optional[float] = None
    rooms: Optional[float] = None
    has_cellar: Optional[bool] = None
    has_parking: Optional[bool] = None
    parking_number: Optional[str] = None

class LeasePatch(BaseModel):
    base_rent: Optional[float] = None
    operating_costs: Optional[float] = None
    deposit: Optional[float] = None
    payment_day: Optional[int] = None
    payment_method: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_fixed_term: Optional[bool] = None
    notice_period_months: Optional[int] = None
    rent_type: Optional[str] = None
    cosmetic_repairs_clause: Optional[str] = None
    pets_allowed: Optional[bool] = None
    subletting_allowed: Optional[bool] = None

class TenantPatch(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None

class UnitEditPayload(BaseModel):
    unit: Optional[UnitPatch] = None
    lease: Optional[LeasePatch] = None
    tenant: Optional[TenantPatch] = None


# ── PATCH /units/{id} ─────────────────────────────────────────────────────────

@router.patch("/{unit_id}", response_model=UnitDetail)
async def update_unit(
    unit_id: str,
    payload: UnitEditPayload,
    current_user: CurrentUser,
    db: SupabaseClient,
) -> UnitDetail:
    uid = current_user.sub

    # Verify ownership
    check = await _run(db, lambda: db.table("units")
        .select("id")
        .eq("id", unit_id)
        .eq("user_id", uid)
        .maybe_single()
        .execute())
    if not check.data:
        raise HTTPException(status_code=404, detail="Einheit nicht gefunden.")

    # ── Update units table ────────────────────────────────────────────────────
    if payload.unit is not None:
        unit_data = payload.unit.model_dump(exclude_unset=True)
        if unit_data:
            await _run(db, lambda: db.table("units")
                .update(unit_data)
                .eq("id", unit_id)
                .execute())

    # ── Update active lease ───────────────────────────────────────────────────
    if payload.lease is not None:
        lease_data = payload.lease.model_dump(exclude_unset=True)
        if lease_data:
            # Validate before writing
            if "base_rent" in lease_data and (lease_data["base_rent"] is None or lease_data["base_rent"] <= 0):
                raise HTTPException(status_code=422, detail="Kaltmiete muss größer als 0 sein.")
            if "payment_day" in lease_data and lease_data["payment_day"] is not None:
                if not (1 <= lease_data["payment_day"] <= 28):
                    raise HTTPException(status_code=422, detail="Zahltag muss zwischen 1 und 28 liegen.")

            # Convert date objects to ISO strings for Supabase
            for key in ("start_date", "end_date"):
                if key in lease_data and isinstance(lease_data[key], date):
                    lease_data[key] = lease_data[key].isoformat()

            lease_resp = await _run(db, lambda: db.table("leases")
                .select("id")
                .eq("unit_id", unit_id)
                .eq("is_active", True)
                .maybe_single()
                .execute())
            if not lease_resp.data:
                raise HTTPException(status_code=404, detail="Kein aktiver Mietvertrag gefunden.")
            lease_id = lease_resp.data["id"]

            await _run(db, lambda: db.table("leases")
                .update(lease_data)
                .eq("id", lease_id)
                .execute())

    # ── Update primary tenant ─────────────────────────────────────────────────
    if payload.tenant is not None:
        tenant_data = payload.tenant.model_dump(exclude_unset=True)
        if tenant_data:
            lease_resp2 = await _run(db, lambda: db.table("leases")
                .select("id")
                .eq("unit_id", unit_id)
                .eq("is_active", True)
                .maybe_single()
                .execute())
            if lease_resp2.data:
                lt_resp = await _run(db, lambda: db.table("lease_tenants")
                    .select("tenant_id")
                    .eq("lease_id", lease_resp2.data["id"])
                    .eq("is_primary", True)
                    .maybe_single()
                    .execute())
                if lt_resp.data:
                    tenant_id = lt_resp.data["tenant_id"]
                    await _run(db, lambda: db.table("tenants")
                        .update(tenant_data)
                        .eq("id", tenant_id)
                        .execute())

    # Return refreshed detail
    return await get_unit_detail(unit_id, current_user, db)
