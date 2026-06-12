"use client";

import { useState, useEffect } from "react";
import type { UnitDetail, Deadline, MarketComparison } from "@/types/api";
import { cn } from "@/lib/utils";
import { FileText, ExternalLink, Loader2, TrendingUp, TrendingDown, Minus, Pencil } from "lucide-react";
import { UnitEditDialog } from "@/components/unit-edit-dialog";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

const DOC_TYPE_LABEL: Record<string, string> = {
  lease_contract: "Mietvertrag",
  handover_protocol: "Übergabeprotokoll",
  energy_certificate: "Energieausweis",
  insurance_policy: "Versicherung",
  invoice: "Rechnung",
  rent_increase: "Mieterhöhung",
  utility_statement: "Nebenkostenabrechnung",
  correspondence: "Korrespondenz",
  other: "Sonstiges",
};

type Tab = "uebersicht" | "finanzen" | "fristen" | "dokumente" | "rechtscheck";

const TABS: { id: Tab; label: string }[] = [
  { id: "uebersicht", label: "Übersicht" },
  { id: "finanzen", label: "Finanzen" },
  { id: "fristen", label: "Fristen" },
  { id: "dokumente", label: "Dokumente" },
  { id: "rechtscheck", label: "Rechts-Check" },
];

// ── Row helper ─────────────────────────────────────────────────────────────────
function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex justify-between items-start py-2.5 border-b border-border/50 last:border-0">
      <span className="text-[14px] text-muted-foreground shrink-0 w-44">{label}</span>
      <span className="text-[14px] text-foreground text-right">{value}</span>
    </div>
  );
}

// ── Deadline badge ─────────────────────────────────────────────────────────────
function deadlineBadge(due: string) {
  const days = Math.ceil((new Date(due).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-medium">Überfällig</span>;
  if (days <= 14) return <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium">In {days} Tagen</span>;
  if (days <= 30) return <span className="text-[11px] px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700 font-medium">In {days} Tagen</span>;
  return <span className="text-[11px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 font-medium">{new Date(due).toLocaleDateString("de-DE")}</span>;
}

const DEADLINE_TYPE_LABEL: Record<string, string> = {
  rent_adjustment: "Mietanpassung",
  lease_termination: "Vertragsende",
  utility_statement: "NK-Abrechnung",
  inspection: "Besichtigung",
  custom: "Sonstiges",
};

// ── Market comparison ─────────────────────────────────────────────────────────

function MarketComparisonSection({
  city, areaSqm, baseRent,
}: { city: string; areaSqm: number; baseRent: number }) {
  const [market, setMarket] = useState<MarketComparison | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;
    fetch(
      `${BACKEND_URL}/mietspiegel/${encodeURIComponent(city)}/lookup?area_sqm=${areaSqm}`
    )
      .then((r) => (r.ok ? r.json() : null))
      .then(setMarket)
      .catch(() => setMarket(null))
      .finally(() => setLoading(false));
  }, [city, areaSqm]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> Marktdaten werden geladen…
      </div>
    );
  }

  if (!market) {
    return (
      <p className="text-[13px] text-muted-foreground py-2">
        Keine Marktdaten für <strong>{city}</strong> verfügbar.
      </p>
    );
  }

  const currentPerSqm = baseRent / areaSqm;
  const deltaPct = (currentPerSqm - market.rent_avg) / market.rent_avg;
  const deltaEur = currentPerSqm - market.rent_avg;
  const bucket: "below" | "at" | "above" =
    deltaPct < -0.05 ? "below" : deltaPct > 0.05 ? "above" : "at";

  // Monthly figures
  const marketRentAtAvg = market.rent_avg * areaSqm;
  const monthlyPotential = marketRentAtAvg - baseRent;

  // Position bar percentages — clamp 0–100
  const range = market.rent_max - market.rent_min || 1;
  const currentPct = Math.min(100, Math.max(0, ((currentPerSqm - market.rent_min) / range) * 100));
  const avgPct = Math.min(100, Math.max(0, ((market.rent_avg - market.rent_min) / range) * 100));

  const bucketConfig = {
    below: {
      label: "Unter Marktniveau",
      badgeClass: "bg-red-50 text-red-700 border-red-200",
      markerClass: "bg-red-500",
      Icon: TrendingDown,
      iconClass: "text-red-500",
    },
    at: {
      label: "Marktgerecht",
      badgeClass: "bg-green-50 text-green-700 border-green-200",
      markerClass: "bg-green-500",
      Icon: Minus,
      iconClass: "text-green-500",
    },
    above: {
      label: "Über Marktniveau",
      badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
      markerClass: "bg-blue-500",
      Icon: TrendingUp,
      iconClass: "text-blue-500",
    },
  }[bucket];

  return (
    <div className="rounded-xl border border-border bg-stone-50/40 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] font-semibold text-foreground">Marktvergleich</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {market.city} · {market.band_label} · {market.data_year}
          </p>
        </div>
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border ${bucketConfig.badgeClass}`}>
          <bucketConfig.Icon className={`h-3 w-3 ${bucketConfig.iconClass}`} />
          {bucketConfig.label}
        </span>
      </div>

      {/* Key figures */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-[11px] text-muted-foreground">Ihre Miete/m²</p>
          <p className="text-[18px] font-bold tabular-nums text-foreground mt-0.5">
            {currentPerSqm.toFixed(2)} €
          </p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">Markt-Ø/m²</p>
          <p className="text-[18px] font-bold tabular-nums text-primary mt-0.5">
            {market.rent_avg.toFixed(2)} €
          </p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">Abweichung</p>
          <p className={`text-[18px] font-bold tabular-nums mt-0.5 ${
            deltaEur < 0 ? "text-red-600" : deltaEur > 0 ? "text-blue-600" : "text-green-600"
          }`}>
            {deltaEur >= 0 ? "+" : ""}{deltaEur.toFixed(2)} €
          </p>
        </div>
      </div>

      {/* Position bar */}
      <div>
        <div className="relative h-4 bg-stone-200 rounded-full">
          {/* Avg reference line */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-stone-400 z-10"
            style={{ left: `${avgPct}%` }}
          />
          {/* Current position dot */}
          <div
            className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow z-20 ${bucketConfig.markerClass}`}
            style={{ left: `calc(${currentPct}% - 8px)` }}
            title={`Ihre Miete: ${currentPerSqm.toFixed(2)} €/m²`}
          />
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[10px] text-muted-foreground">{market.rent_min.toFixed(0)} €/m² Min</span>
          <span className="text-[10px] text-stone-400">Ø {market.rent_avg.toFixed(0)} €/m²</span>
          <span className="text-[10px] text-muted-foreground">Max {market.rent_max.toFixed(0)} €/m²</span>
        </div>
      </div>

      {/* Potential (only if below market) */}
      {bucket === "below" && monthlyPotential > 0 && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          <p className="text-[12px] text-amber-800">
            Potenzial bei Marktmiete ({market.rent_avg.toFixed(2)} €/m²)
          </p>
          <p className="text-[14px] font-bold tabular-nums text-amber-800">
            +{monthlyPotential.toLocaleString("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €/Monat
          </p>
        </div>
      )}
    </div>
  );
}

// ── Tabs ───────────────────────────────────────────────────────────────────────
export function UnitDetailClient({ unit: initialUnit, token }: { unit: UnitDetail; token: string }) {
  const [unit, setUnit] = useState<UnitDetail>(initialUnit);
  const [activeTab, setActiveTab] = useState<Tab>("uebersicht");
  const [openingDoc, setOpeningDoc] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  async function openDocument(docId: string) {
    setOpeningDoc(docId);
    try {
      const res = await fetch(`${BACKEND_URL}/documents/${docId}/url`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("URL konnte nicht geladen werden");
      const data: { url: string; filename: string } = await res.json();
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch {
      alert("Dokument konnte nicht geöffnet werden. Bitte erneut versuchen.");
    } finally {
      setOpeningDoc(null);
    }
  }

  const paymentMethodLabel = unit.lease.payment_method === "transfer" ? "Banküberweisung"
    : unit.lease.payment_method === "direct_debit" ? "SEPA-Lastschrift"
    : unit.lease.payment_method ?? "—";

  const rentTypeLabel = unit.lease.rent_type === "fixed" ? "Festmiete"
    : unit.lease.rent_type === "indexed" ? "Indexmiete"
    : unit.lease.rent_type === "graduated" ? "Staffelmiete"
    : unit.lease.rent_type;

  return (
    <>
    <UnitEditDialog
      open={editOpen}
      onClose={() => setEditOpen(false)}
      unit={unit}
      onSaved={(updated) => { setUnit(updated); setEditOpen(false); }}
    />
    <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
      {/* Tab bar */}
      <div className="flex items-center border-b border-border overflow-x-auto">
        <div className="flex flex-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
                activeTab === tab.id
                  ? "border-primary text-primary bg-green-50/40"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-stone-50",
              )}
            >
              {tab.label}
              {tab.id === "fristen" && unit.deadlines.length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">
                  {unit.deadlines.length}
                </span>
              )}
              {tab.id === "dokumente" && unit.documents.length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-stone-200 text-stone-600 text-[10px] font-bold">
                  {unit.documents.length}
                </span>
              )}
            </button>
          ))}
        </div>
        {/* Edit button */}
        <button
          onClick={() => setEditOpen(true)}
          className="shrink-0 mx-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-muted-foreground border border-border rounded-xl hover:bg-accent hover:text-foreground transition-colors"
        >
          <Pencil className="h-3.5 w-3.5" />
          Bearbeiten
        </button>
      </div>

      <div className="p-6">

        {/* ── Übersicht ── */}
        {activeTab === "uebersicht" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">Objekt</h3>
              <Row label="Adresse" value={`${unit.property.street} ${unit.property.house_number}, ${unit.property.postal_code} ${unit.property.city}`} />
              <Row label="Wohneinheit" value={unit.unit_number} />
              <Row label="Etage" value={unit.floor != null ? `${unit.floor}. Obergeschoss` : null} />
              <Row label="Wohnfläche" value={unit.area_sqm != null ? `${unit.area_sqm} m²` : null} />
              <Row label="Zimmer" value={unit.rooms} />
              <Row label="Keller" value={unit.has_cellar ? "Ja" : "Nein"} />
              <Row label="Stellplatz" value={unit.has_parking ? (unit.parking_number ? `Ja (Nr. ${unit.parking_number})` : "Ja") : "Nein"} />
            </div>

            {unit.tenants.length > 0 && (
              <div>
                <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Mieter
                </h3>
                {unit.tenants.map((t, i) => (
                  <div key={t.id} className="mb-2 last:mb-0">
                    <Row label={i === 0 ? "Hauptmieter" : `Mitmieter ${i + 1}`} value={`${t.first_name} ${t.last_name}`} />
                    {t.email && <Row label="E-Mail" value={<a href={`mailto:${t.email}`} className="text-primary hover:underline">{t.email}</a>} />}
                    {t.phone && <Row label="Telefon" value={<a href={`tel:${t.phone}`} className="hover:underline">{t.phone}</a>} />}
                  </div>
                ))}
              </div>
            )}

            <div>
              <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">Vertrag</h3>
              <Row label="Mietbeginn" value={new Date(unit.lease.start_date).toLocaleDateString("de-DE")} />
              <Row label="Laufzeit" value={unit.lease.is_fixed_term && unit.lease.end_date
                ? `Bis ${new Date(unit.lease.end_date).toLocaleDateString("de-DE")}`
                : "Unbefristet"} />
              <Row label="Kündigungsfrist" value={`${unit.lease.notice_period_months} Monate`} />
              <Row label="Haustiere" value={unit.lease.pets_allowed === true ? "Erlaubt" : unit.lease.pets_allowed === false ? "Nicht erlaubt" : null} />
              <Row label="Untermiete" value={unit.lease.subletting_allowed === true ? "Erlaubt" : unit.lease.subletting_allowed === false ? "Nicht erlaubt" : null} />
              {unit.lease.cosmetic_repairs_clause && (
                <div className="py-2.5 border-b border-border/50">
                  <p className="text-[14px] text-muted-foreground mb-1">Schönheitsreparaturen</p>
                  <p className="text-[13px] text-foreground leading-relaxed bg-stone-50 rounded-lg p-3 mt-1">
                    {unit.lease.cosmetic_repairs_clause}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Finanzen ── */}
        {activeTab === "finanzen" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">Miete</h3>
              <Row label="Kaltmiete" value={<span className="font-semibold tabular-nums">{unit.lease.base_rent.toLocaleString("de-DE")} €/Monat</span>} />
              <Row label="Betriebskosten VP" value={unit.lease.operating_costs != null ? `${unit.lease.operating_costs.toLocaleString("de-DE")} €/Monat` : null} />
              {unit.lease.operating_costs != null && (
                <Row label="Warmmiete gesamt" value={
                  <span className="font-semibold tabular-nums">
                    {(unit.lease.base_rent + unit.lease.operating_costs).toLocaleString("de-DE")} €/Monat
                  </span>
                } />
              )}
              <Row label="Mietart" value={rentTypeLabel} />
            </div>

            <div>
              <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">Zahlung & Kaution</h3>
              <Row label="Fällig am" value={`${unit.lease.payment_day}. des Monats`} />
              <Row label="Zahlungsweise" value={paymentMethodLabel} />
              <Row label="Kaution" value={unit.lease.deposit != null
                ? <span className="tabular-nums">{unit.lease.deposit.toLocaleString("de-DE")} € ({(unit.lease.deposit / unit.lease.base_rent).toFixed(1)} Monatskaltmieten)</span>
                : null} />
            </div>

            {unit.area_sqm && (
              <div className="rounded-xl bg-green-50 border border-green-100 p-4">
                <p className="text-[13px] font-medium text-green-800">Miete pro m²</p>
                <p className="text-2xl font-bold tabular-nums text-green-700 mt-1">
                  {(unit.lease.base_rent / unit.area_sqm).toFixed(2)} €/m²
                </p>
              </div>
            )}

            {/* Market comparison — only when city + area are known */}
            {unit.property.city && unit.area_sqm && (
              <div>
                <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Marktvergleich
                </h3>
                <MarketComparisonSection
                  city={unit.property.city}
                  areaSqm={unit.area_sqm}
                  baseRent={unit.lease.base_rent}
                />
              </div>
            )}
          </div>
        )}

        {/* ── Fristen ── */}
        {activeTab === "fristen" && (
          <div>
            {unit.deadlines.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-4xl mb-3">✅</p>
                <p className="font-medium">Keine offenen Fristen</p>
              </div>
            ) : (
              <div className="space-y-3">
                {unit.deadlines.map((dl) => (
                  <div key={dl.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-stone-50/50">
                    <div>
                      <p className="text-[14px] font-medium text-foreground">{dl.title}</p>
                      <p className="text-[12px] text-muted-foreground mt-0.5">
                        {DEADLINE_TYPE_LABEL[dl.deadline_type] ?? dl.deadline_type}
                      </p>
                    </div>
                    {deadlineBadge(dl.due_date)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Dokumente ── */}
        {activeTab === "dokumente" && (
          <div>
            {unit.documents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-4xl mb-3">📁</p>
                <p className="font-medium">Keine Dokumente</p>
                <p className="text-sm mt-1">Dokumente werden beim Upload automatisch zugewiesen.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {unit.documents.map((doc) => {
                  const isLoading = openingDoc === doc.id;
                  const typeLabel = DOC_TYPE_LABEL[doc.document_type] ?? doc.document_type ?? "Dokument";
                  const sizeLabel = doc.file_size_bytes
                    ? doc.file_size_bytes >= 1024 * 1024
                      ? `${(doc.file_size_bytes / (1024 * 1024)).toFixed(1)} MB`
                      : `${(doc.file_size_bytes / 1024).toFixed(0)} KB`
                    : null;

                  return (
                    <div key={doc.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-stone-50/50 hover:bg-accent/30 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="shrink-0 w-9 h-9 rounded-lg bg-white border border-border flex items-center justify-center">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[14px] font-medium text-foreground truncate">{doc.filename}</p>
                          <p className="text-[12px] text-muted-foreground">
                            {typeLabel}
                            {sizeLabel ? ` · ${sizeLabel}` : ""}
                            {" · "}{new Date(doc.created_at).toLocaleDateString("de-DE")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                          doc.status === "extracted" ? "bg-green-50 text-green-700"
                          : doc.status === "error" ? "bg-red-50 text-red-600"
                          : "bg-stone-100 text-stone-500"
                        }`}>
                          {doc.status === "extracted" ? "Verarbeitet"
                            : doc.status === "error" ? "Fehler"
                            : doc.status === "processing" ? "Wird verarbeitet"
                            : "Hochgeladen"}
                        </span>
                        <button
                          onClick={() => openDocument(doc.id)}
                          disabled={isLoading}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors disabled:opacity-50"
                        >
                          {isLoading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <ExternalLink className="h-3.5 w-3.5" />
                          )}
                          Öffnen
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Rechts-Check ── */}
        {activeTab === "rechtscheck" && (
          <div className="text-center py-12 space-y-3">
            <p className="text-4xl">⚖️</p>
            <p className="text-[16px] font-semibold text-foreground">Rechts-Check</p>
            <p className="text-[14px] text-muted-foreground max-w-sm mx-auto leading-relaxed">
              KI-gestützte Analyse deiner Vertragsklauseln auf Unwirksamkeit und Risiken.
              Kommt in der nächsten Version.
            </p>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-[12px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
              Demnächst verfügbar
            </span>
          </div>
        )}

      </div>
    </div>
    </>
  );
}
