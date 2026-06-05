# 🤖 AI-Extraktions-Pipeline

## Überblick

Die AI-Pipeline ist das Herzstück des Produkts. Sie verwandelt einen rohen PDF-Mietvertrag in strukturierte, handlungsfähige Daten.

```
PDF/Bild
  │
  ▼
[1. Upload & Validierung]
  │  - Datei-Typ, Größe
  │  - Supabase Storage
  │
  ▼
[2. OCR (Mistral)]
  │  - Text-Extraktion
  │  - Seiten-Struktur erhalten
  │  - Qualitäts-Check
  │
  ▼
[3. Vorverarbeitung]
  │  - Text-Normalisierung
  │  - Sektions-Erkennung
  │  - Prompt-Aufbereitung
  │
  ▼
[4. AI-Extraktion (Claude claude-sonnet-4-6)]
  │  - Structured Output via Tool Use
  │  - Confidence-Scores pro Feld
  │  - Fehlende Felder explizit markiert
  │
  ▼
[5. Validierung & Plausibilitäts-Check]
  │  - Pydantic-Validierung
  │  - Cross-Field Checks (z.B. NK ≤ 50% Kaltmiete)
  │  - Niedrige Confidence markieren
  │
  ▼
[6. Review-Dialog (User)]
  │  - Hervorgehobene Low-Confidence Felder
  │  - Inline-Korrektur
  │  - User bestätigt
  │
  ▼
[7. Persistierung]
     - units, leases, tenants, rent_adjustments
     - deadlines (auto-generiert)
     - legal_checks (async, nach Bestätigung)
```

---

## Extraktion: Datenstruktur

### Pydantic-Models (Python)
```python
# backend/app/models/extraction.py
from __future__ import annotations
from typing import Generic, TypeVar, Optional, Literal
from pydantic import BaseModel, Field, field_validator
from datetime import date

T = TypeVar("T")


class ConfidenceField(BaseModel, Generic[T]):
    """Wrapper für jeden extrahierten Wert mit Confidence-Score."""
    value: T
    confidence: float = Field(ge=0.0, le=1.0)
    source_text: Optional[str] = None  # Originaltext im Vertrag


class PropertyExtraction(BaseModel):
    street: ConfidenceField[str]
    house_number: ConfidenceField[str]
    city: ConfidenceField[str]
    postal_code: ConfidenceField[str]
    floor: ConfidenceField[Optional[str]]
    unit_number: ConfidenceField[Optional[str]]
    area_sqm: ConfidenceField[Optional[float]]
    rooms: ConfidenceField[Optional[float]]
    has_parking: ConfidenceField[Optional[bool]]
    parking_number: ConfidenceField[Optional[str]]
    has_cellar: ConfidenceField[Optional[bool]]


class TenantExtraction(BaseModel):
    first_name: ConfidenceField[str]
    last_name: ConfidenceField[str]
    email: ConfidenceField[Optional[str]]
    phone: ConfidenceField[Optional[str]]
    is_primary: bool = False


class LeaseTermExtraction(BaseModel):
    start_date: ConfidenceField[str]          # ISO date string YYYY-MM-DD
    end_date: ConfidenceField[Optional[str]]
    is_fixed_term: ConfidenceField[bool]
    notice_period_months: ConfidenceField[int]


class FinancialsExtraction(BaseModel):
    base_rent: ConfidenceField[float]
    operating_costs: ConfidenceField[Optional[float]]
    deposit: ConfidenceField[Optional[float]]
    payment_day: ConfidenceField[int]         # 1–28
    payment_method: ConfidenceField[Optional[Literal["transfer", "direct_debit"]]]


class GraduatedStep(BaseModel):
    effective_date: ConfidenceField[str]
    new_rent: ConfidenceField[float]


class RentTypeExtraction(BaseModel):
    type: ConfidenceField[Literal["fixed", "indexed", "graduated"]]
    # Indexmiete
    index_type: ConfidenceField[Optional[Literal["VPI", "other"]]]
    index_base_value: ConfidenceField[Optional[float]]
    index_base_date: ConfidenceField[Optional[str]]
    index_adjustment_interval_months: ConfidenceField[Optional[int]]
    # Staffelmiete
    graduated_steps: list[GraduatedStep] = []


class OtherClause(BaseModel):
    text: str
    type: str


class SpecialAgreementsExtraction(BaseModel):
    pets_allowed: ConfidenceField[Optional[bool]]
    subletting_allowed: ConfidenceField[Optional[bool]]
    cosmetic_repairs_clause: ConfidenceField[Optional[str]]
    other_notable_clauses: list[OtherClause] = []


class ExtractionMeta(BaseModel):
    overall_confidence: float = Field(ge=0.0, le=1.0)
    low_confidence_fields: list[str]   # Feld-Pfade mit confidence < 0.8
    missing_fields: list[str]          # Pflichtfelder nicht gefunden
    extraction_notes: Optional[str] = None


class ExtractionResult(BaseModel):
    property: PropertyExtraction
    tenants: list[TenantExtraction]
    lease_term: LeaseTermExtraction
    financials: FinancialsExtraction
    rent_type: RentTypeExtraction
    special_agreements: SpecialAgreementsExtraction
    meta: ExtractionMeta
```

---

## Extraktions-Prompt

```python
# backend/app/services/ai/prompts/extract_lease.py

LEASE_EXTRACTION_SYSTEM_PROMPT = """
Du bist ein Experte für deutsches Mietrecht und die Analyse von Mietverträgen.
Deine Aufgabe: Extrahiere alle relevanten Daten aus dem gegebenen Mietvertragstext.

WICHTIGE REGELN:
1. Extrahiere NUR Informationen, die explizit im Text stehen
2. Erfinde oder schätze NIEMALS Daten
3. Bei Unklarheit: niedrigen Confidence-Score setzen (< 0.7)
4. Confidence 1.0 = eindeutig und klar im Text; 0.5 = interpretiert; 0.0 = nicht gefunden
5. Bei fehlenden Pflichtfeldern: confidence = 0, value = null
6. Datumsformat: immer YYYY-MM-DD
7. Geldbeträge: immer als Zahl ohne Währungszeichen (z.B. 850.00, nicht "850,00 €")

DEUTSCHE BESONDERHEITEN:
- "Kaltmiete" = base_rent (ohne Betriebskosten)
- "Vorauszahlung für Betriebskosten/Nebenkosten" = operating_costs
- "Staffelmiete" = graduated rent (rent_type: "graduated")
- "Indexmiete" = indexed rent (rent_type: "indexed")
- VPI = Verbraucherpreisindex (Standard-Index in Deutschland)
- Kündigungsfristen: gesetzlich 3 Monate (Mieter), kann vertraglich länger sein
- Kaution: max 3 Monatskaltmieten (gesetzlich)

HÄUFIGE SCHÖNHEITSREPARATUREN-KLAUSELN (zur Erkennung):
- Starre Fristen (z.B. "alle 3 Jahre Bad, alle 5 Jahre Wohnräume") → meist unwirksam
- Quotenklauseln → meist unwirksam
- Endrenovierungsklauseln → meist unwirksam

Antworte NUR mit dem Tool-Call. Kein Freitext.
"""


def build_extraction_user_prompt(ocr_text: str) -> str:
    return f"""Analysiere diesen Mietvertragstext und extrahiere alle Daten:

<mietvertrag>
{ocr_text}
</mietvertrag>

Rufe das Tool "extract_lease_data" mit allen gefundenen Informationen auf."""
```

---

## Claude API Call (Structured Output)

```python
# backend/app/services/ai/extract.py
import time
import logging
from anthropic import AsyncAnthropic
from pydantic import ValidationError

from app.models.extraction import ExtractionResult
from app.services.ai.prompts.extract_lease import (
    LEASE_EXTRACTION_SYSTEM_PROMPT,
    build_extraction_user_prompt,
)

logger = logging.getLogger(__name__)
client = AsyncAnthropic()

# Tool-Definition — JSON Schema direkt aus Pydantic generiert
EXTRACTION_TOOL = {
    "name": "extract_lease_data",
    "description": "Extrahiert alle Daten aus einem deutschen Mietvertrag",
    "input_schema": ExtractionResult.model_json_schema(),
}


async def extract_lease_data(ocr_text: str) -> ExtractionResult:
    start = time.monotonic()

    response = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        system=LEASE_EXTRACTION_SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": build_extraction_user_prompt(ocr_text),
            }
        ],
        tools=[EXTRACTION_TOOL],
        tool_choice={"type": "auto"},
    )

    duration_ms = int((time.monotonic() - start) * 1000)
    logger.info(
        "[AI Extract] %d in / %d out | %dms",
        response.usage.input_tokens,
        response.usage.output_tokens,
        duration_ms,
    )

    # Tool-Call extrahieren
    tool_use = next(
        (block for block in response.content if block.type == "tool_use"),
        None,
    )
    if tool_use is None:
        raise ValueError("AI returned no structured extraction result")

    # Pydantic-Validierung
    try:
        return ExtractionResult.model_validate(tool_use.input)
    except ValidationError as exc:
        logger.error("[AI Extract] Validation failed: %s", exc)
        raise
```

---

## OCR-Pipeline (Mistral)

```python
# backend/app/services/ocr/mistral.py
import base64
import logging
from mistralai import Mistral

from app.core.config import settings

logger = logging.getLogger(__name__)
_client = Mistral(api_key=settings.mistral_api_key)


async def extract_text_from_pdf(file_bytes: bytes, filename: str) -> str:
    """PDF oder Bild → strukturierter Markdown-Text via Mistral OCR."""
    mime_type = "application/pdf" if filename.lower().endswith(".pdf") else "image/jpeg"
    b64 = base64.b64encode(file_bytes).decode()

    response = await _client.ocr.process_async(
        model="mistral-ocr-latest",
        document={
            "type": "document_url",
            "document_url": f"data:{mime_type};base64,{b64}",
        },
        include_image_base64=False,
    )

    # Alle Seiten zu einem Text zusammenfügen
    pages = [f"=== Seite {i + 1} ===\n{page.markdown}" for i, page in enumerate(response.pages)]
    full_text = "\n\n".join(pages)

    logger.info("[OCR] %d Seiten extrahiert aus '%s'", len(response.pages), filename)
    return full_text
```

---

## Rechts-Check Pipeline

### BGH-Urteils-Datenbank (initiale Top-50)
```python
# backend/app/services/ai/legal_database.py
from typing import Literal
from pydantic import BaseModel


class BGHCase(BaseModel):
    reference: str        # z.B. "BGH VIII ZR 354/04"
    date: str
    clause_type: str
    summary: str
    tenant_impact: Literal["favorable", "unfavorable", "neutral"]


# Statische Datenbank der wichtigsten BGH-Urteile zu Mietrecht
# Wird inline in den Prompt eingebaut
BGH_CASES: list[BGHCase] = [
    BGHCase(
        reference="BGH VIII ZR 354/04",
        date="2005-04-13",
        clause_type="cosmetic_repairs_rigid_intervals",
        summary='Starre Fristen bei Schönheitsreparaturen (z.B. "alle 3 Jahre Bad") sind unwirksam',
        tenant_impact="favorable",
    ),
    BGHCase(
        reference="BGH VIII ZR 52/06",
        date="2006-10-04",
        clause_type="cosmetic_repairs_quota",
        summary="Quotenklauseln bei Schönheitsreparaturen sind unwirksam",
        tenant_impact="favorable",
    ),
    BGHCase(
        reference="BGH VIII ZR 281/03",
        date="2004-07-14",
        clause_type="end_renovation",
        summary="Endrenovierungsklauseln bei unrenovierten Übergabe-Wohnungen unwirksam",
        tenant_impact="favorable",
    ),
    # ... weitere 47 Fälle
]
```

### Rechts-Check Prompt
```python
# backend/app/services/ai/prompts/legal_analysis.py

LEGAL_CHECK_SYSTEM_PROMPT = """
Du bist ein spezialisierter Anwalt für deutsches Mietrecht.
Analysiere die gegebenen Klauseln aus einem Mietvertrag auf rechtliche Risiken.

FOKUS:
- Unwirksame Formularklauseln (AGB-Recht, § 307 BGB)
- Verstöße gegen Mietrecht (§§ 535-580a BGB)
- Benachteiligung des Mieters über das gesetzliche Maß hinaus

REFERENZ-URTEILE stehen dir zur Verfügung. Nutze sie für Begründungen.

BEWERTUNGS-SKALA:
- high: Klausel wahrscheinlich unwirksam oder stark benachteiligend
- medium: Klausel problematisch, Rechtslage unklar oder situationsabhängig
- low: Klausel ungewöhnlich aber wahrscheinlich wirksam

WICHTIG: Analysiere nur was im Text steht. Keine allgemeinen Empfehlungen.
Antworte NUR mit dem Tool-Call.
"""
```

---

## Fristen-Generierung (nach Extraktion)

Nach erfolgreicher Extraktion werden automatisch Deadlines erstellt:

```python
# backend/app/utils/deadline_generator.py
from datetime import date
from dataclasses import dataclass, field
from dateutil.relativedelta import relativedelta

from app.models.extraction import ExtractionResult


@dataclass
class DeadlineInsert:
    title: str
    due_date: date
    deadline_type: str
    notify_days_before: list[int]
    is_auto_generated: bool = True
    description: str = ""


def generate_deadlines_from_lease(lease: ExtractionResult) -> list[DeadlineInsert]:
    deadlines: list[DeadlineInsert] = []
    today = date.today()

    # 1. Staffelmiete-Stufen
    if lease.rent_type.type.value == "graduated":
        for step in lease.rent_type.graduated_steps:
            step_date = date.fromisoformat(step.effective_date.value)
            if step_date > today:
                deadlines.append(DeadlineInsert(
                    title=f"Staffelmiete: {step.new_rent.value:.0f} € ab {step_date.strftime('%d.%m.%Y')}",
                    due_date=step_date,
                    deadline_type="rent_adjustment",
                    notify_days_before=[60, 30, 14],
                ))

    # 2. Indexmiete — nächste Prüfung
    if lease.rent_type.type.value == "indexed":
        interval_months = lease.rent_type.index_adjustment_interval_months.value or 12
        base_date_str = lease.rent_type.index_base_date.value or lease.lease_term.start_date.value
        next_check = date.fromisoformat(base_date_str)
        while next_check <= today:
            next_check += relativedelta(months=interval_months)
        deadlines.append(DeadlineInsert(
            title="Indexmiete prüfen — VPI-Anpassung möglicherweise fällig",
            due_date=next_check,
            deadline_type="rent_adjustment",
            notify_days_before=[30, 14],
        ))

    # 3. Vertragsende (bei befristeten Verträgen)
    if lease.lease_term.is_fixed_term.value and lease.lease_term.end_date.value:
        end_date = date.fromisoformat(lease.lease_term.end_date.value)
        deadlines.append(DeadlineInsert(
            title="Mietvertrag läuft aus",
            due_date=end_date,
            deadline_type="lease_termination",
            notify_days_before=[90, 60, 30],
        ))

    # 4. NK-Abrechnung (Frist: 12 Monate nach Abrechnungsjahr-Ende)
    current_year = today.year
    nk_deadline = date(current_year + 1, 12, 31)
    deadlines.append(DeadlineInsert(
        title=f"NK-Abrechnung {current_year} erstellen (Frist: 31.12.{current_year + 1})",
        due_date=nk_deadline,
        deadline_type="utility_statement",
        notify_days_before=[60, 30],
    ))

    return deadlines
```

---

## Kosten-Schätzung

### Pro Mietvertrag (~10 Seiten)
| Schritt | Kosten |
|---------|--------|
| Mistral OCR (10 Seiten) | ~0,05 € |
| Claude Extraktion (~8k Tokens in, ~2k out) | ~0,04 € |
| Claude Rechts-Check (~6k Tokens in, ~1k out) | ~0,03 € |
| **Total pro Upload** | **~0,12 €** |

### Jährliche Kosten pro Nutzer (Pro-Tier, 10 Einheiten)
| Position | Kosten |
|----------|--------|
| 10 Erstextraktionen | 1,20 € |
| 12x Index-Check pro Einheit | 0,36 € |
| Rechts-Checks + Nachfragen | ~2 € |
| Storage (Supabase, 10 Docs à 5MB) | ~0,10 € |
| **AI-Kosten total** | **~3,70 €/Jahr** |

Bei 12,90 €/Monat = **Gross Margin AI: ~97%** ✅

---

## Qualitätssicherung

### Confidence-Threshold Strategie
- `>= 0.85`: Automatisch akzeptiert, grau dargestellt
- `0.70 – 0.84`: Gelb markiert ("bitte prüfen")
- `< 0.70`: Rot markiert, User muss explizit bestätigen
- `null`/fehlend: Pflichtfeld-Banner oben im Review-Dialog

### Plausibilitäts-Checks (nach Extraktion)
```python
# backend/app/services/ai/extract.py (Teil der validate_extraction Funktion)
from dataclasses import dataclass
from typing import Literal

from app.models.extraction import ExtractionResult


@dataclass
class ValidationError:
    field: str
    level: Literal["warning", "error"]
    message: str


def validate_extraction(data: ExtractionResult) -> list[ValidationError]:
    errors: list[ValidationError] = []

    base_rent = data.financials.base_rent.value
    op_costs = data.financials.operating_costs.value
    deposit = data.financials.deposit.value

    # NK darf nicht mehr als 50% der Kaltmiete sein (Warnung)
    if op_costs and op_costs > base_rent * 0.5:
        errors.append(ValidationError(
            field="financials.operating_costs",
            level="warning",
            message="Betriebskosten > 50% der Kaltmiete — bitte prüfen",
        ))

    # Kaution max 3 Monatskaltmieten (gesetzlich)
    if deposit and deposit > base_rent * 3:
        errors.append(ValidationError(
            field="financials.deposit",
            level="error",
            message="Kaution > 3 Monatskaltmieten — gesetzlich unzulässig",
        ))

    # Staffelmiete-Stufen müssen chronologisch aufsteigen
    if data.rent_type.graduated_steps:
        dates = [s.effective_date.value for s in data.rent_type.graduated_steps]
        if dates != sorted(dates):
            errors.append(ValidationError(
                field="rent_type.graduated_steps",
                level="error",
                message="Staffelmiete-Stufen sind nicht chronologisch — bitte prüfen",
            ))

    return errors
```
