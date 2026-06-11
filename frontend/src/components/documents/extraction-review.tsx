"use client";

import React, { useState, useCallback } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ValidationError {
  field: string;
  level: "warning" | "error";
  message: string;
}

interface ExtractionReviewProps {
  documentId: string;
  extractionData: Record<string, unknown>;
  validationErrors: Array<ValidationError>;
  onConfirm: (corrected: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}

interface FieldMeta {
  value: unknown;
  confidence?: number;
  source_text?: string;
}

type Section = "objekt" | "mieter" | "mietkonditionen" | "sondervereinbarungen";

// ---------------------------------------------------------------------------
// Field definitions per section
// ---------------------------------------------------------------------------

const SECTION_FIELDS: Record<Section, { key: string; label: string; required?: boolean }[]> = {
  objekt: [
    { key: "property.street", label: "Straße", required: true },
    { key: "property.house_number", label: "Hausnummer", required: true },
    { key: "property.postal_code", label: "PLZ", required: true },
    { key: "property.city", label: "Ort", required: true },
    { key: "property.unit_number", label: "Einheit / Wohnungsnummer" },
    { key: "property.area_sqm", label: "Fläche (m²)" },
    { key: "property.floor", label: "Etage" },
    { key: "property.rooms", label: "Zimmer" },
  ],
  mieter: [
    { key: "tenants.0.first_name", label: "Vorname", required: true },
    { key: "tenants.0.last_name", label: "Nachname", required: true },
    { key: "tenants.0.email", label: "E-Mail" },
    { key: "tenants.0.phone", label: "Telefon" },
  ],
  mietkonditionen: [
    { key: "financials.base_rent", label: "Kaltmiete (€)", required: true },
    { key: "financials.operating_costs", label: "Betriebskosten (€)" },
    { key: "financials.deposit", label: "Kaution (€)" },
    { key: "lease_term.start_date", label: "Mietbeginn", required: true },
    { key: "lease_term.end_date", label: "Mietende (leer = unbefristet)" },
    { key: "financials.payment_day", label: "Zahltag (1–28)" },
    { key: "financials.payment_method", label: "Zahlungsweise" },
    { key: "rent_type.type", label: "Mietart" },
  ],
  sondervereinbarungen: [
    { key: "special_agreements.pets_allowed", label: "Haustiere erlaubt" },
    { key: "special_agreements.subletting_allowed", label: "Untermiete erlaubt" },
    { key: "lease_term.notice_period_months", label: "Kündigungsfrist (Monate)" },
    { key: "special_agreements.cosmetic_repairs_clause", label: "Schönheitsreparaturen" },
  ],
};

const SECTION_LABELS: Record<Section, string> = {
  objekt: "Objekt",
  mieter: "Mieter",
  mietkonditionen: "Mietkonditionen",
  sondervereinbarungen: "Sondervereinbarungen",
};

const SECTIONS: Section[] = ["objekt", "mieter", "mietkonditionen", "sondervereinbarungen"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  // Normalise lease_terms → lease_term at the top level
  const root: Record<string, unknown> = { ...obj };
  if (!root.lease_term && root.lease_terms) {
    root.lease_term = root.lease_terms;
  }

  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc == null) return undefined;
    if (Array.isArray(acc)) {
      const idx = parseInt(key, 10);
      return isNaN(idx) ? undefined : acc[idx];
    }
    if (typeof acc === "object") {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, root);
}

function setNestedValue(
  obj: Record<string, unknown>,
  path: string,
  value: unknown
): Record<string, unknown> {
  const keys = path.split(".");

  function setDeep(current: unknown, keyIndex: number): unknown {
    const key = keys[keyIndex];
    const isLast = keyIndex === keys.length - 1;
    const nextKey = keys[keyIndex + 1];
    const nextIsIndex = !isLast && !isNaN(parseInt(nextKey, 10));

    if (isLast) {
      if (Array.isArray(current)) {
        const idx = parseInt(key, 10);
        const arr = [...(current as unknown[])];
        arr[idx] = value;
        return arr;
      }
      const result = { ...(current as Record<string, unknown>) };
      result[key] = value;
      return result;
    }

    if (Array.isArray(current)) {
      const idx = parseInt(key, 10);
      const arr = [...(current as unknown[])];
      arr[idx] = setDeep(arr[idx], keyIndex + 1);
      return arr;
    }

    const record = { ...(current as Record<string, unknown>) };
    // Determine if the next level should be an array or object
    const child = record[key] ?? (nextIsIndex ? [] : {});
    record[key] = setDeep(child, keyIndex + 1);
    return record;
  }

  return setDeep(obj, 0) as Record<string, unknown>;
}

function extractFieldMeta(rawValue: unknown): FieldMeta {
  if (rawValue && typeof rawValue === "object" && !Array.isArray(rawValue)) {
    const obj = rawValue as Record<string, unknown>;
    if ("value" in obj) {
      return {
        value: obj.value,
        confidence: typeof obj.confidence === "number" ? obj.confidence : undefined,
        source_text: typeof obj.source_text === "string" ? obj.source_text : undefined,
      };
    }
  }
  return { value: rawValue };
}

function valueToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "Ja" : "Nein";
  return String(value);
}

// ---------------------------------------------------------------------------
// ConfidenceBadge
// ---------------------------------------------------------------------------

export interface ConfidenceBadgeProps {
  confidence: number;
}

export function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  const pct = Math.round(confidence * 100);

  let dotColor: string;
  let textColor: string;
  let bgColor: string;

  if (confidence >= 0.85) {
    dotColor = "bg-green-500";
    textColor = "text-green-700";
    bgColor = "bg-green-50";
  } else if (confidence >= 0.7) {
    dotColor = "bg-amber-400";
    textColor = "text-amber-700";
    bgColor = "bg-amber-50";
  } else {
    dotColor = "bg-red-500";
    textColor = "text-red-700";
    bgColor = "bg-red-50";
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${bgColor} ${textColor}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      {pct}%
    </span>
  );
}

// ---------------------------------------------------------------------------
// FieldRow
// ---------------------------------------------------------------------------

interface FieldRowProps {
  label: string;
  fieldKey: string;
  meta: FieldMeta;
  errors: ValidationError[];
  onChange: (key: string, value: string) => void;
}

function FieldRow({ label, fieldKey, meta, errors, onChange }: FieldRowProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const fieldErrors = errors.filter((e) => e.field === fieldKey);
  const hasError = fieldErrors.some((e) => e.level === "error");
  const hasWarning = fieldErrors.some((e) => e.level === "warning");
  const lowConfidence = meta.confidence !== undefined && meta.confidence < 0.7;

  let borderClass = "border-gray-200 focus:border-green-500";
  if (hasError) borderClass = "border-red-400 focus:border-red-500";
  else if (lowConfidence) borderClass = "border-amber-400 focus:border-amber-500";
  else if (hasWarning) borderClass = "border-amber-300 focus:border-amber-400";

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        {meta.confidence !== undefined && <ConfidenceBadge confidence={meta.confidence} />}
        {meta.source_text && (
          <div className="relative">
            <button
              type="button"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onFocus={() => setShowTooltip(true)}
              onBlur={() => setShowTooltip(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Quelltext anzeigen"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </button>
            {showTooltip && (
              <div className="absolute z-50 left-5 top-0 w-72 p-3 bg-gray-900 text-gray-100 text-xs rounded-xl shadow-xl leading-relaxed">
                <p className="font-semibold text-gray-300 mb-1">Quelltext:</p>
                <p className="italic">&ldquo;{meta.source_text}&rdquo;</p>
              </div>
            )}
          </div>
        )}
      </div>

      <input
        type="text"
        value={valueToString(meta.value)}
        onChange={(e) => onChange(fieldKey, e.target.value)}
        className={`w-full px-3 py-2 text-sm border rounded-xl bg-white text-gray-900 placeholder-gray-400 outline-none transition-colors ${borderClass} ${
          lowConfidence && !hasError ? "bg-amber-50" : ""
        }`}
        placeholder="—"
      />

      {fieldErrors.map((err, i) => (
        <p
          key={i}
          className={`text-xs ${err.level === "error" ? "text-red-600" : "text-amber-600"}`}
        >
          {err.message}
        </p>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SectionPanel
// ---------------------------------------------------------------------------

interface SectionPanelProps {
  section: Section;
  data: Record<string, unknown>;
  errors: ValidationError[];
  onChange: (key: string, value: string) => void;
}

function SectionPanel({ section, data, errors, onChange }: SectionPanelProps) {
  const fields = SECTION_FIELDS[section];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {fields.map((field) => {
        const rawValue = getNestedValue(data, field.key);
        const meta = extractFieldMeta(rawValue);
        return (
          <FieldRow
            key={field.key}
            label={field.label + (field.required ? " *" : "")}
            fieldKey={field.key}
            meta={meta}
            errors={errors}
            onChange={onChange}
          />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Flatten extraction data to a value map for editing
// ---------------------------------------------------------------------------

function flattenToValues(data: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {};

  // Normalise lease_terms → lease_term
  const normalised: Record<string, unknown> = { ...data };
  if (!normalised.lease_term && normalised.lease_terms) {
    normalised.lease_term = normalised.lease_terms;
  }

  function traverse(val: unknown, prefix: string) {
    if (val == null) return;
    if (Array.isArray(val)) {
      val.forEach((item, idx) => traverse(item, `${prefix}.${idx}`));
      return;
    }
    if (typeof val === "object") {
      const obj = val as Record<string, unknown>;
      if ("value" in obj) {
        // ConfidenceField wrapper → store the leaf value
        result[prefix] = valueToString(obj.value);
        return;
      }
      for (const [key, child] of Object.entries(obj)) {
        traverse(child, prefix ? `${prefix}.${key}` : key);
      }
    }
  }

  traverse(normalised, "");
  return result;
}

// ---------------------------------------------------------------------------
// Rebuild corrected payload merging edits back into original structure
// ---------------------------------------------------------------------------

function buildCorrectedPayload(
  original: Record<string, unknown>,
  edits: Record<string, string>
): Record<string, unknown> {
  let result = JSON.parse(JSON.stringify(original)) as Record<string, unknown>;

  for (const [path, newValue] of Object.entries(edits)) {
    const rawValue = getNestedValue(original, path);
    if (rawValue && typeof rawValue === "object" && !Array.isArray(rawValue)) {
      const obj = rawValue as Record<string, unknown>;
      if ("value" in obj) {
        result = setNestedValue(result, path, { ...obj, value: newValue });
        continue;
      }
    }
    result = setNestedValue(result, path, newValue);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Missing required fields
// ---------------------------------------------------------------------------

function getMissingRequired(data: Record<string, unknown>): string[] {
  const missing: string[] = [];

  for (const fields of Object.values(SECTION_FIELDS)) {
    for (const field of fields) {
      if (!field.required) continue;
      const rawValue = getNestedValue(data, field.key);
      const meta = extractFieldMeta(rawValue);
      const str = valueToString(meta.value).trim();
      if (!str) missing.push(field.label.replace(" *", ""));
    }
  }

  return missing;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ExtractionReview({
  documentId: _documentId,
  extractionData,
  validationErrors,
  onConfirm,
  onCancel,
}: ExtractionReviewProps) {
  const [activeSection, setActiveSection] = useState<Section>("objekt");
  const [edits, setEdits] = useState<Record<string, string>>(() =>
    flattenToValues(extractionData)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Rebuild a live view of the data with edits applied so we can check missing fields
  const liveData = useCallback(() => {
    return buildCorrectedPayload(extractionData, edits);
  }, [extractionData, edits]);

  const missingRequired = getMissingRequired(liveData());

  const hardErrors = validationErrors.filter((e) => e.level === "error");
  const canSubmit = missingRequired.length === 0 && hardErrors.length === 0;

  const handleChange = useCallback((key: string, value: string) => {
    setEdits((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleConfirm = async () => {
    if (!canSubmit || isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const corrected = buildCorrectedPayload(extractionData, edits);
      await onConfirm(corrected);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Ein unbekannter Fehler ist aufgetreten."
      );
      setIsSubmitting(false);
    }
  };

  // Build the data view used for rendering (original structure + edits)
  const currentData = liveData();

  // Low-confidence field count for badge on tab
  function lowConfidenceCount(section: Section): number {
    return SECTION_FIELDS[section].filter((f) => {
      const rawValue = getNestedValue(extractionData, f.key);
      const meta = extractFieldMeta(rawValue);
      return meta.confidence !== undefined && meta.confidence < 0.7;
    }).length;
  }

  function sectionErrorCount(section: Section): number {
    const keys = SECTION_FIELDS[section].map((f) => f.key);
    return validationErrors.filter(
      (e) => e.level === "error" && keys.includes(e.field)
    ).length;
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex items-start justify-center py-10 px-4">
      <div className="w-full max-w-3xl flex flex-col gap-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Extrahierte Daten prüfen
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Bitte überprüfen und korrigieren Sie die extrahierten Angaben vor der Bestätigung.
          </p>
        </div>

        {/* Missing required fields banner */}
        {missingRequired.length > 0 && (
          <div className="flex items-start gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-2xl">
            <svg
              className="w-5 h-5 text-red-500 mt-0.5 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-red-700">
                Pflichtfelder fehlen
              </p>
              <p className="text-xs text-red-600 mt-0.5">
                {missingRequired.join(", ")}
              </p>
            </div>
          </div>
        )}

        {/* Hard validation errors banner */}
        {hardErrors.length > 0 && (
          <div className="flex items-start gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-2xl">
            <svg
              className="w-5 h-5 text-red-500 mt-0.5 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-red-700">
                {hardErrors.length} Validierungsfehler
              </p>
              <ul className="mt-1 space-y-0.5">
                {hardErrors.map((e, i) => (
                  <li key={i} className="text-xs text-red-600">
                    {e.message}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Main card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

          {/* Tabs */}
          <div className="flex border-b border-gray-100 overflow-x-auto">
            {SECTIONS.map((section) => {
              const isActive = activeSection === section;
              const lowCount = lowConfidenceCount(section);
              const errCount = sectionErrorCount(section);

              return (
                <button
                  key={section}
                  type="button"
                  onClick={() => setActiveSection(section)}
                  className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    isActive
                      ? "border-green-600 text-green-700 bg-green-50/40"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {SECTION_LABELS[section]}
                  {errCount > 0 && (
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-100 text-red-600 text-[10px] font-bold">
                      {errCount}
                    </span>
                  )}
                  {errCount === 0 && lowCount > 0 && (
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-100 text-amber-600 text-[10px] font-bold">
                      {lowCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Section content */}
          <div className="p-6">
            <SectionPanel
              section={activeSection}
              data={currentData}
              errors={validationErrors}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
          <span className="font-medium text-gray-600">Konfidenz:</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            ≥ 85% — hoch
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            70–84% — mittel
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
            &lt; 70% — niedrig (bitte prüfen)
          </span>
          <span className="ml-auto text-gray-400">* Pflichtfeld</span>
        </div>

        {/* Submit error */}
        {submitError && (
          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700">
            {submitError}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pb-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-6 py-2.5 text-sm font-medium text-gray-600 bg-transparent border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Abbrechen
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canSubmit || isSubmitting}
            className="w-full sm:w-auto px-6 py-2.5 text-sm font-semibold text-white bg-green-600 rounded-xl hover:bg-green-700 active:bg-green-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <svg
                  className="w-4 h-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
                Wird gespeichert…
              </>
            ) : (
              "Bestätigen & Einheit erstellen"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}