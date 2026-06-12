"use client";

import { useState, useEffect } from "react";
import { X, Loader2, ChevronLeft, AlertTriangle, CheckCircle2 } from "lucide-react";
import { api, ApiError } from "@/lib/api/client";
import type { UnitDetail } from "@/types/api";

// ── Types ─────────────────────────────────────────────────────────────────────

interface FormState {
  // Unit
  unit_number: string;
  floor: string;
  area_sqm: string;
  rooms: string;
  has_cellar: boolean;
  has_parking: boolean;
  parking_number: string;
  // Financials
  base_rent: string;
  operating_costs: string;
  deposit: string;
  payment_day: string;
  payment_method: string;
  // Lease
  start_date: string;
  end_date: string;
  is_fixed_term: boolean;
  notice_period_months: string;
  rent_type: string;
  cosmetic_repairs_clause: string;
  pets_allowed: string;
  subletting_allowed: string;
  // Primary tenant
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

type EditTab = "einheit" | "finanzen" | "vertrag" | "mieter";

type DiffEntry = { label: string; before: string; after: string };

// ── Helpers ───────────────────────────────────────────────────────────────────

function initForm(unit: UnitDetail): FormState {
  const t = unit.tenants[0];
  return {
    unit_number: unit.unit_number ?? "",
    floor: unit.floor != null ? String(unit.floor) : "",
    area_sqm: unit.area_sqm != null ? String(unit.area_sqm) : "",
    rooms: unit.rooms != null ? String(unit.rooms) : "",
    has_cellar: unit.has_cellar,
    has_parking: unit.has_parking,
    parking_number: unit.parking_number ?? "",
    base_rent: String(unit.lease.base_rent),
    operating_costs: unit.lease.operating_costs != null ? String(unit.lease.operating_costs) : "",
    deposit: unit.lease.deposit != null ? String(unit.lease.deposit) : "",
    payment_day: String(unit.lease.payment_day),
    payment_method: unit.lease.payment_method ?? "",
    start_date: unit.lease.start_date,
    end_date: unit.lease.end_date ?? "",
    is_fixed_term: unit.lease.is_fixed_term,
    notice_period_months: String(unit.lease.notice_period_months),
    rent_type: unit.lease.rent_type,
    cosmetic_repairs_clause: unit.lease.cosmetic_repairs_clause ?? "",
    pets_allowed: unit.lease.pets_allowed === true ? "true" : unit.lease.pets_allowed === false ? "false" : "",
    subletting_allowed: unit.lease.subletting_allowed === true ? "true" : unit.lease.subletting_allowed === false ? "false" : "",
    first_name: t?.first_name ?? "",
    last_name: t?.last_name ?? "",
    email: t?.email ?? "",
    phone: t?.phone ?? "",
  };
}

function computeDiff(unit: UnitDetail, form: FormState): DiffEntry[] {
  const orig = initForm(unit);
  const diffs: DiffEntry[] = [];

  const check = (label: string, before: string, after: string) => {
    const b = before.trim();
    const a = after.trim();
    if (b !== a) diffs.push({ label, before: b, after: a });
  };
  const checkBool = (label: string, before: boolean, after: boolean) => {
    if (before !== after) diffs.push({ label, before: before ? "Ja" : "Nein", after: after ? "Ja" : "Nein" });
  };

  check("Einheitsnummer", orig.unit_number, form.unit_number);
  check("Etage", orig.floor, form.floor);
  check("Wohnfläche (m²)", orig.area_sqm, form.area_sqm);
  check("Zimmer", orig.rooms, form.rooms);
  checkBool("Keller", orig.has_cellar, form.has_cellar);
  checkBool("Stellplatz", orig.has_parking, form.has_parking);
  check("Stellplatz-Nr.", orig.parking_number, form.parking_number);

  check("Kaltmiete (€)", orig.base_rent, form.base_rent);
  check("Betriebskosten (€)", orig.operating_costs, form.operating_costs);
  check("Kaution (€)", orig.deposit, form.deposit);
  check("Zahltag", orig.payment_day, form.payment_day);
  const pmLabel = (v: string) => v === "transfer" ? "Banküberweisung" : v === "direct_debit" ? "SEPA-Lastschrift" : v;
  if (orig.payment_method !== form.payment_method) diffs.push({ label: "Zahlungsweise", before: pmLabel(orig.payment_method), after: pmLabel(form.payment_method) });

  check("Mietbeginn", orig.start_date, form.start_date);
  check("Mietende", orig.end_date, form.end_date);
  checkBool("Befristeter Vertrag", orig.is_fixed_term, form.is_fixed_term);
  check("Kündigungsfrist (Monate)", orig.notice_period_months, form.notice_period_months);
  const rtLabel = (v: string) => v === "fixed" ? "Festmiete" : v === "indexed" ? "Indexmiete" : v === "graduated" ? "Staffelmiete" : v;
  if (orig.rent_type !== form.rent_type) diffs.push({ label: "Mietart", before: rtLabel(orig.rent_type), after: rtLabel(form.rent_type) });
  check("Schönheitsreparaturen", orig.cosmetic_repairs_clause, form.cosmetic_repairs_clause);
  const boolOptLabel = (v: string) => v === "true" ? "Erlaubt" : v === "false" ? "Nicht erlaubt" : "—";
  if (orig.pets_allowed !== form.pets_allowed) diffs.push({ label: "Tierhaltung", before: boolOptLabel(orig.pets_allowed), after: boolOptLabel(form.pets_allowed) });
  if (orig.subletting_allowed !== form.subletting_allowed) diffs.push({ label: "Untermiete", before: boolOptLabel(orig.subletting_allowed), after: boolOptLabel(form.subletting_allowed) });

  check("Vorname Mieter", orig.first_name, form.first_name);
  check("Nachname Mieter", orig.last_name, form.last_name);
  check("E-Mail Mieter", orig.email, form.email);
  check("Telefon Mieter", orig.phone, form.phone);

  return diffs;
}

function buildPayload(unit: UnitDetail, form: FormState) {
  const orig = initForm(unit);

  const unitPatch: Record<string, unknown> = {};
  if (form.unit_number.trim() !== orig.unit_number) unitPatch.unit_number = form.unit_number.trim() || null;
  if (form.floor !== orig.floor) unitPatch.floor = form.floor ? parseInt(form.floor) : null;
  if (form.area_sqm !== orig.area_sqm) unitPatch.area_sqm = form.area_sqm ? parseFloat(form.area_sqm) : null;
  if (form.rooms !== orig.rooms) unitPatch.rooms = form.rooms ? parseFloat(form.rooms) : null;
  if (form.has_cellar !== orig.has_cellar) unitPatch.has_cellar = form.has_cellar;
  if (form.has_parking !== orig.has_parking) unitPatch.has_parking = form.has_parking;
  if (form.parking_number.trim() !== orig.parking_number) unitPatch.parking_number = form.parking_number.trim() || null;

  const leasePatch: Record<string, unknown> = {};
  if (form.base_rent !== orig.base_rent) leasePatch.base_rent = parseFloat(form.base_rent);
  if (form.operating_costs !== orig.operating_costs) leasePatch.operating_costs = form.operating_costs ? parseFloat(form.operating_costs) : null;
  if (form.deposit !== orig.deposit) leasePatch.deposit = form.deposit ? parseFloat(form.deposit) : null;
  if (form.payment_day !== orig.payment_day) leasePatch.payment_day = parseInt(form.payment_day);
  if (form.payment_method !== orig.payment_method) leasePatch.payment_method = form.payment_method || null;
  if (form.start_date !== orig.start_date) leasePatch.start_date = form.start_date;
  if (form.end_date !== orig.end_date) leasePatch.end_date = form.end_date || null;
  if (form.is_fixed_term !== orig.is_fixed_term) leasePatch.is_fixed_term = form.is_fixed_term;
  if (form.notice_period_months !== orig.notice_period_months) leasePatch.notice_period_months = parseInt(form.notice_period_months);
  if (form.rent_type !== orig.rent_type) leasePatch.rent_type = form.rent_type;
  if (form.cosmetic_repairs_clause !== orig.cosmetic_repairs_clause) leasePatch.cosmetic_repairs_clause = form.cosmetic_repairs_clause || null;
  if (form.pets_allowed !== orig.pets_allowed) leasePatch.pets_allowed = form.pets_allowed === "true" ? true : form.pets_allowed === "false" ? false : null;
  if (form.subletting_allowed !== orig.subletting_allowed) leasePatch.subletting_allowed = form.subletting_allowed === "true" ? true : form.subletting_allowed === "false" ? false : null;

  const hasTenant = unit.tenants.length > 0;
  const tenantPatch: Record<string, unknown> = {};
  if (hasTenant) {
    if (form.first_name.trim() !== orig.first_name) tenantPatch.first_name = form.first_name.trim();
    if (form.last_name.trim() !== orig.last_name) tenantPatch.last_name = form.last_name.trim();
    if (form.email.trim() !== orig.email) tenantPatch.email = form.email.trim() || null;
    if (form.phone.trim() !== orig.phone) tenantPatch.phone = form.phone.trim() || null;
  }

  return {
    unit: Object.keys(unitPatch).length > 0 ? unitPatch : undefined,
    lease: Object.keys(leasePatch).length > 0 ? leasePatch : undefined,
    tenant: hasTenant && Object.keys(tenantPatch).length > 0 ? tenantPatch : undefined,
  };
}

// ── Shared input classes ───────────────────────────────────────────────────────
const INPUT = "w-full py-2 px-3 text-sm bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-muted-foreground";
const SELECT = "w-full py-2 pl-3 pr-8 text-sm bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary";
const LABEL = "block text-[13px] font-medium text-foreground mb-1";
const FIELD = "space-y-1";
const GRID2 = "grid grid-cols-2 gap-4";
const SECTION_HEAD = "text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3 mt-1";

// ── Main dialog component ─────────────────────────────────────────────────────

export function UnitEditDialog({
  open,
  onClose,
  unit,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  unit: UnitDetail;
  onSaved: (updated: UnitDetail) => void;
}) {
  const [step, setStep] = useState<"edit" | "review" | "saving">("edit");
  const [activeTab, setActiveTab] = useState<EditTab>("einheit");
  const [form, setForm] = useState<FormState>(() => initForm(unit));
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Re-initialize when dialog opens
  useEffect(() => {
    if (open) {
      setForm(initForm(unit));
      setStep("edit");
      setActiveTab("einheit");
      setError(null);
      setValidationErrors({});
    }
  }, [open, unit]);

  if (!open) return null;

  const set = (key: keyof FormState, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const diffs = computeDiff(unit, form);
  const hasChanges = diffs.length > 0;
  const hasFinancialChange = diffs.some((d) =>
    ["Kaltmiete (€)", "Betriebskosten (€)", "Kaution (€)", "Zahltag", "Zahlungsweise"].includes(d.label)
  );

  function validate(): boolean {
    const errs: Record<string, string> = {};
    const rent = parseFloat(form.base_rent);
    if (!form.base_rent || isNaN(rent) || rent <= 0) errs.base_rent = "Kaltmiete muss größer als 0 sein.";
    const day = parseInt(form.payment_day);
    if (!form.payment_day || isNaN(day) || day < 1 || day > 28) errs.payment_day = "Zahltag muss zwischen 1 und 28 liegen.";
    if (!form.start_date) errs.start_date = "Mietbeginn ist erforderlich.";
    if (!form.first_name.trim()) errs.first_name = "Vorname ist erforderlich.";
    if (!form.last_name.trim()) errs.last_name = "Nachname ist erforderlich.";
    setValidationErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function goToReview() {
    if (!validate()) {
      // Navigate to the first tab with an error
      const tabForError: Record<string, EditTab> = {
        base_rent: "finanzen", payment_day: "finanzen",
        start_date: "vertrag",
        first_name: "mieter", last_name: "mieter",
      };
      const firstErrorKey = Object.keys(validationErrors)[0];
      if (firstErrorKey && tabForError[firstErrorKey]) setActiveTab(tabForError[firstErrorKey]);
      return;
    }
    if (!hasChanges) return;
    setStep("review");
  }

  async function save() {
    setStep("saving");
    setError(null);
    try {
      const payload = buildPayload(unit, form);
      const updated = await api.patch<UnitDetail>(`/units/${unit.id}`, payload);
      onSaved(updated);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Speichern fehlgeschlagen. Bitte erneut versuchen.");
      setStep("review");
    }
  }

  const TABS: { id: EditTab; label: string }[] = [
    { id: "einheit", label: "Einheit" },
    { id: "finanzen", label: "Finanzen" },
    { id: "vertrag", label: "Vertrag" },
    { id: "mieter", label: "Mieter" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            {step === "review" && (
              <button onClick={() => setStep("edit")} className="text-muted-foreground hover:text-foreground transition-colors mr-1">
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            <div>
              <h2 className="text-[16px] font-semibold">
                {step === "edit" ? "Einheit bearbeiten" : step === "saving" ? "Wird gespeichert…" : "Änderungen überprüfen"}
              </h2>
              {step === "edit" && (
                <p className="text-[12px] text-muted-foreground">
                  {unit.property.street} {unit.property.house_number}, {unit.property.city}
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} disabled={step === "saving"} className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── Edit step ────────────────────────────────────────────────── */}
        {step === "edit" && (
          <>
            {/* Tab bar */}
            <div className="flex border-b border-border shrink-0 px-2">
              {TABS.map((t) => {
                const hasError = (t.id === "finanzen" && (validationErrors.base_rent || validationErrors.payment_day))
                  || (t.id === "vertrag" && validationErrors.start_date)
                  || (t.id === "mieter" && (validationErrors.first_name || validationErrors.last_name));
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={`px-4 py-3 text-[13px] font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5 ${
                      activeTab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t.label}
                    {hasError && <span className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                  </button>
                );
              })}
            </div>

            {/* Form body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">

              {/* ── Einheit tab ── */}
              {activeTab === "einheit" && (
                <div className="space-y-4">
                  <p className={SECTION_HEAD}>Wohnungsdaten</p>
                  <div className={GRID2}>
                    <div className={FIELD}>
                      <label className={LABEL}>Wohnfläche (m²)</label>
                      <input type="number" step="0.5" value={form.area_sqm} onChange={(e) => set("area_sqm", e.target.value)} className={INPUT} placeholder="z.B. 72.5" />
                    </div>
                    <div className={FIELD}>
                      <label className={LABEL}>Zimmer</label>
                      <input type="number" step="0.5" value={form.rooms} onChange={(e) => set("rooms", e.target.value)} className={INPUT} placeholder="z.B. 3.5" />
                    </div>
                  </div>
                  <div className={GRID2}>
                    <div className={FIELD}>
                      <label className={LABEL}>Etage</label>
                      <input type="number" value={form.floor} onChange={(e) => set("floor", e.target.value)} className={INPUT} placeholder="z.B. 2" />
                    </div>
                    <div className={FIELD}>
                      <label className={LABEL}>Einheitsnummer</label>
                      <input type="text" value={form.unit_number} onChange={(e) => set("unit_number", e.target.value)} className={INPUT} placeholder="z.B. 4a" />
                    </div>
                  </div>
                  <div className="space-y-3 pt-1">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={form.has_cellar} onChange={(e) => set("has_cellar", e.target.checked)} className="w-4 h-4 rounded border-border text-primary focus:ring-primary/30" />
                      <span className="text-sm font-medium text-foreground">Kellerabteil vorhanden</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={form.has_parking} onChange={(e) => set("has_parking", e.target.checked)} className="w-4 h-4 rounded border-border text-primary focus:ring-primary/30" />
                      <span className="text-sm font-medium text-foreground">Stellplatz vorhanden</span>
                    </label>
                    {form.has_parking && (
                      <div className={`${FIELD} ml-7`}>
                        <label className={LABEL}>Stellplatznummer</label>
                        <input type="text" value={form.parking_number} onChange={(e) => set("parking_number", e.target.value)} className={INPUT} placeholder="z.B. P4" />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Finanzen tab ── */}
              {activeTab === "finanzen" && (
                <div className="space-y-4">
                  <p className={SECTION_HEAD}>Miete</p>
                  <div className={FIELD}>
                    <label className={LABEL}>Kaltmiete (€/Monat) *</label>
                    <input
                      type="number" step="0.01" value={form.base_rent}
                      onChange={(e) => set("base_rent", e.target.value)}
                      className={`${INPUT} ${validationErrors.base_rent ? "border-red-400 focus:border-red-500" : ""}`}
                      placeholder="z.B. 1200.00"
                    />
                    {validationErrors.base_rent && <p className="text-[12px] text-red-600 mt-0.5">{validationErrors.base_rent}</p>}
                  </div>
                  <div className={GRID2}>
                    <div className={FIELD}>
                      <label className={LABEL}>Betriebskosten (€/Monat)</label>
                      <input type="number" step="0.01" value={form.operating_costs} onChange={(e) => set("operating_costs", e.target.value)} className={INPUT} placeholder="z.B. 200.00" />
                    </div>
                    <div className={FIELD}>
                      <label className={LABEL}>Kaution (€)</label>
                      <input type="number" step="0.01" value={form.deposit} onChange={(e) => set("deposit", e.target.value)} className={INPUT} placeholder="z.B. 3600.00" />
                    </div>
                  </div>
                  <p className={SECTION_HEAD}>Zahlung</p>
                  <div className={GRID2}>
                    <div className={FIELD}>
                      <label className={LABEL}>Zahltag (1–28) *</label>
                      <input
                        type="number" min={1} max={28} value={form.payment_day}
                        onChange={(e) => set("payment_day", e.target.value)}
                        className={`${INPUT} ${validationErrors.payment_day ? "border-red-400 focus:border-red-500" : ""}`}
                      />
                      {validationErrors.payment_day && <p className="text-[12px] text-red-600 mt-0.5">{validationErrors.payment_day}</p>}
                    </div>
                    <div className={FIELD}>
                      <label className={LABEL}>Zahlungsweise</label>
                      <select value={form.payment_method} onChange={(e) => set("payment_method", e.target.value)} className={SELECT}>
                        <option value="">— Keine Angabe —</option>
                        <option value="transfer">Banküberweisung</option>
                        <option value="direct_debit">SEPA-Lastschrift</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Vertrag tab ── */}
              {activeTab === "vertrag" && (
                <div className="space-y-4">
                  <p className={SECTION_HEAD}>Laufzeit</p>
                  <div className={GRID2}>
                    <div className={FIELD}>
                      <label className={LABEL}>Mietbeginn *</label>
                      <input
                        type="date" value={form.start_date}
                        onChange={(e) => set("start_date", e.target.value)}
                        className={`${INPUT} ${validationErrors.start_date ? "border-red-400 focus:border-red-500" : ""}`}
                      />
                      {validationErrors.start_date && <p className="text-[12px] text-red-600 mt-0.5">{validationErrors.start_date}</p>}
                    </div>
                    <div className={FIELD}>
                      <label className={LABEL}>Mietende</label>
                      <input type="date" value={form.end_date} onChange={(e) => set("end_date", e.target.value)} className={INPUT} />
                    </div>
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={form.is_fixed_term} onChange={(e) => set("is_fixed_term", e.target.checked)} className="w-4 h-4 rounded border-border text-primary focus:ring-primary/30" />
                    <span className="text-sm font-medium text-foreground">Befristeter Mietvertrag</span>
                  </label>
                  <div className={GRID2}>
                    <div className={FIELD}>
                      <label className={LABEL}>Kündigungsfrist (Monate)</label>
                      <input type="number" min={1} value={form.notice_period_months} onChange={(e) => set("notice_period_months", e.target.value)} className={INPUT} />
                    </div>
                    <div className={FIELD}>
                      <label className={LABEL}>Mietart</label>
                      <select value={form.rent_type} onChange={(e) => set("rent_type", e.target.value)} className={SELECT}>
                        <option value="fixed">Festmiete</option>
                        <option value="indexed">Indexmiete</option>
                        <option value="graduated">Staffelmiete</option>
                      </select>
                    </div>
                  </div>
                  <p className={SECTION_HEAD}>Sondervereinbarungen</p>
                  <div className={GRID2}>
                    <div className={FIELD}>
                      <label className={LABEL}>Tierhaltung</label>
                      <select value={form.pets_allowed} onChange={(e) => set("pets_allowed", e.target.value)} className={SELECT}>
                        <option value="">— Keine Angabe —</option>
                        <option value="true">Erlaubt</option>
                        <option value="false">Nicht erlaubt</option>
                      </select>
                    </div>
                    <div className={FIELD}>
                      <label className={LABEL}>Untermiete</label>
                      <select value={form.subletting_allowed} onChange={(e) => set("subletting_allowed", e.target.value)} className={SELECT}>
                        <option value="">— Keine Angabe —</option>
                        <option value="true">Erlaubt</option>
                        <option value="false">Nicht erlaubt</option>
                      </select>
                    </div>
                  </div>
                  <div className={FIELD}>
                    <label className={LABEL}>Schönheitsreparaturen</label>
                    <textarea
                      value={form.cosmetic_repairs_clause}
                      onChange={(e) => set("cosmetic_repairs_clause", e.target.value)}
                      rows={3}
                      className={`${INPUT} resize-none`}
                      placeholder="Klausel aus dem Mietvertrag…"
                    />
                  </div>
                </div>
              )}

              {/* ── Mieter tab ── */}
              {activeTab === "mieter" && (
                <div className="space-y-4">
                  <p className={SECTION_HEAD}>Hauptmieter</p>
                  <div className={GRID2}>
                    <div className={FIELD}>
                      <label className={LABEL}>Vorname *</label>
                      <input
                        type="text" value={form.first_name}
                        onChange={(e) => set("first_name", e.target.value)}
                        className={`${INPUT} ${validationErrors.first_name ? "border-red-400 focus:border-red-500" : ""}`}
                      />
                      {validationErrors.first_name && <p className="text-[12px] text-red-600 mt-0.5">{validationErrors.first_name}</p>}
                    </div>
                    <div className={FIELD}>
                      <label className={LABEL}>Nachname *</label>
                      <input
                        type="text" value={form.last_name}
                        onChange={(e) => set("last_name", e.target.value)}
                        className={`${INPUT} ${validationErrors.last_name ? "border-red-400 focus:border-red-500" : ""}`}
                      />
                      {validationErrors.last_name && <p className="text-[12px] text-red-600 mt-0.5">{validationErrors.last_name}</p>}
                    </div>
                  </div>
                  <div className={GRID2}>
                    <div className={FIELD}>
                      <label className={LABEL}>E-Mail</label>
                      <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={INPUT} placeholder="mieter@example.com" />
                    </div>
                    <div className={FIELD}>
                      <label className={LABEL}>Telefon</label>
                      <input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} className={INPUT} placeholder="+49 170 1234567" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-stone-50/60 shrink-0">
              <button onClick={onClose} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                Abbrechen
              </button>
              <button
                onClick={goToReview}
                disabled={!hasChanges}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Änderungen überprüfen →
              </button>
            </div>
          </>
        )}

        {/* ── Review step ──────────────────────────────────────────────── */}
        {(step === "review" || step === "saving") && (
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">

              {/* Financial change warning */}
              {hasFinancialChange && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50 border border-amber-200">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-[13px] text-amber-800">
                    Du änderst Finanzdaten. Stelle sicher, dass alle Änderungen mit dem Mietvertrag übereinstimmen.
                  </p>
                </div>
              )}

              {/* Diff table */}
              <div className="bg-white rounded-xl border border-border overflow-hidden">
                <div className="px-4 py-3 bg-stone-50 border-b border-border">
                  <p className="text-[13px] font-semibold text-foreground">
                    {diffs.length} Feld{diffs.length !== 1 ? "er" : ""} wird geändert
                  </p>
                </div>
                <div className="divide-y divide-border/60">
                  {diffs.map((d) => (
                    <div key={d.label} className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center px-4 py-3 gap-3">
                      <div>
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-0.5">{d.label}</p>
                        <p className="text-[13px] text-muted-foreground line-through">
                          {d.before || <span className="italic not-italic opacity-40">—</span>}
                        </p>
                      </div>
                      <span className="text-muted-foreground text-lg">→</span>
                      <div className="text-right">
                        <p className="text-[13px] font-semibold text-green-700">
                          {d.after || <span className="font-normal italic text-muted-foreground">gelöscht</span>}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200">
                  <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                  <p className="text-[13px] text-red-700">{error}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-stone-50/60 shrink-0">
              <button
                onClick={() => { setStep("edit"); setError(null); }}
                disabled={step === "saving"}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
              >
                ← Zurück bearbeiten
              </button>
              <button
                onClick={save}
                disabled={step === "saving"}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {step === "saving" ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Wird gespeichert…</>
                ) : (
                  <><CheckCircle2 className="h-4 w-4" /> Jetzt speichern</>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
