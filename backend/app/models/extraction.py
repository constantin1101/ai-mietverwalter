"""Pydantic models for lease extraction results."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Generic, Literal, Optional, TypeVar

from pydantic import BaseModel, Field, model_validator

T = TypeVar("T")


class ConfidenceField(BaseModel, Generic[T]):
    """Wraps any extracted value with a confidence score.
    value=None means the field was not found in the document.
    """
    value: Optional[Any] = None
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    source_text: Optional[str] = None


def _cf() -> ConfidenceField:
    return ConfidenceField()

def _cf_notice() -> ConfidenceField:
    return ConfidenceField(value=3)

def _cf_payment_day() -> ConfidenceField:
    return ConfidenceField(value=1)

def _cf_fixed() -> ConfidenceField:
    return ConfidenceField(value="fixed")



class PropertyExtraction(BaseModel):
    street: ConfidenceField = Field(default_factory=_cf)
    house_number: ConfidenceField = Field(default_factory=_cf)
    city: ConfidenceField = Field(default_factory=_cf)
    postal_code: ConfidenceField = Field(default_factory=_cf)
    floor: ConfidenceField = Field(default_factory=_cf)
    unit_number: ConfidenceField = Field(default_factory=_cf)
    area_sqm: ConfidenceField = Field(default_factory=_cf)
    rooms: ConfidenceField = Field(default_factory=_cf)
    has_parking: ConfidenceField = Field(default_factory=_cf)
    parking_number: ConfidenceField = Field(default_factory=_cf)
    has_cellar: ConfidenceField = Field(default_factory=_cf)


class TenantExtraction(BaseModel):
    first_name: ConfidenceField = Field(default_factory=_cf)
    last_name: ConfidenceField = Field(default_factory=_cf)
    email: ConfidenceField = Field(default_factory=_cf)
    phone: ConfidenceField = Field(default_factory=_cf)
    is_primary: bool = False


class LeaseTermExtraction(BaseModel):
    start_date: ConfidenceField = Field(default_factory=_cf)
    end_date: ConfidenceField = Field(default_factory=_cf)
    is_fixed_term: ConfidenceField = Field(default_factory=_cf)
    notice_period_months: ConfidenceField = Field(default_factory=_cf_notice)


class FinancialsExtraction(BaseModel):
    base_rent: ConfidenceField = Field(default_factory=_cf)
    operating_costs: ConfidenceField = Field(default_factory=_cf)
    deposit: ConfidenceField = Field(default_factory=_cf)
    payment_day: ConfidenceField = Field(default_factory=_cf_payment_day)
    payment_method: ConfidenceField = Field(default_factory=_cf)


class GraduatedStep(BaseModel):
    effective_date: ConfidenceField = Field(default_factory=_cf)
    new_rent: ConfidenceField = Field(default_factory=_cf)


class RentTypeExtraction(BaseModel):
    type: ConfidenceField = Field(default_factory=_cf_fixed)
    index_type: ConfidenceField = Field(default_factory=_cf)
    index_base_value: ConfidenceField = Field(default_factory=_cf)
    index_base_date: ConfidenceField = Field(default_factory=_cf)
    index_adjustment_interval_months: ConfidenceField = Field(default_factory=_cf)
    graduated_steps: list[GraduatedStep] = Field(default_factory=list)


class OtherClause(BaseModel):
    text: str
    type: str


class SpecialAgreementsExtraction(BaseModel):
    pets_allowed: ConfidenceField = Field(default_factory=_cf)
    subletting_allowed: ConfidenceField = Field(default_factory=_cf)
    cosmetic_repairs_clause: ConfidenceField = Field(default_factory=_cf)
    other_notable_clauses: list[OtherClause] = Field(default_factory=list)


class ExtractionMeta(BaseModel):
    overall_confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    low_confidence_fields: list[str] = Field(default_factory=list)
    missing_fields: list[str] = Field(default_factory=list)
    extraction_notes: Optional[str] = None


class ExtractionResult(BaseModel):
    model_config = {"populate_by_name": True}

    property: PropertyExtraction = Field(default_factory=PropertyExtraction)
    tenants: list[TenantExtraction] = Field(default_factory=list)
    # Accept both "lease_term" and "lease_terms" from the LLM
    lease_term: Optional[LeaseTermExtraction] = Field(default=None)
    lease_terms: Optional[LeaseTermExtraction] = Field(default=None)
    financials: FinancialsExtraction = Field(default_factory=FinancialsExtraction)
    rent_type: RentTypeExtraction = Field(default_factory=RentTypeExtraction)
    special_agreements: SpecialAgreementsExtraction = Field(default_factory=SpecialAgreementsExtraction)
    meta: ExtractionMeta = Field(default_factory=ExtractionMeta)

    @model_validator(mode="after")
    def normalise(self) -> "ExtractionResult":
        # Merge lease_terms → lease_term
        if self.lease_terms is not None and self.lease_term is None:
            self.lease_term = self.lease_terms
        if self.lease_term is None:
            self.lease_term = LeaseTermExtraction()
        # Ensure first tenant is marked primary
        if self.tenants and not any(t.is_primary for t in self.tenants):
            self.tenants[0].is_primary = True
        return self

    def effective_lease_term(self) -> LeaseTermExtraction:
        if self.lease_term is not None:
            return self.lease_term
        if self.lease_terms is not None:
            return self.lease_terms
        return LeaseTermExtraction()


@dataclass
class ValidationError:
    field: str
    level: Literal["warning", "error"]
    message: str


def validate_extraction(data: ExtractionResult) -> list[ValidationError]:
    errors: list[ValidationError] = []
    base_rent = data.financials.base_rent.value or 0.0

    if not base_rent or base_rent <= 0:
        errors.append(ValidationError(
            field="financials.base_rent", level="error",
            message="Kaltmiete konnte nicht extrahiert werden.",
        ))

    nk = data.financials.operating_costs.value
    if nk and base_rent > 0 and nk > 0.5 * base_rent:
        errors.append(ValidationError(
            field="financials.operating_costs", level="warning",
            message=f"Betriebskosten ({nk} €) > 50% der Kaltmiete ({base_rent} €) — bitte prüfen.",
        ))

    deposit = data.financials.deposit.value
    if deposit and base_rent > 0 and deposit > 3 * base_rent:
        errors.append(ValidationError(
            field="financials.deposit", level="error",
            message=f"Kaution ({deposit} €) > 3 Monatskaltmieten — nach § 551 BGB unzulässig.",
        ))

    steps = data.rent_type.graduated_steps
    if len(steps) > 1:
        dates = [s.effective_date.value for s in steps if s.effective_date.value]
        for i in range(1, len(dates)):
            if dates[i] <= dates[i - 1]:
                errors.append(ValidationError(
                    field=f"rent_type.graduated_steps[{i}].effective_date", level="error",
                    message=f"Staffelmiete-Stufen nicht chronologisch: {dates[i]} ≤ {dates[i-1]}.",
                ))

    return errors
