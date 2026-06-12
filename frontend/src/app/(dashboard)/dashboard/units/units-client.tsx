"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ButtonLink } from "@/components/ui/button-link";
import { ExportDialog } from "@/components/export-dialog";
import { Download, Plus, Search, X, TrendingDown, TrendingUp, Minus } from "lucide-react";
import type { UnitCard, UnitMarketData } from "@/types/api";

const RENT_TYPE_LABEL: Record<string, string> = {
  fixed: "Festmiete",
  indexed: "Indexmiete",
  graduated: "Staffelmiete",
};

const RENT_TYPE_COLOR: Record<string, string> = {
  fixed: "bg-stone-100 text-stone-600",
  indexed: "bg-blue-50 text-blue-700",
  graduated: "bg-amber-50 text-amber-700",
};

const BUCKET_CONFIG = {
  below: { label: "Unter Markt", icon: TrendingDown, className: "bg-red-50 text-red-700" },
  at:    { label: "Marktgerecht", icon: Minus,        className: "bg-green-50 text-green-700" },
  above: { label: "Über Markt",  icon: TrendingUp,   className: "bg-blue-50 text-blue-700" },
} as const;

export function UnitsClient({
  units, token, marketByUnit = {},
}: {
  units: UnitCard[];
  token: string;
  marketByUnit?: Record<string, UnitMarketData>;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [rentTypeFilter, setRentTypeFilter] = useState("");
  const [marketFilter, setMarketFilter] = useState("");
  const [exportOpen, setExportOpen] = useState(false);

  const hasMarketData = Object.keys(marketByUnit).length > 0;

  // Unique cities for filter dropdown
  const cities = useMemo(
    () => Array.from(new Set(units.map((u) => u.city))).sort(),
    [units]
  );

  const filtered = useMemo(() => {
    return units.filter((u) => {
      if (cityFilter && u.city !== cityFilter) return false;
      if (rentTypeFilter && u.rent_type !== rentTypeFilter) return false;
      if (marketFilter) {
        const m = marketByUnit[u.id];
        if (!m || m.bucket !== marketFilter) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        const address = `${u.street} ${u.house_number} ${u.city}`.toLowerCase();
        const tenant = u.primary_tenant_name.toLowerCase();
        if (!address.includes(q) && !tenant.includes(q)) return false;
      }
      return true;
    });
  }, [units, cityFilter, rentTypeFilter, marketFilter, marketByUnit, search]);

  const totalRent = filtered.reduce((s, u) => s + u.base_rent, 0);
  const hasFilters = !!search || !!cityFilter || !!rentTypeFilter || !!marketFilter;

  function clearFilters() {
    setSearch("");
    setCityFilter("");
    setRentTypeFilter("");
    setMarketFilter("");
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        token={token}
        cities={cities}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Einheiten</h1>
          <p className="text-[14px] text-muted-foreground mt-0.5">
            {units.length} Einheit{units.length !== 1 ? "en" : ""} verwaltet
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setExportOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-muted-foreground border border-border rounded-xl hover:bg-accent hover:text-foreground transition-colors"
          >
            <Download className="h-4 w-4" />
            Excel
          </button>
          <ButtonLink href="/dashboard/units/new">
            <Plus className="h-4 w-4 mr-1.5" />
            Einheit hinzufügen
          </ButtonLink>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Adresse oder Mieter suchen…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-muted-foreground"
          />
        </div>

        {/* City filter */}
        <select
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          className="py-2 pl-3 pr-8 text-sm bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-foreground"
        >
          <option value="">Alle Städte</option>
          {cities.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {/* Rent type filter */}
        <select
          value={rentTypeFilter}
          onChange={(e) => setRentTypeFilter(e.target.value)}
          className="py-2 pl-3 pr-8 text-sm bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-foreground"
        >
          <option value="">Alle Mietarten</option>
          <option value="fixed">Festmiete</option>
          <option value="indexed">Indexmiete</option>
          <option value="graduated">Staffelmiete</option>
        </select>

        {/* Market position filter */}
        {hasMarketData && (
          <select
            value={marketFilter}
            onChange={(e) => setMarketFilter(e.target.value)}
            className="py-2 pl-3 pr-8 text-sm bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-foreground"
          >
            <option value="">Alle Marktlagen</option>
            <option value="below">Unter Markt</option>
            <option value="at">Marktgerecht</option>
            <option value="above">Über Markt</option>
          </select>
        )}

        {/* Clear */}
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            Filter zurücksetzen
          </button>
        )}

        {hasFilters && (
          <span className="text-[13px] text-muted-foreground ml-auto">
            {filtered.length} von {units.length} Einheiten
          </span>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-border p-12 text-center">
          <p className="text-muted-foreground text-sm">Keine Einheiten gefunden.</p>
          {hasFilters && (
            <button onClick={clearFilters} className="mt-2 text-sm text-primary hover:underline">
              Filter zurücksetzen
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-stone-50/80">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground text-[12px] uppercase tracking-wide">Adresse</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground text-[12px] uppercase tracking-wide">Einheit</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground text-[12px] uppercase tracking-wide">Mieter</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground text-[12px] uppercase tracking-wide">Kaltmiete</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground text-[12px] uppercase tracking-wide">Mietart</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground text-[12px] uppercase tracking-wide hidden md:table-cell">Zi. / m²</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground text-[12px] uppercase tracking-wide hidden lg:table-cell">Stadt</th>
                {hasMarketData && (
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground text-[12px] uppercase tracking-wide hidden xl:table-cell">Marktlage</th>
                )}
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.map((unit) => {
                const address = `${unit.street} ${unit.house_number}`;
                const roomsArea = [
                  unit.rooms ? `${unit.rooms} Zi.` : null,
                  unit.area_sqm ? `${unit.area_sqm} m²` : null,
                ].filter(Boolean).join(" · ") || "—";

                return (
                  <tr
                    key={unit.id}
                    onClick={() => router.push(`/dashboard/units/${unit.id}`)}
                    className="hover:bg-accent/40 cursor-pointer transition-colors group"
                  >
                    <td className="py-3.5 px-4">
                      <span className="font-medium text-foreground">{address}</span>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">
                      {unit.unit_number ?? (unit.floor != null ? `${unit.floor}. OG` : "—")}
                    </td>
                    <td className="py-3.5 px-4 text-foreground truncate max-w-[160px]">
                      {unit.primary_tenant_name}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold tabular-nums text-foreground">
                      {unit.base_rent.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${RENT_TYPE_COLOR[unit.rent_type] ?? "bg-stone-100 text-stone-600"}`}>
                        {RENT_TYPE_LABEL[unit.rent_type] ?? unit.rent_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground hidden md:table-cell">
                      {roomsArea}
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground hidden lg:table-cell">
                      {unit.postal_code} {unit.city}
                    </td>
                    {hasMarketData && (() => {
                      const m = marketByUnit[unit.id];
                      if (!m) return <td className="py-3.5 px-4 hidden xl:table-cell"><span className="text-[12px] text-muted-foreground">—</span></td>;
                      const cfg = BUCKET_CONFIG[m.bucket];
                      const Icon = cfg.icon;
                      return (
                        <td className="py-3.5 px-4 hidden xl:table-cell">
                          <div className="flex flex-col gap-0.5">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium w-fit ${cfg.className}`}>
                              <Icon className="h-3 w-3" />
                              {cfg.label}
                            </span>
                            <span className="text-[11px] tabular-nums text-muted-foreground pl-1">
                              {m.delta_pct >= 0 ? "+" : ""}{(m.delta_pct * 100).toFixed(1)}% · {m.current_per_sqm.toFixed(2)} €/m²
                            </span>
                          </div>
                        </td>
                      );
                    })()}
                    <td className="py-3.5 px-4">
                      <span className="text-muted-foreground group-hover:text-primary transition-colors">›</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Summary row */}
            <tfoot>
              <tr className="border-t border-border bg-stone-50/80">
                <td className="py-3 px-4 text-[12px] font-medium text-muted-foreground" colSpan={2}>
                  {filtered.length} Einheit{filtered.length !== 1 ? "en" : ""}
                </td>
                <td className="py-3 px-4" />
                <td className="py-3 px-4 text-right font-bold tabular-nums text-foreground">
                  {totalRent.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
                </td>
                <td colSpan={4} className="py-3 px-4 text-[12px] text-muted-foreground">
                  Gesamt Kaltmiete
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
