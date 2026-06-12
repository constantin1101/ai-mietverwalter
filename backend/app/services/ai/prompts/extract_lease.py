"""Prompts and tool schema for lease data extraction."""
from __future__ import annotations

LEASE_EXTRACTION_SYSTEM_PROMPT = """Du bist ein Experte für deutsches Mietrecht und analysierst Mietverträge.
Extrahiere alle relevanten Daten so vollständig wie möglich.

KONFIDENZ-SKALA:
- 1.0 = wörtlich im Text, eindeutig
- 0.8 = klar erkennbar, kleine Interpretation
- 0.6 = aus Kontext erschließbar / implizit
- 0.4 = Schätzung basierend auf Normen
- 0.0 = nicht im Dokument, setze value=null

WICHTIGE REGELN:
1. Extrahiere alles was du aus dem Text ableiten kannst — auch indirekt
2. Nutze dein Wissen über deutsches Mietrecht für sinnvolle Defaults:
   - Unbefristet = is_fixed_term: false, end_date: null
   - "am Ersten" = payment_day: 1
   - Standard-Kündigung = 3 Monate
   - "Überweisung/Banküberweisung" = payment_method: "transfer"
   - "Lastschrift/SEPA" = payment_method: "direct_debit"
   - Keine Staffel/Index-Klausel = rent_type: "fixed"
3. Fehlende optionale Felder (Etage, Parkplatz bei Wohnungen ohne Parkplatz): value=null, confidence=0.0
4. Datumsformat: YYYY-MM-DD
5. Geldbeträge: float ohne Währungszeichen (1040.0)
6. Tiere: Lies §17 oder ähnliche Klauseln — "Zustimmung erforderlich" = pets_allowed: false, Kleintiere erlaubt = true
7. Untervermietung: "nicht ohne Erlaubnis" = subletting_allowed: false
8. Antworte NUR mit dem Tool-Call, kein Freitext."""


def build_extraction_user_prompt(ocr_text: str) -> str:
    return f"""Analysiere diesen deutschen Mietvertrag und extrahiere ALLE Daten vollständig.
Nutze "lease_term" (nicht "lease_terms") für die Vertragslaufzeit.
Bei nicht gefundenen Feldern: value=null, confidence=0.0.

<mietvertrag>
{ocr_text}
</mietvertrag>"""


# Full JSON Schema for the tool call
EXTRACTION_TOOL_SCHEMA: dict = {
    "type": "function",
    "function": {
        "name": "extract_lease_data",
        "description": "Extrahiert alle strukturierten Daten aus einem deutschen Mietvertrag.",
        "parameters": {
            "type": "object",
            "required": ["property", "tenants", "lease_term", "financials", "rent_type", "special_agreements", "meta"],
            "properties": {
                "property": {
                    "type": "object",
                    "required": ["street", "house_number", "city", "postal_code"],
                    "properties": {
                        "street":         {"type": "object", "required": ["value", "confidence"], "properties": {"value": {"type": ["string", "null"]}, "confidence": {"type": "number"}, "source_text": {"type": ["string", "null"]}}},
                        "house_number":   {"type": "object", "required": ["value", "confidence"], "properties": {"value": {"type": ["string", "null"]}, "confidence": {"type": "number"}, "source_text": {"type": ["string", "null"]}}},
                        "city":           {"type": "object", "required": ["value", "confidence"], "properties": {"value": {"type": ["string", "null"]}, "confidence": {"type": "number"}}},
                        "postal_code":    {"type": "object", "required": ["value", "confidence"], "properties": {"value": {"type": ["string", "null"]}, "confidence": {"type": "number"}}},
                        "floor":          {"type": "object", "required": ["value", "confidence"], "properties": {"value": {"type": ["string", "null"]}, "confidence": {"type": "number"}}},
                        "unit_number":    {"type": "object", "required": ["value", "confidence"], "properties": {"value": {"type": ["string", "null"]}, "confidence": {"type": "number"}}},
                        "area_sqm":       {"type": "object", "required": ["value", "confidence"], "properties": {"value": {"type": ["number", "null"]}, "confidence": {"type": "number"}}},
                        "rooms":          {"type": "object", "required": ["value", "confidence"], "properties": {"value": {"type": ["number", "null"]}, "confidence": {"type": "number"}}},
                        "has_parking":    {"type": "object", "required": ["value", "confidence"], "properties": {"value": {"type": ["boolean", "null"]}, "confidence": {"type": "number"}}},
                        "parking_number": {"type": "object", "required": ["value", "confidence"], "properties": {"value": {"type": ["string", "null"]}, "confidence": {"type": "number"}}},
                        "has_cellar":     {"type": "object", "required": ["value", "confidence"], "properties": {"value": {"type": ["boolean", "null"]}, "confidence": {"type": "number"}}},
                    },
                },
                "tenants": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "required": ["first_name", "last_name"],
                        "properties": {
                            "first_name":  {"type": "object", "required": ["value", "confidence"], "properties": {"value": {"type": ["string", "null"]}, "confidence": {"type": "number"}}},
                            "last_name":   {"type": "object", "required": ["value", "confidence"], "properties": {"value": {"type": ["string", "null"]}, "confidence": {"type": "number"}}},
                            "email":       {"type": "object", "required": ["value", "confidence"], "properties": {"value": {"type": ["string", "null"]}, "confidence": {"type": "number"}}},
                            "phone":       {"type": "object", "required": ["value", "confidence"], "properties": {"value": {"type": ["string", "null"]}, "confidence": {"type": "number"}}},
                            "is_primary":  {"type": "boolean"},
                        },
                    },
                },
                "lease_term": {
                    "type": "object",
                    "required": ["start_date", "is_fixed_term", "notice_period_months"],
                    "properties": {
                        "start_date":           {"type": "object", "required": ["value", "confidence"], "properties": {"value": {"type": ["string", "null"]}, "confidence": {"type": "number"}}},
                        "end_date":             {"type": "object", "required": ["value", "confidence"], "properties": {"value": {"type": ["string", "null"]}, "confidence": {"type": "number"}}},
                        "is_fixed_term":        {"type": "object", "required": ["value", "confidence"], "properties": {"value": {"type": ["boolean", "null"]}, "confidence": {"type": "number"}}},
                        "notice_period_months": {"type": "object", "required": ["value", "confidence"], "properties": {"value": {"type": ["integer", "null"]}, "confidence": {"type": "number"}}},
                    },
                },
                "financials": {
                    "type": "object",
                    "required": ["base_rent", "payment_day"],
                    "properties": {
                        "base_rent":       {"type": "object", "required": ["value", "confidence"], "properties": {"value": {"type": ["number", "null"]}, "confidence": {"type": "number"}}},
                        "operating_costs": {"type": "object", "required": ["value", "confidence"], "properties": {"value": {"type": ["number", "null"]}, "confidence": {"type": "number"}}},
                        "deposit":         {"type": "object", "required": ["value", "confidence"], "properties": {"value": {"type": ["number", "null"]}, "confidence": {"type": "number"}}},
                        "payment_day":     {"type": "object", "required": ["value", "confidence"], "properties": {"value": {"type": ["integer", "null"]}, "confidence": {"type": "number"}}},
                        "payment_method":  {"type": "object", "required": ["value", "confidence"], "properties": {"value": {"type": ["string", "null"], "enum": ["transfer", "direct_debit", None]}, "confidence": {"type": "number"}}},
                    },
                },
                "rent_type": {
                    "type": "object",
                    "required": ["type"],
                    "properties": {
                        "type":                             {"type": "object", "required": ["value", "confidence"], "properties": {"value": {"type": ["string", "null"], "enum": ["fixed", "indexed", "graduated", None]}, "confidence": {"type": "number"}}},
                        "index_type":                       {"type": "object", "required": ["value", "confidence"], "properties": {"value": {"type": ["string", "null"]}, "confidence": {"type": "number"}}},
                        "index_base_value":                 {"type": "object", "required": ["value", "confidence"], "properties": {"value": {"type": ["number", "null"]}, "confidence": {"type": "number"}}},
                        "index_base_date":                  {"type": "object", "required": ["value", "confidence"], "properties": {"value": {"type": ["string", "null"]}, "confidence": {"type": "number"}}},
                        "index_adjustment_interval_months": {"type": "object", "required": ["value", "confidence"], "properties": {"value": {"type": ["integer", "null"]}, "confidence": {"type": "number"}}},
                        "graduated_steps": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "effective_date": {"type": "object", "properties": {"value": {"type": ["string", "null"]}, "confidence": {"type": "number"}}},
                                    "new_rent":       {"type": "object", "properties": {"value": {"type": ["number", "null"]}, "confidence": {"type": "number"}}},
                                },
                            },
                        },
                    },
                },
                "special_agreements": {
                    "type": "object",
                    "properties": {
                        "pets_allowed":            {"type": "object", "required": ["value", "confidence"], "properties": {"value": {"type": ["boolean", "null"]}, "confidence": {"type": "number"}}},
                        "subletting_allowed":      {"type": "object", "required": ["value", "confidence"], "properties": {"value": {"type": ["boolean", "null"]}, "confidence": {"type": "number"}}},
                        "cosmetic_repairs_clause": {"type": "object", "required": ["value", "confidence"], "properties": {"value": {"type": ["string", "null"]}, "confidence": {"type": "number"}}},
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
