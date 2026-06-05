import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, TrendingUp, Euro, AlertCircle } from "lucide-react";
import { ButtonLink } from "@/components/ui/button-link";

// Placeholder KPI cards — Sprint 3 wires up real data from backend
function KpiCard({
  title,
  value,
  sub,
  icon: Icon,
}: {
  title: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Count units for empty-state logic
  const { count } = await supabase
    .from("units")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user!.id);

  const hasUnits = (count ?? 0) > 0;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Portfolio-Übersicht</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Willkommen zurück 👋
          </p>
        </div>
        <ButtonLink href="/dashboard/units/new">+ Einheit hinzufügen</ButtonLink>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Einheiten" value={String(count ?? 0)} icon={Building2} />
        <KpiCard title="Monatliche Miete" value="—" sub="nach Upload" icon={Euro} />
        <KpiCard title="Ø €/m²" value="—" sub="nach Upload" icon={TrendingUp} />
        <KpiCard title="Offene Fristen" value="—" sub="nach Upload" icon={AlertCircle} />
      </div>

      {/* Empty state */}
      {!hasUnits && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-12 text-center gap-4">
            <span className="text-5xl">🪄</span>
            <div>
              <p className="font-semibold text-lg">Lade deinen ersten Mietvertrag hoch</p>
              <p className="text-muted-foreground text-sm mt-1 max-w-sm">
                Foto oder PDF — unsere AI extrahiert alle Daten in unter 60 Sekunden.
              </p>
            </div>
            <ButtonLink href="/dashboard/units/new" size="lg">Mietvertrag hochladen</ButtonLink>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
