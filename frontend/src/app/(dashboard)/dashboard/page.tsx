import { createClient } from "@/lib/supabase/server";
import { ButtonLink } from "@/components/ui/button-link";
import { Plus, Building2, TrendingUp, Euro, CalendarDays } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api/server";
import type { PortfolioKPIs, UnitCard, TrackersResponse } from "@/types/api";

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, highlight = false }: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; highlight?: boolean;
}) {
  return (
    <div className={`rounded-2xl p-5 border shadow-sm hover:shadow-md transition-shadow duration-150 ${highlight ? "bg-primary/5 border-primary/20" : "bg-white border-border"}`}>
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <Icon className="h-4 w-4 text-stone-300 shrink-0" />
      </div>
      <p className={`mt-3 text-3xl font-bold tabular-nums ${highlight ? "text-primary" : "text-foreground"}`}>{value}</p>
      {sub && <p className="mt-1 text-[13px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

// ── Unit Card ─────────────────────────────────────────────────────────────────
function UnitCardComponent({ unit }: { unit: UnitCard }) {
  const address = `${unit.street} ${unit.house_number}${unit.unit_number ? `, Nr. ${unit.unit_number}` : ""}`;
  const warmrent = unit.base_rent + (unit.operating_costs ?? 0);

  const rentTypeLabel: Record<string, string> = {
    fixed: "Festmiete", indexed: "Indexmiete", graduated: "Staffelmiete",
  };

  return (
    <Link href={`/dashboard/units/${unit.id}`} className="group block">
      <div className="bg-white rounded-2xl border border-border p-5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-150">
        {/* Address + arrow */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <div>
            <p className="font-semibold text-[15px] text-foreground leading-snug">{address}</p>
            <p className="text-[13px] text-muted-foreground">{unit.postal_code} {unit.city}</p>
          </div>
          <span className="text-muted-foreground group-hover:text-primary transition-colors text-lg leading-none mt-0.5">›</span>
        </div>

        {/* Tenant */}
        <p className="text-[13px] text-muted-foreground mt-2 mb-3 truncate">
          👤 {unit.primary_tenant_name}
        </p>

        {/* Divider */}
        <div className="border-t border-border/60 my-3" />

        {/* Rent + badge */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xl font-bold tabular-nums text-foreground">
              {unit.base_rent.toLocaleString("de-DE")} €
            </p>
            <p className="text-[12px] text-muted-foreground">
              Kaltmiete · {warmrent.toLocaleString("de-DE")} € warm
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-50 text-green-700">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
              Aktiv
            </span>
            <span className="text-[11px] text-muted-foreground">{rentTypeLabel[unit.rent_type] ?? unit.rent_type}</span>
          </div>
        </div>

        {/* Meta */}
        {(unit.rooms || unit.area_sqm) && (
          <p className="text-[12px] text-muted-foreground mt-2">
            {unit.rooms ? `${unit.rooms} Zi.` : ""}
            {unit.rooms && unit.area_sqm ? " · " : ""}
            {unit.area_sqm ? `${unit.area_sqm} m²` : ""}
            {unit.has_cellar ? " · Keller" : ""}
            {unit.has_parking ? " · Stellplatz" : ""}
          </p>
        )}
      </div>
    </Link>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="bg-white rounded-2xl border border-dashed border-border p-12 flex flex-col items-center text-center gap-5">
      <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center text-3xl">🪄</div>
      <div className="space-y-1.5">
        <p className="text-[17px] font-semibold">Lade deinen ersten Mietvertrag hoch</p>
        <p className="text-[15px] text-muted-foreground max-w-sm leading-relaxed">
          Foto oder PDF — AI extrahiert alle Daten in unter 60 Sekunden.
        </p>
      </div>
      <ButtonLink href="/dashboard/units/new" size="lg">Mietvertrag hochladen</ButtonLink>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Fetch KPIs, units, and trackers in parallel
  const [kpis, units, trackers] = await Promise.all([
    api.get<PortfolioKPIs>("/units/kpis", user),
    api.get<UnitCard[]>("/units", user),
    api.get<TrackersResponse>("/units/trackers", user).catch(() => ({ staffel_alerts: [], index_alerts: [] } as TrackersResponse)),
  ]);

  const hasUnits = units.length > 0;

  return (
    <div className="min-h-full bg-background">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Mein Portfolio</h1>
            <p className="text-[15px] text-muted-foreground mt-0.5">Willkommen zurück 👋</p>
          </div>
          <ButtonLink href="/dashboard/units/new">
            <Plus className="h-4 w-4 mr-1.5" />
            Einheit hinzufügen
          </ButtonLink>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Einheiten" value={String(kpis.total_units)}
            sub={hasUnits ? "vermietet" : "noch keine"} icon={Building2} />
          <KpiCard label="Kaltmiete" value={`${kpis.total_monthly_rent.toLocaleString("de-DE")} €`}
            sub="pro Monat" icon={Euro} highlight={hasUnits} />
          <KpiCard label="Ø €/m²"
            value={kpis.avg_rent_per_sqm ? `${kpis.avg_rent_per_sqm.toFixed(2)} €` : "—"}
            sub="nach Upload" icon={TrendingUp} />
          <KpiCard label="Fristen (30d)" value={String(kpis.upcoming_deadlines)}
            sub="offene Termine" icon={CalendarDays} />
        </div>

        {/* Tracker alerts section */}
        {(trackers.staffel_alerts.length > 0 || trackers.index_alerts.length > 0) && (
          <div>
            <h2 className="text-[15px] font-semibold text-foreground mb-3">Handlungsbedarf</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {trackers.staffel_alerts.map((a) => (
                <Link key={a.unit_id} href={`/dashboard/units/${a.unit_id}`} className="block">
                  <div className="bg-white rounded-2xl border border-amber-200 p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-[12px] font-semibold text-amber-700 uppercase tracking-wide">Staffelmiete</span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                        a.days_until <= 30 ? "bg-red-50 text-red-600" :
                        a.days_until <= 90 ? "bg-amber-50 text-amber-700" :
                        "bg-stone-100 text-stone-600"
                      }`}>
                        {a.days_until === 0 ? "Heute" : `In ${a.days_until} Tagen`}
                      </span>
                    </div>
                    <p className="text-[14px] font-medium text-foreground leading-snug">{a.address}</p>
                    <p className="text-[12px] text-muted-foreground mt-0.5">{a.tenant_name}</p>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/60">
                      <span className="text-[13px] text-muted-foreground tabular-nums line-through">{a.current_rent.toLocaleString("de-DE")} €</span>
                      <span className="text-stone-400">→</span>
                      <span className="text-[14px] font-bold tabular-nums text-foreground">{a.next_rent.toLocaleString("de-DE")} €</span>
                      <span className="text-[12px] text-green-600 font-medium">+{(a.next_rent - a.current_rent).toLocaleString("de-DE")} €/Monat</span>
                    </div>
                  </div>
                </Link>
              ))}
              {trackers.index_alerts.map((a) => (
                <Link key={a.unit_id} href={`/dashboard/units/${a.unit_id}`} className="block">
                  <div className="bg-white rounded-2xl border border-blue-200 p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-[12px] font-semibold text-blue-700 uppercase tracking-wide">Indexmiete · {a.index_type}</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-700">
                        {a.months_since_base} Monate
                      </span>
                    </div>
                    <p className="text-[14px] font-medium text-foreground leading-snug">{a.address}</p>
                    <p className="text-[12px] text-muted-foreground mt-0.5">{a.tenant_name}</p>
                    <p className="text-[12px] text-blue-700 mt-3 pt-3 border-t border-border/60">
                      Anpassung prüfen — Intervall: alle {a.interval_months} Monate
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Units grid or empty state */}
        {!hasUnits ? <EmptyState /> : (
          <div>
            <h2 className="text-[15px] font-semibold text-foreground mb-3">
              Alle Einheiten ({units.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {units.map((unit) => (
                <UnitCardComponent key={unit.id} unit={unit} />
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
