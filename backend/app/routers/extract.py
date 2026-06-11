"""Extraction router — orchestrates OCR + AI extraction + DB persistence."""
from __future__ import annotations

import asyncio
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.core.config import settings
from app.core.dependencies import CurrentUser, SupabaseClient
from app.models.extraction import ExtractionResult
from app.services.ai.extract import extract_lease_data
from app.services.ocr.pipeline import extract_text_from_bytes
from app.utils.deadline_generator import generate_deadlines_from_lease

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/extract", tags=["extraction"])


# ── Response / Request models ──────────────────────────────────────────────────

class ExtractionRequest(BaseModel):
    document_id: str
    unit_id: Optional[str] = None


class ExtractionReviewResponse(BaseModel):
    document_id: str
    extraction: dict          # raw JSON for the frontend review dialog
    validation_errors: list[dict]
    ocr_text_preview: str     # first 500 chars for debugging


class ConfirmExtractionRequest(BaseModel):
    document_id: str
    extraction: dict          # possibly user-corrected
    create_unit: bool = True


class ConfirmResponse(BaseModel):
    unit_id: Optional[str] = None
    lease_id: Optional[str] = None
    deadlines_created: int


# ── Helpers ────────────────────────────────────────────────────────────────────

def _run_sync(fn, *args):
    """Run a synchronous Supabase call in the thread pool to avoid blocking the event loop."""
    loop = asyncio.get_event_loop()
    return loop.run_in_executor(None, fn, *args)


# ── POST /extract ──────────────────────────────────────────────────────────────

@router.post("", response_model=ExtractionReviewResponse)
async def start_extraction(
    body: ExtractionRequest,
    current_user: CurrentUser,
    db: SupabaseClient,
) -> ExtractionReviewResponse:
    """
    1. Fetch document from Supabase (must belong to current user)
    2. Download file bytes from Storage
    3. OCR → AI extraction
    4. Return structured data for review
    """
    # --- 1. Fetch document record ---
    doc_resp = await asyncio.get_event_loop().run_in_executor(
        None,
        lambda: db.table("documents")
            .select("id, file_path, mime_type, status, user_id")
            .eq("id", body.document_id)
            .eq("user_id", current_user.sub)
            .single()
            .execute(),
    )
    if not doc_resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dokument nicht gefunden.")

    doc = doc_resp.data
    file_path: str = doc["file_path"]
    mime_type: str = doc.get("mime_type") or "application/pdf"

    # --- 2. Mark as processing ---
    await asyncio.get_event_loop().run_in_executor(
        None,
        lambda: db.table("documents")
            .update({"status": "processing"})
            .eq("id", body.document_id)
            .execute(),
    )

    try:
        # --- 3. Download file bytes ---
        file_bytes: bytes = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: db.storage.from_("documents").download(file_path),
        )

        # --- 4. OCR ---
        ocr_text = await extract_text_from_bytes(file_bytes, mime_type, settings)

        # --- 5. AI extraction ---
        extraction_result, validation_issues = await extract_lease_data(ocr_text, settings)

        # --- 6. Persist OCR text + extracted data ---
        await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: db.table("documents")
                .update({
                    "status": "extracted",
                    "ocr_text": ocr_text,
                })
                .eq("id", body.document_id)
                .execute(),
        )

    except Exception as exc:
        logger.error("[Extract] Failed for document %s: %s", body.document_id, exc, exc_info=True)
        await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: db.table("documents")
                .update({"status": "error", "error_message": str(exc)[:500]})
                .eq("id", body.document_id)
                .execute(),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Extraktion fehlgeschlagen: {exc}",
        ) from exc

    return ExtractionReviewResponse(
        document_id=body.document_id,
        extraction=extraction_result.model_dump(),
        validation_errors=[{"field": e.field, "level": e.level, "message": e.message} for e in validation_issues],
        ocr_text_preview=ocr_text[:500],
    )


# ── POST /extract/confirm ──────────────────────────────────────────────────────

@router.post("/confirm", response_model=ConfirmResponse)
async def confirm_extraction(
    body: ConfirmExtractionRequest,
    current_user: CurrentUser,
    db: SupabaseClient,
) -> ConfirmResponse:
    """
    Persist the (possibly user-corrected) extraction to the database.
    Creates: property, unit, lease, tenants, rent_adjustments, deadlines.
    NOTE: Not fully atomic — a DB transaction via Postgres stored proc is the
    ideal solution; this version does best-effort with error logging.
    """
    # Verify document ownership
    doc_resp = await asyncio.get_event_loop().run_in_executor(
        None,
        lambda: db.table("documents")
            .select("id, user_id")
            .eq("id", body.document_id)
            .eq("user_id", current_user.sub)
            .single()
            .execute(),
    )
    if not doc_resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dokument nicht gefunden.")

    if not body.create_unit:
        return ConfirmResponse(deadlines_created=0)

    # Parse extraction
    try:
        extraction = ExtractionResult.model_validate(body.extraction)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    def v(val: object) -> object:
        """Normalise empty strings → None so Postgres date/int columns don't choke."""
        if val == "" or val is None:
            return None
        return val

    def _float(cf: object) -> object:
        try:
            val = v(getattr(cf, "value", None)) if cf else None
            return float(val) if val is not None else None
        except (TypeError, ValueError):
            return None

    def _int(cf: object, default: int | None = None) -> object:
        try:
            val = v(getattr(cf, "value", None)) if cf else None
            return int(val) if val is not None else default
        except (TypeError, ValueError):
            return default

    def _str(cf: object) -> object:
        return v(getattr(cf, "value", None)) if cf else None

    def _bool(cf: object, default: bool = False) -> bool:
        val = getattr(cf, "value", None) if cf else None
        if val is None or val == "":
            return default
        return bool(val)

    from app.models.extraction import LeaseTermExtraction, RentTypeExtraction, SpecialAgreementsExtraction

    prop = extraction.property
    fin = extraction.financials
    term = extraction.effective_lease_term() or LeaseTermExtraction()
    rent = extraction.rent_type or RentTypeExtraction()
    tenants_data = extraction.tenants or []
    special = extraction.special_agreements or SpecialAgreementsExtraction()

    unit_id: Optional[str] = None
    lease_id: Optional[str] = None
    deadlines_created = 0

    def run(fn):
        return asyncio.get_event_loop().run_in_executor(None, fn)

    try:
        # 1. Create property
        prop_resp = await run(lambda: db.table("properties").insert({
            "user_id": current_user.sub,
            "name": f"{v(prop.street.value) or ''} {v(prop.house_number.value) or ''}, {v(prop.city.value) or ''}".strip(", "),
            "street": v(prop.street.value) or "",
            "house_number": v(prop.house_number.value) or "",
            "city": v(prop.city.value) or "",
            "postal_code": v(prop.postal_code.value) or "",
            "country": "DE",
        }).execute())
        property_id = prop_resp.data[0]["id"]

        # 2. Create unit
        unit_resp = await run(lambda: db.table("units").insert({
            "property_id": property_id,
            "user_id": current_user.sub,
            "unit_number": v(prop.unit_number.value) if prop.unit_number else None,
            "floor": None,
            "area_sqm": _float(prop.area_sqm),
            "rooms": _float(prop.rooms),
            "has_parking": _bool(prop.has_parking),
            "parking_number": v(prop.parking_number.value) if prop.parking_number else None,
            "has_cellar": _bool(prop.has_cellar),
            "status": "occupied",
        }).execute())
        unit_id = unit_resp.data[0]["id"]

        # 3. Create lease
        start = v(term.start_date.value) if term.start_date else None
        end = v(term.end_date.value) if term.end_date else None
        rent_type_val = v(rent.type.value) if rent.type else "fixed"
        base_rent_val = _float(fin.base_rent)

        lease_payload: dict = {
            "unit_id": unit_id,
            "user_id": current_user.sub,
            "start_date": start,
            "end_date": end,
            "is_fixed_term": _bool(term.is_fixed_term),
            "notice_period_months": _int(term.notice_period_months, 3),
            "base_rent": base_rent_val,
            "operating_costs": _float(fin.operating_costs),
            "deposit": _float(fin.deposit),
            "payment_day": _int(fin.payment_day, 1),
            "payment_method": _str(fin.payment_method),
            "rent_type": rent_type_val or "fixed",
            "pets_allowed": _bool(special.pets_allowed) if v(getattr(special.pets_allowed, "value", None)) is not None else None,
            "subletting_allowed": _bool(special.subletting_allowed) if v(getattr(special.subletting_allowed, "value", None)) is not None else None,
            "cosmetic_repairs_clause": _str(special.cosmetic_repairs_clause),
            "extracted_at": "now()",
            "extraction_confidence": extraction.meta.overall_confidence,
            "is_active": True,
        }

        if rent_type_val == "indexed" and rent.index_type:
            lease_payload.update({
                "index_type": _str(rent.index_type),
                "index_base_value": _float(rent.index_base_value),
                "index_base_date": v(rent.index_base_date.value) if rent.index_base_date else None,
                "index_adjustment_interval_months": _int(rent.index_adjustment_interval_months, 12),
            })

        lease_resp = await run(lambda: db.table("leases").insert(lease_payload).execute())
        lease_id = lease_resp.data[0]["id"]

        # 4. Create tenants + lease_tenants
        for i, t in enumerate(tenants_data):
            tenant_resp = await run(lambda: db.table("tenants").insert({
                "user_id": current_user.sub,
                "first_name": v(t.first_name.value) or "Unbekannt",
                "last_name": v(t.last_name.value) or "Unbekannt",
                "email": v(t.email.value) if t.email else None,
                "phone": v(t.phone.value) if t.phone else None,
            }).execute())
            tenant_id = tenant_resp.data[0]["id"]
            await run(lambda: db.table("lease_tenants").insert({
                "lease_id": lease_id,
                "tenant_id": tenant_id,
                "is_primary": i == 0,
            }).execute())

        # 5. Rent adjustments for Staffelmiete
        if rent.type.value == "graduated" and rent.graduated_steps:
            for step in rent.graduated_steps:
                if step.effective_date.value and step.new_rent.value:
                    await run(lambda: db.table("rent_adjustments").insert({
                        "lease_id": lease_id,
                        "user_id": current_user.sub,
                        "effective_date": step.effective_date.value,
                        "new_base_rent": float(step.new_rent.value),
                        "adjustment_type": "graduated",
                    }).execute())

        # 6. Auto-generate deadlines
        deadlines = generate_deadlines_from_lease(extraction, unit_id=unit_id, lease_id=lease_id)
        for d in deadlines:
            await run(lambda: db.table("deadlines").insert({
                "unit_id": d.unit_id,
                "lease_id": d.lease_id,
                "user_id": current_user.sub,
                "title": d.title,
                "description": d.description,
                "due_date": d.due_date.isoformat(),
                "deadline_type": d.deadline_type,
                "notify_days_before": d.notify_days_before,
                "is_auto_generated": True,
            }).execute())
        deadlines_created = len(deadlines)

        # 7. Mark document as extracted (valid status per DB constraint)
        await run(lambda: db.table("documents").update({
            "status": "extracted",
            "unit_id": unit_id,
            "lease_id": lease_id,
        }).eq("id", body.document_id).execute())

    except Exception as exc:
        logger.error("[Confirm] Failed: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Fehler beim Speichern: {exc}",
        ) from exc

    return ConfirmResponse(unit_id=unit_id, lease_id=lease_id, deadlines_created=deadlines_created)
