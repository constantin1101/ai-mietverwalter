"""Prompts and tool schema for lease data extraction."""
from __future__ import annotations

LEASE_EXTRACTION_SYSTEM_PROMPT = """You are a German real-estate law expert (Mietrecht, BGB) specialising in automated extraction of rental contract data.

EXTRACTION RULES:
1. Extract ONLY information explicitly stated in the document text.
2. NEVER invent, infer beyond what is written, or use external knowledge to fill gaps.
3. Assign a confidence score (0.0–1.0) to every field:
   - 1.0 = crystal-clear, verbatim in document
   - 0.7–0.9 = clearly implied / obvious abbreviation
   - 0.4–0.6 = requires interpretation / ambiguous phrasing
   - 0.0 = not found or contradicted
4. Set value to null and confidence to 0.0 for missing fields.
5. Dates: always YYYY-MM-DD.
6. Money amounts: float, no currency symbol (e.g. 850.00).
7. Booleans: only set if explicitly stated; null if unknown.

GERMAN TERMINOLOGY:
- Kaltmiete / Grundmiete / Nettomiete → base_rent
- Betriebskosten / Nebenkosten (NK) / Vorauszahlung → operating_costs
- Warmmiete = base_rent + operating_costs (do NOT use as base_rent)
- Kaution / Mietkaution / Sicherheitsleistung → deposit
- Staffelmiete (§557a BGB) → rent_type: "graduated"
- Indexmiete (§557b BGB) → rent_type: "indexed"
- Festmiete / keine Staffel/Index → rent_type: "fixed"
- VPI = Verbraucherpreisindex (use index_type: "VPI")
- unbefristet = no end date, is_fixed_term: false
- befristet = has end_date, is_fixed_term: true

COSMETIC REPAIRS (Schönheitsreparaturen) — note if present:
- Starre Fristen ("alle 3 Jahre Küche", "alle 5 Jahre Wohnräume") → likely invalid per BGH
- Endrenovierungsklausel ("bei Auszug frisch streichen") → likely invalid per BGH VIII ZR 316/06
- Quotenklausel → likely invalid per BGH

Respond ONLY with a function/tool call. No free text, no explanations."""


def build_extraction_user_prompt(ocr_text: str) -> str:
    return f"""Analyse the following German rental contract and extract all structured data.
Call the function extract_lease_data with every field you can find.

IMPORTANT: Use exactly the field name "lease_term" (not "lease_terms").
For any field not found, set value to null and confidence to 0.0.

<mietvertrag>
{ocr_text}
</mietvertrag>"""


# JSON Schema matching ExtractionResult (used as OpenAI function/tool definition)
EXTRACTION_TOOL_SCHEMA: dict = {
    "type": "function",
    "function": {
        "name": "extract_lease_data",
        "description": "Extract all structured data from a German rental contract (Mietvertrag).",
        "parameters": {
            "type": "object",
            "required": ["property", "tenants", "lease_term", "financials", "rent_type", "special_agreements", "meta"],
            "properties": {
                "property": {
                    "type": "object",
                    "required": ["street", "house_number", "city", "postal_code"],
                    "properties": {
                        "street":         {"type": "object", "properties": {"value": {"type": "string"}, "confidence": {"type": "number"}, "source_text": {"type": "string"}}, "required": ["value", "confidence"]},
                        "house_number":   {"type": "object", "properties": {"value": {"type": "string"}, "confidence": {"type": "number"}, "source_text": {"type": "string"}}, "required": ["value", "confidence"]},
                        "city":           {"type": "object", "properties": {"value": {"type": "string"}, "confidence": {"type": "number"}, "source_text": {"type": "string"}}, "required": ["value", "confidence"]},
                        "postal_code":    {"type": "object", "properties": {"value": {"type": "string"}, "confidence": {"type": "number"}, "source_text": {"type": "string"}}, "required": ["value", "confidence"]},
                        "floor":          {"type": "object", "properties": {"value": {"type": ["string", "null"]}, "confidence": {"type": "number"}}},
                        "unit_number":    {"type": "object", "properties": {"value": {"type": ["string", "null"]}, "confidence": {"type": "number"}}},
                        "area_sqm":       {"type": "object", "properties": {"value": {"type": ["number", "null"]}, "confidence": {"type": "number"}}},
                        "rooms":          {"type": "object", "properties": {"value": {"type": ["number", "null"]}, "confidence": {"type": "number"}}},
                        "has_parking":    {"type": "object", "properties": {"value": {"type": ["boolean", "null"]}, "confidence": {"type": "number"}}},
                        "parking_number": {"type": "object", "properties": {"value": {"type": ["string", "null"]}, "confidence": {"type": "number"}}},
                        "has_cellar":     {"type": "object", "properties": {"value": {"type": ["boolean", "null"]}, "confidence": {"type": "number"}}},
                    },
                },
                "tenants": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "required": ["first_name", "last_name"],
                        "properties": {
                            "first_name":  {"type": "object", "properties": {"value": {"type": "string"}, "confidence": {"type": "number"}}},
                            "last_name":   {"type": "object", "properties": {"value": {"type": "string"}, "confidence": {"type": "number"}}},
                            "email":       {"type": "object", "properties": {"value": {"type": ["string", "null"]}, "confidence": {"type": "number"}}},
                            "phone":       {"type": "object", "properties": {"value": {"type": ["string", "null"]}, "confidence": {"type": "number"}}},
                            "is_primary":  {"type": "boolean"},
                        },
                    },
                },
                "lease_term": {
                    "type": "object",
                    "required": ["start_date", "is_fixed_term", "notice_period_months"],
                    "properties": {
                        "start_date":           {"type": "object", "properties": {"value": {"type": "string"}, "confidence": {"type": "number"}}},
                        "end_date":             {"type": "object", "properties": {"value": {"type": ["string", "null"]}, "confidence": {"type": "number"}}},
                        "is_fixed_term":        {"type": "object", "properties": {"value": {"type": "boolean"}, "confidence": {"type": "number"}}},
                        "notice_period_months": {"type": "object", "properties": {"value": {"type": "integer"}, "confidence": {"type": "number"}}},
                    },
                },
                "financials": {
                    "type": "object",
                    "required": ["base_rent", "payment_day"],
                    "properties": {
                        "base_rent":       {"type": "object", "properties": {"value": {"type": "number"}, "confidence": {"type": "number"}}},
                        "operating_costs": {"type": "object", "properties": {"value": {"type": ["number", "null"]}, "confidence": {"type": "number"}}},
                        "deposit":         {"type": "object", "properties": {"value": {"type": ["number", "null"]}, "confidence": {"type": "number"}}},
                        "payment_day":     {"type": "object", "properties": {"value": {"type": "integer"}, "confidence": {"type": "number"}}},
                        "payment_method":  {"type": "object", "properties": {"value": {"type": ["string", "null"], "enum": ["transfer", "direct_debit", None]}, "confidence": {"type": "number"}}},
                    },
                },
                "rent_type": {
                    "type": "object",
                    "required": ["type"],
                    "properties": {
                        "type":                              {"type": "object", "properties": {"value": {"type": "string", "enum": ["fixed", "indexed", "graduated"]}, "confidence": {"type": "number"}}},
                        "index_type":                        {"type": "object", "properties": {"value": {"type": ["string", "null"]}, "confidence": {"type": "number"}}},
                        "index_base_value":                  {"type": "object", "properties": {"value": {"type": ["number", "null"]}, "confidence": {"type": "number"}}},
                        "index_base_date":                   {"type": "object", "properties": {"value": {"type": ["string", "null"]}, "confidence": {"type": "number"}}},
                        "index_adjustment_interval_months":  {"type": "object", "properties": {"value": {"type": ["integer", "null"]}, "confidence": {"type": "number"}}},
                        "graduated_steps": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "effective_date": {"type": "object", "properties": {"value": {"type": "string"}, "confidence": {"type": "number"}}},
                                    "new_rent":       {"type": "object", "properties": {"value": {"type": "number"}, "confidence": {"type": "number"}}},
                                },
                            },
                        },
                    },
                },
                "special_agreements": {
                    "type": "object",
                    "properties": {
                        "pets_allowed":            {"type": "object", "properties": {"value": {"type": ["boolean", "null"]}, "confidence": {"type": "number"}}},
                        "subletting_allowed":      {"type": "object", "properties": {"value": {"type": ["boolean", "null"]}, "confidence": {"type": "number"}}},
                        "cosmetic_repairs_clause": {"type": "object", "properties": {"value": {"type": ["string", "null"]}, "confidence": {"type": "number"}}},
                        "other_notable_clauses": {
                            "type": "array",
                            "items": {"type": "object", "properties": {"text": {"type": "string"}, "type": {"type": "string"}}},
                        },
                    },
                },
                "meta": {
                    "type": "object",
                    "required": ["overall_confidence", "low_confidence_fields", "missing_fields"],
                    "properties": {
                        "overall_confidence":    {"type": "number"},
                        "low_confidence_fields": {"type": "array", "items": {"type": "string"}},
                        "missing_fields":        {"type": "array", "items": {"type": "string"}},
                        "extraction_notes":      {"type": ["string", "null"]},
                    },
                },
            },
        },
    },
}
