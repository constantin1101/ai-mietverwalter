"""
Mietspiegel router — market rent comparison data.

GET /mietspiegel/cities              → list of supported city names  (public)
GET /mietspiegel/{city}              → all bands for a city           (public)
GET /mietspiegel/{city}/lookup       → comparison for area_sqm        (public)
GET /portfolio/market-overview       → per-unit comparison for user   (auth)
"""
from __future__ import annotations

import asyncio
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.core.dependencies import CurrentUser, SupabaseClient
from app.utils.rent_calculator import (
    get_city_data,
    get_market_comparison,
    get_supported_cities,
)

router = APIRouter(tags=["mietspiegel"])


def _run(fn):
    return asyncio.get_event_loop().run_in_executor(None, fn)


# ── Response models ────────────────────────────────────────────────────────────

class MietspiegelBand(BaseModel):
    label: str
    sqm_min: float
    sqm_max: float | None
    min: float
    avg: float
    max: float


class CityMietspiegel(BaseModel):
    city: str
    state: str
    source: str
    data_year: int
    bands: list[MietspiegelBand]


class MarketComparison(BaseModel):
    city: str
    city_supported: bool
    band_label: str
    sqm_min: float
    sqm_max: float | None
    rent_min: float
    rent_avg: float
    rent_max: float
    data_year: int
    source: str


class UnitMarketData(BaseModel):
    unit_id: str
    address: str
    tenant_name: str
    area_sqm: float
    base_rent: float
    current_per_sqm: float
    market_avg: float
    market_min: float
    market_max: float
    band_label: str
    delta_per_sqm: float
    delta_pct: float
    bucket: str            # "below" | "at" | "above"
    monthly_potential: float   # extra €/mo at market avg (0 if at/above)
    city: str
    city_supported: bool
    data_year: int


class PortfolioMarketSummary(BaseModel):
    total_units_compared: int
    units_below_market: int
    units_at_market: int
    units_above_market: int
    total_monthly_potential: float   # sum of monthly_potential across below-market units


class PortfolioMarketOverview(BaseModel):
    units: list[UnitMarketData]
    summary: PortfolioMarketSummary


# ── Public endpoints ───────────────────────────────────────────────────────────

@router.get("/mietspiegel/cities", response_model=list[str])
def list_cities() -> list[str]:
    return get_supported_cities()


@router.get("/mietspiegel/{city}", response_model=CityMietspiegel)
def get_city_mietspiegel(city: str) -> CityMietspiegel:
    data = get_city_data(city)
    if not data:
        raise HTTPException(
            status_code=404,
            detail=f"Keine Mietspiegeldaten für '{city}'. Verfügbare Städte: {', '.join(get_supported_cities())}",
        )
    return CityMietspiegel(
        city=data["display_name"],
        state=data["state"],
        source=data["source"],
        data_year=data["data_year"],
        bands=[
            MietspiegelBand(
                label=b["label"],
                sqm_min=b["sqm_min"],
                sqm_max=b["sqm_max"],
                min=b["min"],
                avg=b["avg"],
                max=b["max"],
            )
            for b in data["bands"]
        ],
    )


@router.get("/mietspiegel/{city}/lookup", response_model=MarketComparison)
def lookup_market_rent(
    city: str,
    area_sqm: float = Query(..., gt=0, description="Wohnfläche in m²"),
) -> MarketComparison:
    result = get_market_comparison(city, area_sqm)
    if not result:
        raise HTTPException(status_code=404, detail=f"Keine Mietspiegeldaten für '{city}'.")
    return MarketComparison(**result)


# ── Authenticated: portfolio overview ─────────────────────────────────────────

@router.get("/portfolio/market-overview", response_model=PortfolioMarketOverview)
async def portfolio_market_overview(
    current_user: CurrentUser,
    db: SupabaseClient,
) -> PortfolioMarketOverview:
    """
    Compare every active unit against market rent data.
    Only units with known city AND area_sqm are included.
    """
    uid = current_user.sub

    # Fetch units + properties + leases + primary tenants
    units_resp = await _run(lambda: db.table("units")
        .select("id, property_id, area_sqm")
        .eq("user_id", uid).execute())
    units: list[dict] = units_resp.data or []

    prop_ids = list({u["property_id"] for u in units if u.get("property_id")})
    if not prop_ids:
        return PortfolioMarketOverview(units=[], summary=PortfolioMarketSummary(
            total_units_compared=0, units_below_market=0,
            units_at_market=0, units_above_market=0,
            total_monthly_potential=0.0,
        ))

    props_resp = await _run(lambda: db.table("properties")
        .select("id, street, house_number, city")
        .in_("id", prop_ids).execute())
    props: dict[str, dict] = {p["id"]: p for p in (props_resp.data or [])}

    leases_resp = await _run(lambda: db.table("leases")
        .select("id, unit_id, base_rent")
        .eq("user_id", uid).eq("is_active", True).execute())
    leases: list[dict] = leases_resp.data or []
    lease_by_unit: dict[str, dict] = {l["unit_id"]: l for l in leases}

    lease_ids = [l["id"] for l in leases]
    primary_by_lease: dict[str, str] = {}
    tenants_by_id: dict[str, dict] = {}
    if lease_ids:
        lt_resp = await _run(lambda: db.table("lease_tenants")
            .select("lease_id, tenant_id, is_primary")
            .in_("lease_id", lease_ids).eq("is_primary", True).execute())
        primary_by_lease = {r["lease_id"]: r["tenant_id"] for r in (lt_resp.data or [])}
        tenant_ids = list(primary_by_lease.values())
        if tenant_ids:
            t_resp = await _run(lambda: db.table("tenants")
                .select("id, first_name, last_name")
                .in_("id", tenant_ids).execute())
            tenants_by_id = {t["id"]: t for t in (t_resp.data or [])}

    result_units: list[UnitMarketData] = []

    for unit in units:
        area = unit.get("area_sqm")
        lease = lease_by_unit.get(unit["id"])
        if not lease or not area:
            continue

        prop = props.get(unit.get("property_id", ""), {})
        city = prop.get("city", "")
        if not city:
            continue

        market = get_market_comparison(city, float(area))
        if not market:
            continue

        base_rent = float(lease.get("base_rent") or 0)
        current_per_sqm = base_rent / float(area)
        delta_per_sqm = current_per_sqm - market["rent_avg"]
        delta_pct = delta_per_sqm / market["rent_avg"] if market["rent_avg"] else 0

        if delta_pct < -0.05:
            bucket = "below"
        elif delta_pct > 0.05:
            bucket = "above"
        else:
            bucket = "at"

        # Monthly potential = what extra rent would come from market avg rent
        market_rent_at_avg = market["rent_avg"] * float(area)
        monthly_potential = max(0.0, round(market_rent_at_avg - base_rent, 2))

        tid = primary_by_lease.get(lease["id"])
        tenant = tenants_by_id.get(tid, {}) if tid else {}
        tenant_name = f"{tenant.get('first_name', '')} {tenant.get('last_name', '')}".strip()
        address = f"{prop.get('street', '')} {prop.get('house_number', '')}".strip()

        result_units.append(UnitMarketData(
            unit_id=unit["id"],
            address=address,
            tenant_name=tenant_name,
            area_sqm=float(area),
            base_rent=base_rent,
            current_per_sqm=round(current_per_sqm, 2),
            market_avg=market["rent_avg"],
            market_min=market["rent_min"],
            market_max=market["rent_max"],
            band_label=market["band_label"],
            delta_per_sqm=round(delta_per_sqm, 2),
            delta_pct=round(delta_pct, 4),
            bucket=bucket,
            monthly_potential=monthly_potential,
            city=market["city"],
            city_supported=True,
            data_year=market["data_year"],
        ))

    below = [u for u in result_units if u.bucket == "below"]
    at = [u for u in result_units if u.bucket == "at"]
    above = [u for u in result_units if u.bucket == "above"]
    total_potential = round(sum(u.monthly_potential for u in below), 2)

    return PortfolioMarketOverview(
        units=result_units,
        summary=PortfolioMarketSummary(
            total_units_compared=len(result_units),
            units_below_market=len(below),
            units_at_market=len(at),
            units_above_market=len(above),
            total_monthly_potential=total_potential,
        ),
    )
