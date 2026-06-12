"""Documents router — list, upload, and signed URL generation."""
from __future__ import annotations

import asyncio
import logging
import uuid as _uuid
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel

from app.core.dependencies import CurrentUser, SupabaseClient

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/documents", tags=["documents"])

ALLOWED_MIME_TYPES = {"application/pdf", "image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB

VALID_DOC_TYPES = {
    "lease_contract", "handover_protocol", "energy_certificate",
    "insurance_policy", "invoice", "rent_increase",
    "utility_statement", "correspondence", "other",
}


# ── Response models ────────────────────────────────────────────────────────────

class DocumentCard(BaseModel):
    id: str
    filename: str
    document_type: str
    status: str
    created_at: str
    file_size_bytes: Optional[int] = None
    unit_id: Optional[str] = None
    street: Optional[str] = None
    house_number: Optional[str] = None
    city: Optional[str] = None
    unit_number: Optional[str] = None
    primary_tenant_name: Optional[str] = None


class DocumentUrlResponse(BaseModel):
    url: str
    filename: str
    mime_type: Optional[str] = None


class DocumentUploadResponse(BaseModel):
    document_id: str
    filename: str
    document_type: str


# ── GET /documents ─────────────────────────────────────────────────────────────

@router.get("", response_model=list[DocumentCard])
async def list_documents(
    current_user: CurrentUser,
    db: SupabaseClient,
) -> list[DocumentCard]:
    """Return all documents for the current user, enriched with unit/property info."""
    uid = current_user.sub
    loop = asyncio.get_event_loop()

    # All documents
    docs_resp = await loop.run_in_executor(
        None,
        lambda: db.table("documents")
            .select("id, filename, document_type, status, created_at, file_size_bytes, unit_id, lease_id")
            .eq("user_id", uid)
            .order("created_at", desc=True)
            .execute(),
    )
    docs = docs_resp.data or []
    if not docs:
        return []

    # Collect unit ids that are set
    unit_ids = list({d["unit_id"] for d in docs if d.get("unit_id")})

    # Fetch units + properties
    prop_by_unit: dict[str, dict] = {}
    if unit_ids:
        units_resp = await loop.run_in_executor(
            None,
            lambda: db.table("units")
                .select("id, property_id, unit_number")
                .in_("id", unit_ids)
                .execute(),
        )
        units_list = units_resp.data or []
        prop_ids = list({u["property_id"] for u in units_list if u.get("property_id")})

        props_resp = await loop.run_in_executor(
            None,
            lambda: db.table("properties")
                .select("id, street, house_number, city")
                .in_("id", prop_ids)
                .execute(),
        ) if prop_ids else type("R", (), {"data": []})()

        props_by_id = {p["id"]: p for p in (props_resp.data or [])}

        for u in units_list:
            prop = props_by_id.get(u.get("property_id", ""), {})
            prop_by_unit[u["id"]] = {
                "street": prop.get("street"),
                "house_number": prop.get("house_number"),
                "city": prop.get("city"),
                "unit_number": u.get("unit_number"),
            }

    # Fetch primary tenant names per unit (via active lease)
    tenant_by_unit: dict[str, str] = {}
    if unit_ids:
        leases_resp = await loop.run_in_executor(
            None,
            lambda: db.table("leases")
                .select("id, unit_id")
                .eq("user_id", uid)
                .eq("is_active", True)
                .in_("unit_id", unit_ids)
                .execute(),
        )
        lease_list = leases_resp.data or []
        lease_ids = [l["id"] for l in lease_list]
        lease_to_unit = {l["id"]: l["unit_id"] for l in lease_list}

        if lease_ids:
            lt_resp = await loop.run_in_executor(
                None,
                lambda: db.table("lease_tenants")
                    .select("lease_id, tenant_id")
                    .eq("is_primary", True)
                    .in_("lease_id", lease_ids)
                    .execute(),
            )
            tid_map = {lt["lease_id"]: lt["tenant_id"] for lt in (lt_resp.data or [])}
            tenant_ids = list(tid_map.values())

            if tenant_ids:
                tenants_resp = await loop.run_in_executor(
                    None,
                    lambda: db.table("tenants")
                        .select("id, first_name, last_name")
                        .in_("id", tenant_ids)
                        .execute(),
                )
                tenants_by_id = {t["id"]: t for t in (tenants_resp.data or [])}
                for lease_id, tenant_id in tid_map.items():
                    unit_id = lease_to_unit.get(lease_id)
                    t = tenants_by_id.get(tenant_id, {})
                    if unit_id and t:
                        tenant_by_unit[unit_id] = f"{t.get('first_name', '')} {t.get('last_name', '')}".strip()

    cards: list[DocumentCard] = []
    for d in docs:
        uid_doc = d.get("unit_id")
        ctx = prop_by_unit.get(uid_doc, {}) if uid_doc else {}
        cards.append(DocumentCard(
            id=d["id"],
            filename=d["filename"],
            document_type=d.get("document_type") or "other",
            status=d.get("status") or "uploaded",
            created_at=d["created_at"],
            file_size_bytes=d.get("file_size_bytes"),
            unit_id=uid_doc,
            street=ctx.get("street"),
            house_number=ctx.get("house_number"),
            city=ctx.get("city"),
            unit_number=ctx.get("unit_number"),
            primary_tenant_name=tenant_by_unit.get(uid_doc) if uid_doc else None,
        ))

    return cards


# ── POST /documents/upload ─────────────────────────────────────────────────────

@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    current_user: CurrentUser,
    db: SupabaseClient,
    file: UploadFile = File(...),
    document_type: str = Form("other"),
    unit_id: Optional[str] = Form(None),
) -> DocumentUploadResponse:
    """Upload a document with explicit type and optional unit association."""
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Dateityp nicht unterstützt. Erlaubt: PDF, JPG, PNG.",
        )

    if document_type not in VALID_DOC_TYPES:
        document_type = "other"

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Datei zu groß. Maximum: 20 MB.",
        )

    safe_filename = file.filename or "document"
    file_id = str(_uuid.uuid4())
    storage_path = f"{current_user.sub}/{file_id}_{safe_filename}"
    loop = asyncio.get_event_loop()

    try:
        await loop.run_in_executor(
            None,
            lambda: db.storage.from_("documents").upload(
                path=storage_path,
                file=content,
                file_options={"content-type": file.content_type, "upsert": "false"},
            ),
        )
    except Exception as exc:
        logger.error("Storage upload failed: %s", exc)
        raise HTTPException(status_code=500, detail="Upload fehlgeschlagen.") from exc

    insert_payload: dict = {
        "user_id": current_user.sub,
        "filename": safe_filename,
        "file_path": storage_path,
        "mime_type": file.content_type,
        "file_size_bytes": len(content),
        "document_type": document_type,
        "status": "uploaded",
    }
    if unit_id:
        # Verify ownership
        unit_check = await loop.run_in_executor(
            None,
            lambda: db.table("units")
                .select("id")
                .eq("id", unit_id)
                .eq("user_id", current_user.sub)
                .maybe_single()
                .execute(),
        )
        if unit_check.data:
            insert_payload["unit_id"] = unit_id

    doc_resp = await loop.run_in_executor(
        None,
        lambda: db.table("documents").insert(insert_payload).execute(),
    )
    doc_id = doc_resp.data[0]["id"]

    return DocumentUploadResponse(
        document_id=doc_id,
        filename=safe_filename,
        document_type=document_type,
    )


# ── GET /documents/{id}/url ────────────────────────────────────────────────────

@router.get("/{document_id}/url", response_model=DocumentUrlResponse)
async def get_document_url(
    document_id: str,
    current_user: CurrentUser,
    db: SupabaseClient,
) -> DocumentUrlResponse:
    """Return a short-lived signed URL (1 h) for viewing a document."""
    uid = current_user.sub
    loop = asyncio.get_event_loop()

    doc_resp = await loop.run_in_executor(
        None,
        lambda: db.table("documents")
            .select("id, file_path, filename, mime_type")
            .eq("id", document_id)
            .eq("user_id", uid)
            .single()
            .execute(),
    )
    if not doc_resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dokument nicht gefunden.")

    doc = doc_resp.data
    result = await loop.run_in_executor(
        None,
        lambda: db.storage.from_("documents").create_signed_url(doc["file_path"], expires_in=3600),
    )

    signed_url: str | None = result.get("signedURL") or result.get("signedUrl")
    if not signed_url:
        raise HTTPException(status_code=500, detail="Signierte URL konnte nicht erstellt werden.")

    return DocumentUrlResponse(url=signed_url, filename=doc["filename"], mime_type=doc.get("mime_type"))
