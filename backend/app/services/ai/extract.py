"""AI extraction service — calls LLM proxy to extract structured lease data."""
from __future__ import annotations

import json
import logging
import time

from pydantic import ValidationError as PydanticValidationError

from app.models.extraction import ExtractionResult
from app.models.extraction import ValidationError as ExtractionValidationIssue
from app.models.extraction import validate_extraction
from app.services.ai.prompts.extract_lease import (
    EXTRACTION_TOOL_SCHEMA,
    LEASE_EXTRACTION_SYSTEM_PROMPT,
    build_extraction_user_prompt,
)

logger = logging.getLogger(__name__)


# Max chars of OCR text sent to the LLM.
# A typical Mietvertrag is ~3k–8k chars. We cap at 12k to stay well within
# context limits while keeping all relevant clauses.
_MAX_OCR_CHARS = 12_000


async def extract_lease_data(
    ocr_text: str,
    settings,
) -> tuple[ExtractionResult, list[ExtractionValidationIssue]]:
    """
    Send OCR text to the LLM proxy and return structured ExtractionResult.

    Returns:
        (ExtractionResult, list of business-logic validation issues)

    Raises:
        ValueError: if the model returns no choices or invalid JSON
        PydanticValidationError: if the parsed data doesn't match the schema
    """
    from openai import AsyncOpenAI

    # Truncate very long OCR texts — all key contract data is in the first pages
    if len(ocr_text) > _MAX_OCR_CHARS:
        logger.info(
            "[AI Extract] OCR text truncated %d → %d chars",
            len(ocr_text), _MAX_OCR_CHARS,
        )
        ocr_text = ocr_text[:_MAX_OCR_CHARS] + "\n\n[Text truncated for extraction]"

    t_start = time.monotonic()

    # Use async context manager to ensure connection pool cleanup
    async with AsyncOpenAI(
        base_url=settings.openai_base_url,
        api_key=settings.llm_proxy_key,
    ) as client:
        try:
            response = await client.chat.completions.create(
                model=settings.llm_model,
                max_tokens=8192,  # tool call JSON needs room — 4096 was too small
                messages=[
                    {"role": "system", "content": LEASE_EXTRACTION_SYSTEM_PROMPT},
                    {"role": "user", "content": build_extraction_user_prompt(ocr_text)},
                ],
                tools=[EXTRACTION_TOOL_SCHEMA],
                tool_choice={"type": "function", "function": {"name": "extract_lease_data"}},
            )
        except Exception:
            duration_ms = (time.monotonic() - t_start) * 1000
            logger.error(
                "[AI Extract] LLM call failed (%.0f ms)",
                duration_ms,
                exc_info=True,
            )
            raise

    duration_ms = (time.monotonic() - t_start) * 1000

    # Guard against empty choices (proxy errors, content policy blocks)
    if not response.choices:
        raise ValueError(
            f"[AI Extract] LLM returned no choices. "
            f"Model: {settings.llm_model!r}. "
            f"Usage: {response.usage}."
        )

    choice = response.choices[0]

    # Extract tool call arguments
    tool_calls = getattr(choice.message, "tool_calls", None)
    if not tool_calls:
        raise ValueError(
            "[AI Extract] Model did not call the extraction tool. "
            f"Finish reason: {choice.finish_reason!r}. "
            "Check that the model supports function calling."
        )

    raw_args = tool_calls[0].function.arguments

    logger.info(
        "[AI Extract] %d in / %d out tokens | %.0f ms",
        response.usage.prompt_tokens if response.usage else 0,
        response.usage.completion_tokens if response.usage else 0,
        duration_ms,
    )

    # Parse JSON arguments
    try:
        args_dict = json.loads(raw_args)
    except json.JSONDecodeError as exc:
        raise ValueError(f"[AI Extract] Tool call returned invalid JSON: {exc}") from exc

    # Validate against Pydantic schema
    try:
        result = ExtractionResult.model_validate(args_dict)
    except PydanticValidationError as exc:
        logger.error("[AI Extract] Pydantic validation failed: %s", exc)
        raise

    # Business-logic checks
    issues = validate_extraction(result)
    if issues:
        logger.info("[AI Extract] %d validation issues found", len(issues))

    return result, issues
