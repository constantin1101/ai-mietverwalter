from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from typing import Literal

from dateutil.parser import parse as parse_date
from dateutil.relativedelta import relativedelta

from app.models.extraction import ExtractionResult

TODAY = date.today()

DeadlineType = Literal[
    "rent_adjustment",
    "lease_termination",
    "utility_statement",
    "inspection",
    "custom",
]


@dataclass
class DeadlineInsert:
    unit_id: str
    lease_id: str
    title: str
    description: str
    due_date: date
    deadline_type: DeadlineType
    notify_days_before: list[int]
    is_auto_generated: bool = True


def _parse_iso_date(value: str) -> date | None:
    """Parse an ISO date string to a date object. Returns None on failure."""
    try:
        return parse_date(value).date()
    except (ValueError, TypeError):
        return None


def generate_deadlines_from_lease(
    extraction: ExtractionResult,
    unit_id: str,
    lease_id: str,
) -> list[DeadlineInsert]:
    """Generate deadline reminders from an extracted lease.

    Generates the following deadline types:
    - Graduated rent (Staffelmiete): one deadline per future step
    - Indexed rent (Indexmiete): next periodic check date
    - Fixed-term lease end date
    - NK-Abrechnung (utility statement) due by December 31 of next year
    """
    deadlines: list[DeadlineInsert] = []

    rent_type = extraction.rent_type

    # ------------------------------------------------------------------
    # 1. Graduated rent (Staffelmiete)
    # ------------------------------------------------------------------
    if rent_type.type.value == "graduated" and rent_type.graduated_steps:
        for step in rent_type.graduated_steps:
            # Skip if either the date or rent has low confidence
            if step.effective_date.confidence < 0.5 or step.new_rent.confidence < 0.5:
                continue

            step_date = _parse_iso_date(step.effective_date.value)
            if step_date is None:
                continue

            if step_date <= TODAY:
                continue

            new_rent = step.new_rent.value
            formatted_date = step_date.strftime("%d.%m.%Y")

            deadline = DeadlineInsert(
                unit_id=unit_id,
                lease_id=lease_id,
                title=f"Staffelmiete: {new_rent:.0f} € ab {formatted_date}",
                description=(
                    f"Die Staffelmiete erhöht sich ab {formatted_date} auf "
                    f"{new_rent:.2f} € (Nettokaltmiete). Bitte Mieter rechtzeitig "
                    f"informieren und Zahlungseingang prüfen."
                ),
                due_date=step_date,
                deadline_type="rent_adjustment",
                notify_days_before=[60, 30, 14],
            )
            deadlines.append(deadline)

    # ------------------------------------------------------------------
    # 2. Indexed rent (Indexmiete) — next check date
    # ------------------------------------------------------------------
    elif rent_type.type.value == "indexed":
        # Determine interval; fall back to 12 months if not specified or low confidence
        interval_months = 12
        if (
            rent_type.index_adjustment_interval_months is not None
            and rent_type.index_adjustment_interval_months.confidence >= 0.5
        ):
            interval_months = rent_type.index_adjustment_interval_months.value

        # Determine base date for the interval calculation
        base_date: date | None = None
        if (
            rent_type.index_base_date is not None
            and rent_type.index_base_date.confidence >= 0.5
        ):
            base_date = _parse_iso_date(rent_type.index_base_date.value)

        if base_date is None and extraction.effective_lease_term().start_date.confidence >= 0.5:
            base_date = _parse_iso_date(extraction.effective_lease_term().start_date.value)

        if base_date is not None:
            # Walk forward from base_date in intervals until we find a future date
            next_check = base_date
            while next_check <= TODAY:
                next_check = next_check + relativedelta(months=interval_months)

            deadline = DeadlineInsert(
                unit_id=unit_id,
                lease_id=lease_id,
                title="Indexmiete prüfen — VPI-Anpassung möglicherweise fällig",
                description=(
                    f"Gemäß Indexmietvertrag ist zum {next_check.strftime('%d.%m.%Y')} "
                    f"eine Anpassung der Miete an den Verbraucherpreisindex (VPI) zu prüfen. "
                    f"Aktuellen VPI beim Statistischen Bundesamt abrufen und Mietanpassung "
                    f"schriftlich ankündigen (mind. 1 Monat im Voraus)."
                ),
                due_date=next_check,
                deadline_type="rent_adjustment",
                notify_days_before=[30, 14],
            )
            deadlines.append(deadline)

    # ------------------------------------------------------------------
    # 3. Fixed-term lease end date
    # ------------------------------------------------------------------
    if (
        extraction.effective_lease_term().is_fixed_term.value
        and extraction.effective_lease_term().is_fixed_term.confidence >= 0.5
        and extraction.effective_lease_term().end_date is not None
        and extraction.effective_lease_term().end_date.confidence >= 0.5
    ):
        end_date = _parse_iso_date(extraction.effective_lease_term().end_date.value)
        if end_date is not None and end_date > TODAY:
            deadline = DeadlineInsert(
                unit_id=unit_id,
                lease_id=lease_id,
                title="Mietvertrag läuft aus",
                description=(
                    f"Der befristete Mietvertrag endet am {end_date.strftime('%d.%m.%Y')}. "
                    f"Rechtzeitig prüfen, ob eine Verlängerung, Neuvermietung oder Übergabe "
                    f"geplant ist. Kündigung/Übergabeprotokoll vorbereiten."
                ),
                due_date=end_date,
                deadline_type="lease_termination",
                notify_days_before=[90, 60, 30],
            )
            deadlines.append(deadline)

    # ------------------------------------------------------------------
    # 4. NK-Abrechnung (utility statement)
    # ------------------------------------------------------------------
    # Due by December 31 of the year following the current calendar year.
    # The statement covers the current year; deadline is 31.12 of next year.
    current_year = TODAY.year
    nk_due_date = date(current_year + 1, 12, 31)

    if nk_due_date > TODAY:
        deadline = DeadlineInsert(
            unit_id=unit_id,
            lease_id=lease_id,
            title=f"NK-Abrechnung {current_year} fällig bis 31.12.{current_year + 1}",
            description=(
                f"Die Nebenkostenabrechnung für das Jahr {current_year} muss dem Mieter "
                f"spätestens bis zum 31.12.{current_year + 1} zugestellt werden (§556 BGB, "
                f"12-Monats-Abrechnungsfrist). Belege sammeln und Abrechnung rechtzeitig "
                f"erstellen."
            ),
            due_date=nk_due_date,
            deadline_type="utility_statement",
            notify_days_before=[60, 30],
        )
        deadlines.append(deadline)

    return deadlines