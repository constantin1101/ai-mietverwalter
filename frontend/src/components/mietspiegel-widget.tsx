"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { CityMietspiegel } from "@/types/api";
import { Loader2, TrendingUp, ArrowRight } from "lucide-react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

interface Props {
  cities: string[];
  defaultCity?: string;
}

export function MietspiegelWidget({ cities, defaultCity }: Props) {
  const [selectedCity, setSelectedCity] = useState(defaultCity ?? cities[0] ?? "");
  const [data, setData] = useState<CityMietspiegel | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedCity) return;
    let cancelled = false;
    setLoading(true);
    fetch(`${BACKEND_URL}/mietspiegel/${encodeURIComponent(selectedCity)}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setData(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [selectedCity]);

  // Find the middle band as the "representative" (40–60 m² = index 1)
  const repBand = data?.bands[1] ?? data?.bands[0];

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm p-5 space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <p className="text-[13px] font-semibold text-foreground">Marktmieten</p>
        </div>
        <select
          value={selectedCity}
          onChange={(e) => setSelectedCity(e.target.value)}
          className="text-[12px] py-1 pl-2 pr-6 border border-border rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-primary/30 text-foreground"
        >
          {cities.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : data && repBand ? (
        <div className="space-y-3">
          {/* Representative band highlight */}
          <div className="bg-primary/5 rounded-xl p-3 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-muted-foreground">{repBand.label}</p>
              <p className="text-[22px] font-bold tabular-nums text-primary leading-none mt-0.5">
                {repBand.avg.toFixed(2)} €/m²
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Marktdurchschnitt</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-muted-foreground">Spanne</p>
              <p className="text-[13px] tabular-nums font-medium text-foreground">
                {repBand.min.toFixed(0)} – {repBand.max.toFixed(0)} €/m²
              </p>
            </div>
          </div>

          {/* Mini band list */}
          <div className="space-y-1">
            {data.bands.map((band) => {
              const range = band.max - band.min || 1;
              const avgPct = ((band.avg - band.min) / range) * 100;
              return (
                <div key={band.label} className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground w-20 shrink-0">{band.label}</span>
                  <div className="flex-1 relative h-2 rounded-full bg-stone-100">
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary"
                      style={{ left: `calc(${avgPct}% - 4px)` }}
                    />
                  </div>
                  <span className="text-[11px] tabular-nums text-foreground w-14 text-right shrink-0">
                    Ø {band.avg.toFixed(1)} €
                  </span>
                </div>
              );
            })}
          </div>

          <p className="text-[10px] text-muted-foreground">
            Angebotsmieten · {data.data_year} · Orientierungswerte
          </p>
        </div>
      ) : null}

      {/* Link to full page */}
      <Link
        href="/dashboard/mietspiegel"
        className="flex items-center justify-between w-full pt-3 border-t border-border/60 text-[12px] font-medium text-primary hover:text-primary/80 transition-colors"
      >
        Alle Städte ansehen
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
