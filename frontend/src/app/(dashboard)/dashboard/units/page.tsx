import { createClient } from "@/lib/supabase/server";
import { api } from "@/lib/api/server";
import type { UnitCard, PortfolioMarketOverview, UnitMarketData } from "@/types/api";
import { UnitsClient } from "./units-client";
import { ButtonLink } from "@/components/ui/button-link";
import { Plus } from "lucide-react";

export default async function UnitsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: session } = await supabase.auth.getSession();
  const token = session.session?.access_token ?? "";

  let units: UnitCard[] = [];
  try {
    units = await api.get<UnitCard[]>("/units", user);
  } catch {
    // Backend unavailable — show empty state
  }

  if (units.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Einheiten</h1>
            <p className="text-[14px] text-muted-foreground mt-0.5">Noch keine Einheiten vorhanden</p>
          </div>
          <ButtonLink href="/dashboard/units/new">
            <Plus className="h-4 w-4 mr-1.5" />
            Einheit hinzufügen
          </ButtonLink>
        </div>
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
      </div>
    );
  }

  // Fetch market comparison data in parallel — graceful fallback on error
  const marketOverview = await api
    .get<PortfolioMarketOverview>("/portfolio/market-overview", user)
    .catch(() => ({ units: [], summary: { total_units_compared: 0, units_below_market: 0, units_at_market: 0, units_above_market: 0, total_monthly_potential: 0 } } as PortfolioMarketOverview));

  const marketByUnit: Record<string, UnitMarketData> = Object.fromEntries(
    marketOverview.units.map((u) => [u.unit_id, u])
  );

  return <UnitsClient units={units} token={token} marketByUnit={marketByUnit} />;
}
