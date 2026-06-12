"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { CityMietspiegel, MietspiegelBand, PortfolioMarketOverview, UnitMarketData } from "@/types/api";
import { Loader2, Info, TrendingUp, TrendingDown, Minus, ArrowUpDown } from "lucide-react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

interface Props {
  cities: string[];
  initialCity: string | null;
  initialData: CityMietspiegel | null;
  marketOverview: PortfolioMarketOverview | null;
}

// ── Shared bucket config ───────────────────────────────────────────────────────
const BUCKET = {
  below: {
    label: "Unter Markt",
    icon: TrendingDown,
    badge: "bg-red-50 text-red-700 border border-red-200",
    fill: "bg-red-300",
    dot: "bg-red-500",
    card: "bg-red-50 border-red-200",
    text: "text-red-700",
  },
  at: {
    label: "Marktgerecht",
    icon: Minus,
    badge: "bg-green-50 text-green-700 border border-green-200",
    fill: "bg-green-300",
    dot: "bg-green-500",
    card: "bg-green-50 border-green-200",
    text: "text-green-700",
  },
  above: {
    label: "Über Markt",
    icon: TrendingUp,
    badge: "bg-blue-50 text-blue-700 border border-blue-200",
    fill: "bg-blue-300",
    dot: "bg-blue-500",
    card: "bg-blue-50 border-blue-200",
    text: "text-blue-700",
  },
} as const;

// ── Market-data tab ───────────────────────────────────────────────────────────
function BandRow({ band, index }: { band: MietspiegelBand; index: number }) {
  const range = band.max - band.min;
  const avgPct = range > 0 ? ((band.avg - band.min) / range) * 100 : 50;
  return (
    <tr className={index % 2 === 0 ? "bg-white" : "bg-stone-50/60"}>
      <td className="py-3.5 px-4 text-[14px] font-medium text-foreground whitespace-nowrap">{band.label}</td>
      <td className="py-3.5 px-4 text-[14px] tabular-nums text-muted-foreground text-right">{band.min.toFixed(2)} €</td>
      <td className="py-3.5 px-4 text-[14px] tabular-nums font-semibold text-primary text-right">{band.avg.toFixed(2)} €</td>
      <td className="py-3.5 px-4 text-[14px] tabular-nums text-muted-foreground text-right">{band.max.toFixed(2)} €</td>
      <td className="py-3.5 px-4 hidden md:table-cell" style={{ minWidth: 180 }}>
        <div className="relative h-3 rounded-full bg-stone-100">
          <div className="absolute inset-y-0 rounded-full bg-primary/20" style={{ left: "0%", right: "0%" }} />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary border-2 border-white shadow-sm"
            style={{ left: `calc(${avgPct}% - 6px)` }}
            title={`Ø ${band.avg.toFixed(2)} €/m²`}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-muted-foreground">{band.min.toFixed(0)} €</span>
          <span className="text-[10px] text-muted-foreground">{band.max.toFixed(0)} €</span>
        </div>
      </td>
    </tr>
  );
}

function MarktdatenTab({
  cities, initialCity, initialData,
}: {
  cities: string[];
  initialCity: string | null;
  initialData: CityMietspiegel | null;
}) {
  const [selectedCity, setSelectedCity] = useState<string>(initialCity ?? "");
  const [cityData, setCityData] = useState<CityMietspiegel | null>(initialData);
  const [loading, setLoading] = useState(false);

  async function loadCity(city: string) {
    if (!city) { setCityData(null); return; }
    setSelectedCity(city);
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/mietspiegel/${encodeURIComponent(city)}`);
      if (!res.ok) throw new Error();
      setCityData(await res.json());
    } catch {
      setCityData(null);
    } finally {
      setLoading(false);
    }
  }

  const overallAvg = cityData
    ? cityData.bands.reduce((s, b) => s + b.avg, 0) / cityData.bands.length
    : null;

  return (
    <div className="space-y-6">
      {/* City selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-sm font-medium text-foreground shrink-0">Stadt auswählen:</label>
        <select
          value={selectedCity}
          onChange={(e) => loadCity(e.target.value)}
          className="py-2 pl-3 pr-8 text-sm bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary min-w-[200px]"
        >
          <option value="">— Bitte wählen —</option>
          {cities.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {cityData && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-2xl border border-border p-4">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Stadt</p>
              <p className="text-[16px] font-semibold text-foreground mt-1">{cityData.city}</p>
              <p className="text-[12px] text-muted-foreground">{cityData.state}</p>
            </div>
            <div className="bg-white rounded-2xl border border-border p-4">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Ø Marktmiete</p>
              <p className="text-[20px] font-bold tabular-nums text-primary mt-1">{overallAvg?.toFixed(2)} €/m²</p>
              <p className="text-[12px] text-muted-foreground">alle Größen</p>
            </div>
            <div className="bg-white rounded-2xl border border-border p-4">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Spanne gesamt</p>
              <p className="text-[16px] font-semibold tabular-nums text-foreground mt-1">
                {Math.min(...cityData.bands.map(b => b.min)).toFixed(2)} –{" "}
                {Math.max(...cityData.bands.map(b => b.max)).toFixed(2)} €/m²
              </p>
              <p className="text-[12px] text-muted-foreground">min – max</p>
            </div>
            <div className="bg-white rounded-2xl border border-border p-4">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Datenstand</p>
              <p className="text-[16px] font-semibold text-foreground mt-1">{cityData.data_year}</p>
              <p className="text-[12px] text-muted-foreground">Angebotsmieten</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-[15px] font-semibold">{cityData.city} — Kaltmiete nach Wohnfläche</h2>
                <p className="text-[12px] text-muted-foreground mt-0.5">€/m² · Angebotsmieten aus Inseraten</p>
              </div>
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-50 border-b border-border">
                  <th className="py-3 px-4 text-left text-[12px] font-medium text-muted-foreground uppercase tracking-wide">Wohnfläche</th>
                  <th className="py-3 px-4 text-right text-[12px] font-medium text-muted-foreground uppercase tracking-wide">Minimum</th>
                  <th className="py-3 px-4 text-right text-[12px] font-medium text-muted-foreground uppercase tracking-wide">Durchschnitt</th>
                  <th className="py-3 px-4 text-right text-[12px] font-medium text-muted-foreground uppercase tracking-wide">Maximum</th>
                  <th className="py-3 px-4 text-left text-[12px] font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">Spanne</th>
                </tr>
              </thead>
              <tbody>
                {cityData.bands.map((band, i) => (
                  <BandRow key={band.label} band={band} index={i} />
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-start gap-2.5 p-4 rounded-xl bg-amber-50 border border-amber-100">
            <Info className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-[13px] font-medium text-amber-800">Hinweis zu den Daten</p>
              <p className="text-[12px] text-amber-700 mt-0.5 leading-relaxed">
                Diese Werte sind <strong>Angebotsmieten</strong> aus Inseraten — keine kommunalen Mietspiegel.
                Sie eignen sich zur Orientierung über das Marktniveau, sind aber <strong>nicht rechtsverbindlich</strong> zur
                Begründung von Mieterhöhungen.
              </p>
              <p className="text-[11px] text-amber-600 mt-1.5">
                Quelle: {cityData.source} · Datenstand {cityData.data_year}
              </p>
            </div>
          </div>
        </div>
      )}

      {!cityData && !loading && selectedCity && (
        <div className="bg-white rounded-2xl border border-border p-12 text-center">
          <p className="text-muted-foreground text-sm">Keine Daten für diese Stadt verfügbar.</p>
        </div>
      )}

      {!selectedCity && (
        <div className="bg-white rounded-2xl border border-dashed border-border p-12 text-center">
          <p className="text-3xl mb-3">🏘️</p>
          <p className="font-medium text-foreground">Stadt auswählen</p>
          <p className="text-[13px] text-muted-foreground mt-1">Wähle eine Stadt aus, um die Marktmieten zu sehen.</p>
        </div>
      )}
    </div>
  );
}

// ── Portfolio unit row ────────────────────────────────────────────────────────
function UnitRankRow({ unit }: { unit: UnitMarketData }) {
  const cfg = BUCKET[unit.bucket];
  const Icon = cfg.icon;

  const range = unit.market_max - unit.market_min || 1;
  const currentPct = Math.min(100, Math.max(0, ((unit.current_per_sqm - unit.market_min) / range) * 100));
  const avgPct = Math.min(100, Math.max(0, ((unit.market_avg - unit.market_min) / range) * 100));

  return (
    <div className="flex items-start gap-4 px-5 py-4 border-b border-border/60 last:border-0 hover:bg-stone-50/60 transition-colors group">
      {/* Badge */}
      <div className="shrink-0 pt-0.5">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${cfg.badge}`}>
          <Icon className="h-3 w-3" />
          {cfg.label}
        </span>
      </div>

      {/* Unit info */}
      <div className="min-w-0 w-44 shrink-0">
        <Link href={`/dashboard/units/${unit.unit_id}`} className="group-hover:text-primary transition-colors">
          <p className="text-[13px] font-semibold text-foreground truncate leading-snug">{unit.address}</p>
        </Link>
        <p className="text-[12px] text-muted-foreground truncate mt-0.5">{unit.tenant_name || "—"}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{unit.city} · {unit.area_sqm} m²</p>
      </div>

      {/* Visual bar */}
      <div className="flex-1 min-w-0 hidden sm:block pt-1">
        <div className="relative h-5 bg-stone-100 rounded-full overflow-visible">
          {/* Colored fill from left up to current position */}
          <div
            className={`absolute inset-y-0 left-0 rounded-full opacity-40 ${cfg.fill}`}
            style={{ width: `${currentPct}%` }}
          />
          {/* Market average reference line */}
          <div
            className="absolute inset-y-[-4px] w-px bg-stone-500/60 z-10"
            style={{ left: `${avgPct}%` }}
            title={`Markt-Ø ${unit.market_avg.toFixed(2)} €/m²`}
          />
          {/* Current position dot */}
          <div
            className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 border-white shadow-md z-20 ${cfg.dot}`}
            style={{ left: `calc(${currentPct}% - 10px)` }}
            title={`Ihre Miete: ${unit.current_per_sqm.toFixed(2)} €/m²`}
          />
        </div>
        {/* Labels below bar */}
        <div className="relative mt-1.5 h-3" style={{ overflow: "visible" }}>
          <span className="absolute left-0 text-[10px] text-muted-foreground tabular-nums">{unit.market_min.toFixed(0)} €</span>
          <span
            className="absolute -translate-x-1/2 text-[10px] text-stone-500 tabular-nums font-medium"
            style={{ left: `${avgPct}%` }}
          >
            Ø {unit.market_avg.toFixed(0)} €
          </span>
          <span className="absolute right-0 text-[10px] text-muted-foreground tabular-nums">{unit.market_max.toFixed(0)} €</span>
        </div>
      </div>

      {/* Stats */}
      <div className="shrink-0 text-right w-32">
        <p className="text-[14px] font-bold tabular-nums text-foreground">
          {unit.current_per_sqm.toFixed(2)} €/m²
        </p>
        <p className="text-[11px] text-muted-foreground tabular-nums">Ø {unit.market_avg.toFixed(2)} €/m²</p>
        <p className={`text-[12px] font-semibold tabular-nums mt-1 ${cfg.text}`}>
          {unit.delta_pct >= 0 ? "+" : ""}{(unit.delta_pct * 100).toFixed(1)}%
        </p>
        {unit.bucket === "below" && unit.monthly_potential > 0 && (
          <p className="text-[11px] text-amber-600 font-medium mt-0.5 tabular-nums">
            +{unit.monthly_potential.toLocaleString("de-DE", { maximumFractionDigits: 0 })} €/Mo
          </p>
        )}
      </div>
    </div>
  );
}

// ── Portfolio tab ─────────────────────────────────────────────────────────────
function PortfolioTab({ marketOverview }: { marketOverview: PortfolioMarketOverview | null }) {
  const [sort, setSort] = useState<"potential" | "delta" | "address">("potential");
  const [bucketFilter, setBucketFilter] = useState<"" | "below" | "at" | "above">("");

  const units = marketOverview?.units ?? [];
  const summary = marketOverview?.summary;

  const sorted = useMemo(() => {
    const filtered = bucketFilter ? units.filter(u => u.bucket === bucketFilter) : [...units];
    if (sort === "potential") return filtered.sort((a, b) => b.monthly_potential - a.monthly_potential || a.delta_pct - b.delta_pct);
    if (sort === "delta") return filtered.sort((a, b) => a.delta_pct - b.delta_pct);
    return filtered.sort((a, b) => a.address.localeCompare(b.address));
  }, [units, sort, bucketFilter]);

  if (!marketOverview || units.length === 0) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-dashed border-border p-12 text-center">
          <p className="text-3xl mb-3">📊</p>
          <p className="font-medium text-foreground">Noch keine Vergleichsdaten</p>
          <p className="text-[13px] text-muted-foreground mt-1 max-w-sm mx-auto">
            Sobald Einheiten mit Flächenangabe in einer unterstützten Stadt vorhanden sind, wird hier der Marktvergleich angezeigt.
          </p>
          <Link href="/dashboard/units" className="inline-flex mt-4 text-[13px] text-primary hover:underline">
            Einheiten verwalten →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="bg-white rounded-2xl border border-border p-4">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Analysiert</p>
            <p className="text-[22px] font-bold text-foreground mt-1">{summary.total_units_compared}</p>
            <p className="text-[12px] text-muted-foreground">Einheiten</p>
          </div>
          <div className={`rounded-2xl border p-4 ${summary.units_below_market > 0 ? "bg-red-50 border-red-200" : "bg-white border-border"}`}>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Unter Markt</p>
            <p className={`text-[22px] font-bold mt-1 ${summary.units_below_market > 0 ? "text-red-700" : "text-foreground"}`}>
              {summary.units_below_market}
            </p>
            <p className="text-[12px] text-muted-foreground">Einheiten</p>
          </div>
          <div className="bg-white rounded-2xl border border-border p-4">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Marktgerecht</p>
            <p className="text-[22px] font-bold text-green-700 mt-1">{summary.units_at_market}</p>
            <p className="text-[12px] text-muted-foreground">Einheiten</p>
          </div>
          <div className="bg-white rounded-2xl border border-border p-4">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Über Markt</p>
            <p className="text-[22px] font-bold text-blue-700 mt-1">{summary.units_above_market}</p>
            <p className="text-[12px] text-muted-foreground">Einheiten</p>
          </div>
          <div className={`rounded-2xl border p-4 ${summary.total_monthly_potential > 0 ? "bg-amber-50 border-amber-200" : "bg-white border-border"} sm:col-span-3 lg:col-span-1`}>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Potenzial</p>
            <p className={`text-[22px] font-bold tabular-nums mt-1 ${summary.total_monthly_potential > 0 ? "text-amber-700" : "text-foreground"}`}>
              {summary.total_monthly_potential > 0
                ? `+${summary.total_monthly_potential.toLocaleString("de-DE", { maximumFractionDigits: 0 })} €`
                : "—"}
            </p>
            <p className="text-[12px] text-muted-foreground">pro Monat</p>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Bucket filter pills */}
        <div className="flex items-center gap-1.5">
          {(["", "below", "at", "above"] as const).map((b) => {
            const labels: Record<string, string> = { "": "Alle", below: "Unter Markt", at: "Marktgerecht", above: "Über Markt" };
            return (
              <button
                key={b}
                onClick={() => setBucketFilter(b)}
                className={`px-3 py-1 text-[12px] font-medium rounded-full transition-colors ${
                  bucketFilter === b
                    ? "bg-primary text-white"
                    : "bg-stone-100 text-muted-foreground hover:bg-stone-200"
                }`}
              >
                {labels[b]}
              </button>
            );
          })}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-1.5 ml-auto">
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="text-[12px] bg-transparent border-none outline-none text-muted-foreground cursor-pointer hover:text-foreground"
          >
            <option value="potential">Sortiert nach Potenzial</option>
            <option value="delta">Sortiert nach Abweichung</option>
            <option value="address">Sortiert nach Adresse</option>
          </select>
        </div>
      </div>

      {/* Unit ranking list */}
      {sorted.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border p-8 text-center">
          <p className="text-[13px] text-muted-foreground">Keine Einheiten in dieser Kategorie.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          {/* Column headers — only visible md+ where bar is shown */}
          <div className="hidden sm:grid px-5 py-2.5 border-b border-border bg-stone-50/80 text-[11px] font-medium text-muted-foreground uppercase tracking-wide"
            style={{ gridTemplateColumns: "auto 11rem 1fr 8rem" }}>
            <span className="pr-4">Lage</span>
            <span>Einheit</span>
            <span className="pl-4">Position im Markt</span>
            <span className="text-right">Ihre Miete</span>
          </div>

          {sorted.map((unit) => (
            <UnitRankRow key={unit.unit_id} unit={unit} />
          ))}
        </div>
      )}

      {/* Disclaimer */}
      <div className="flex items-start gap-2.5 p-4 rounded-xl bg-stone-50 border border-stone-200">
        <Info className="h-4 w-4 text-stone-500 mt-0.5 shrink-0" />
        <p className="text-[12px] text-muted-foreground leading-relaxed">
          Vergleichsbasis sind <strong>Angebotsmieten</strong> aus Inseraten — keine kommunalen Mietspiegel.
          Marktzone ±5 % gilt als marktgerecht. Daten sind nicht rechtsverbindlich.
        </p>
      </div>
    </div>
  );
}

// ── Page shell ────────────────────────────────────────────────────────────────
export function MietspiegelClient({ cities, initialCity, initialData, marketOverview }: Props) {
  const [tab, setTab] = useState<"marktdaten" | "portfolio">("marktdaten");

  const hasPortfolioData = (marketOverview?.units.length ?? 0) > 0;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Marktmieten</h1>
          <p className="text-[14px] text-muted-foreground mt-0.5">
            Angebotsmieten und Portfolio-Vergleich für deine Einheiten.
          </p>
        </div>
      </div>

      {/* Tab pills */}
      <div className="flex items-center gap-1 border-b border-border">
        <button
          onClick={() => setTab("marktdaten")}
          className={`px-4 py-2.5 text-[14px] font-medium border-b-2 -mb-px transition-colors ${
            tab === "marktdaten"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Marktdaten
        </button>
        <button
          onClick={() => setTab("portfolio")}
          className={`px-4 py-2.5 text-[14px] font-medium border-b-2 -mb-px transition-colors flex items-center gap-2 ${
            tab === "portfolio"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Mein Portfolio
          {hasPortfolioData && marketOverview && marketOverview.summary.units_below_market > 0 && (
            <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold">
              {marketOverview.summary.units_below_market}
            </span>
          )}
        </button>
      </div>

      {/* Tab content */}
      {tab === "marktdaten" ? (
        <MarktdatenTab cities={cities} initialCity={initialCity} initialData={initialData} />
      ) : (
        <PortfolioTab marketOverview={marketOverview} />
      )}
    </div>
  );
}
