import { createClient } from "@/lib/supabase/server";
import { ButtonLink } from "@/components/ui/button-link";
import { Plus, Building2, TrendingUp, Euro, AlertCircle } from "lucide-react";

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-border hover:shadow-md transition-shadow duration-150">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <Icon className="h-4 w-4 text-stone-300 shrink-0" />
      </div>
      <p className="mt-3 text-3xl font-bold text-foreground tabular-nums">{value}</p>
      {sub && <p className="mt-1 text-[13px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-white rounded-2xl border border-dashed border-border p-12 flex flex-col items-center text-center gap-5">
      <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center text-3xl">
        🪄
      </div>
      <div className="space-y-1.5">
        <p className="text-[17px] font-semibold text-foreground">
          Lade deinen ersten Mietvertrag hoch
        </p>
        <p className="text-[15px] text-muted-foreground max-w-sm leading-relaxed">
          Foto oder PDF — unsere AI extrahiert alle Daten in unter 60 Sekunden.
          Kein Formular ausfüllen.
        </p>
      </div>
      <ButtonLink href="/dashboard/units/new" size="lg">
        Mietvertrag hochladen
      </ButtonLink>
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { count } = await supabase
    .from("units")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user!.id);

  const hasUnits = (count ?? 0) > 0;

  return (
    <div className="min-h-full bg-background">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Mein Portfolio</h1>
            <p className="text-[15px] text-muted-foreground mt-0.5">Willkommen zurück 👋</p>
          </div>
          <ButtonLink href="/dashboard/units/new">
            <Plus className="h-4 w-4 mr-1.5" />
            Einheit hinzufügen
          </ButtonLink>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Einheiten"     value={String(count ?? 0)} sub={hasUnits ? "im Portfolio" : "noch keine"} icon={Building2} />
          <KpiCard label="Kaltmiete"     value="— €"  sub="pro Monat"  icon={Euro} />
          <KpiCard label="Ø €/m²"        value="—"    sub="nach Upload" icon={TrendingUp} />
          <KpiCard label="Offene Fristen" value="—"   sub="nach Upload" icon={AlertCircle} />
        </div>

        {!hasUnits ? <EmptyState /> : (
          <p className="text-[15px] text-muted-foreground">Einheiten-Übersicht folgt in Sprint 3.</p>
        )}

      </div>
    </div>
  );
}
