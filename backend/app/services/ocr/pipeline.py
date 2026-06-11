"""OCR pipeline — extracts text from PDFs and images.

Strategy:
1. PDF with text layer → PyMuPDF direct text extraction (milliseconds, no API cost)
2. PDF with no text (scanned) → vision LLM per page (fallback)
3. Image (jpg/png) → vision LLM

This avoids spending 8+ minutes on LLM calls for a normal digital PDF.
"""
from __future__ import annotations

import base64
import logging
import time
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.core.config import Settings

logger = logging.getLogger(__name__)

_MIN_TEXT_CHARS_PER_PAGE = 100  # below this → page is likely a scan


def _extract_pdf_text_direct(pdf_bytes: bytes) -> tuple[str, bool]:
    """
    Try to extract text directly from PDF using PyMuPDF.
    Returns (text, is_text_based).
    is_text_based=True  → text layer found, no OCR needed
    is_text_based=False → little/no text, PDF is likely scanned
    """
    try:
        import fitz
    except ImportError as exc:
        raise RuntimeError("PyMuPDF required. Run: uv add pymupdf") from exc

    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    pages: list[str] = []
    total_chars = 0

    try:
        for i in range(len(doc)):
            page = doc[i]
            text = page.get_text("text").strip()
            total_chars += len(text)
            pages.append(f"=== Seite {i + 1} ===\n{text}" if text else f"=== Seite {i + 1} ===\n[Kein Text]")
    finally:
        doc.close()

    avg_chars = total_chars / max(len(pages), 1)
    is_text_based = avg_chars >= _MIN_TEXT_CHARS_PER_PAGE
    return "\n\n".join(pages), is_text_based


async def _ocr_image_bytes(image_bytes: bytes, mime_type: str, settings: "Settings", page_label: str = "") -> str:
    """Send a single image to the LLM vision API and return extracted text."""
    from openai import AsyncOpenAI

    b64 = base64.b64encode(image_bytes).decode()
    data_url = f"data:{mime_type};base64,{b64}"

    async with AsyncOpenAI(base_url=settings.openai_base_url, api_key=settings.llm_proxy_key) as client:
        t0 = time.monotonic()
        try:
            response = await client.chat.completions.create(
                model=settings.llm_model,
                max_tokens=4096,
                messages=[
                    {"role": "system", "content": (
                        "You are a high-accuracy OCR engine. "
                        "Extract ALL text exactly as it appears. "
                        "Preserve structure and German characters. "
                        "Output only the raw extracted text."
                    )},
                    {"role": "user", "content": [
                        {"type": "image_url", "image_url": {"url": data_url, "detail": "high"}},
                        {"type": "text", "text": "Extract all text from this document page."},
                    ]},
                ],
            )
        except Exception:
            duration_ms = (time.monotonic() - t0) * 1000
            logger.error("[OCR] Vision call failed for %s (%.0f ms)", page_label or "image", duration_ms, exc_info=True)
            raise

        duration_ms = (time.monotonic() - t0) * 1000

        if not response.choices:
            raise ValueError(f"[OCR] Empty response for {page_label}.")

        text = response.choices[0].message.content or ""
        logger.info("[OCR] %s: %d in / %d out | %.0f ms | %d chars",
                    page_label, response.usage.prompt_tokens if response.usage else 0,
                    response.usage.completion_tokens if response.usage else 0,
                    duration_ms, len(text))
        return text


async def extract_text_from_bytes(file_bytes: bytes, mime_type: str, settings: "Settings") -> str:
    """
    Main entry point. Returns text with === Seite N === separators.
    """
    if mime_type == "application/pdf":
        return await _extract_pdf(file_bytes, settings)

    # Single image → vision OCR
    text = await _ocr_image_bytes(file_bytes, mime_type, settings, page_label="Seite 1")
    return f"=== Seite 1 ===\n{text}"


async def _extract_pdf(pdf_bytes: bytes, settings: "Settings") -> str:
    """PDF extraction: direct text first, vision OCR only for scanned pages."""
    t0 = time.monotonic()

    # Fast path: try direct text extraction
    full_text, is_text_based = _extract_pdf_text_direct(pdf_bytes)
    elapsed = time.monotonic() - t0

    if is_text_based:
        logger.info("[OCR] PDF text extracted directly in %.0f ms (%d chars)", elapsed * 1000, len(full_text))
        return full_text

    # Slow path: scanned PDF → vision OCR per page
    logger.info("[OCR] PDF appears scanned (%.0f ms), falling back to vision OCR", elapsed * 1000)
    return await _ocr_pdf_via_vision(pdf_bytes, settings)


async def _ocr_pdf_via_vision(pdf_bytes: bytes, settings: "Settings") -> str:
    """Convert PDF pages to images and OCR each via vision API."""
    import fitz
    import asyncio

    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    pages: list[str] = []

    try:
        for i in range(len(doc)):
            page = doc[i]
            mat = fitz.Matrix(2.0, 2.0)
            pix = page.get_pixmap(matrix=mat)
            png_bytes = pix.tobytes("png")
            label = f"Seite {i + 1}"
            try:
                text = await _ocr_image_bytes(png_bytes, "image/png", settings, page_label=label)
            except Exception as exc:
                logger.warning("[OCR] %s failed: %s", label, exc)
                text = f"[Fehler beim Lesen von {label}]"
            pages.append(f"=== {label} ===\n{text}")
    finally:
        doc.close()

    return "\n\n".join(pages)
