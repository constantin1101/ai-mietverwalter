import { createClient } from "@/lib/supabase/server";
import { api } from "@/lib/api/server";
import type { UnitDetail } from "@/types/api";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Home, FileText, CalendarDays, Folder } from "lucide-react";
import { UnitDetailClient } from "./unit-detail-client";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function UnitDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token ?? "";

  let unit: UnitDetail;
  try {
    unit = await api.get<UnitDetail>(`/units/${id}`, user);
  } catch {
    notFound();
  }

  const address = `${unit.property.street} ${unit.property.house_number}`;
  const primaryTenant = unit.tenants[0];

  return (
    <div className="min-h-full bg-background">
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* Breadcrumb */}
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" />
          Portfolio
        </Link>

        {/* Header */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-50 text-green-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                  Aktiv
                </span>
                <span className="text-[12px] text-muted-foreground capitalize">
                  {unit.lease.rent_type === "fixed" ? "Festmiete" : unit.lease.rent_type === "indexed" ? "Indexmiete" : "Staffelmiete"}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-foreground">{address}</h1>
              <p className="text-[15px] text-muted-foreground mt-0.5">
                {unit.property.postal_code} {unit.property.city}
                {unit.unit_number ? ` · Wohnung ${unit.unit_number}` : ""}
                {unit.floor ? ` · ${unit.floor}. OG` : ""}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-3xl font-bold tabular-nums text-foreground">
                {unit.lease.base_rent.toLocaleString("de-DE")} €
              </p>
              <p className="text-[13px] text-muted-foreground">Kaltmiete/Monat</p>
              {unit.lease.operating_costs && (
                <p className="text-[12px] text-muted-foreground">
                  + {unit.lease.operating_costs.toLocaleString("de-DE")} € NK
                </p>
              )}
            </div>
          </div>

          {/* Quick stats */}
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-border/60">
            {primaryTenant && (
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Mieter</p>
                <p className="text-[14px] font-medium">{primaryTenant.first_name} {primaryTenant.last_name}</p>
              </div>
            )}
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Seit</p>
              <p className="text-[14px] font-medium">{new Date(unit.lease.start_date).toLocaleDateString("de-DE")}</p>
            </div>
            {unit.area_sqm && (
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Fläche</p>
                <p className="text-[14px] font-medium">{unit.area_sqm} m²</p>
              </div>
            )}
            {unit.rooms && (
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Zimmer</p>
                <p className="text-[14px] font-medium">{unit.rooms}</p>
              </div>
            )}
            {unit.lease.deposit && (
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Kaution</p>
                <p className="text-[14px] font-medium tabular-nums">{unit.lease.deposit.toLocaleString("de-DE")} €</p>
              </div>
            )}
          </div>
        </div>

        {/* Tabs (client component for interactivity) */}
        <UnitDetailClient unit={unit} token={token} />

      </div>
    </div>
  );
}
