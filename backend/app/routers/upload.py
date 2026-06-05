"""Document upload — stores file in Supabase Storage."""
import uuid
import logging
from fastapi import APIRouter, UploadFile, File, HTTPException, status
from pydantic import BaseModel

from app.core.dependencies import CurrentUser, SupabaseClient

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/upload", tags=["upload"])

ALLOWED_MIME_TYPES = {"application/pdf", "image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024  # 20 MB


class UploadResponse(BaseModel):
    document_id: str
    file_path: str
    filename: str
    status: str = "uploaded"


@router.post("", response_model=UploadResponse)
async def upload_document(
    current_user: CurrentUser,
    db: SupabaseClient,
    file: UploadFile = File(...),
) -> UploadResponse:
    # Validate MIME type
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Dateityp nicht unterstützt. Erlaubt: PDF, JPG, PNG.",
        )

    content = await file.read()

    # Validate file size
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Datei zu groß. Maximum: 20 MB.",
        )

    # Build storage path: {user_id}/{uuid}_{original_name}
    safe_filename = file.filename or "document"
    file_id = str(uuid.uuid4())
    storage_path = f"{current_user.sub}/{file_id}_{safe_filename}"

    # Upload to Supabase Storage
    try:
        db.storage.from_("documents").upload(
            path=storage_path,
            file=content,
            file_options={"content-type": file.content_type, "upsert": "false"},
        )
    except Exception as exc:
        logger.error("Storage upload failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Upload fehlgeschlagen. Bitte erneut versuchen.",
        ) from exc

    # Create document record in DB
    doc_resp = (
        db.table("documents")
        .insert({
            "user_id": current_user.sub,
            "filename": safe_filename,
            "file_path": storage_path,
            "mime_type": file.content_type,
            "file_size_bytes": len(content),
            "status": "uploaded",
        })
        .execute()
    )
    document_id = doc_resp.data[0]["id"]

    logger.info(
        "Document uploaded: %s by user %s (%d bytes)",
        safe_filename,
        current_user.sub,
        len(content),
    )

    return UploadResponse(
        document_id=document_id,
        file_path=storage_path,
        filename=safe_filename,
    )
