import { createClient } from "@/lib/supabase/server";
import { api } from "@/lib/api/server";
import type { CityMietspiegel, PortfolioMarketOverview } from "@/types/api";

import { MietspiegelClient } from "./mietspiegel-client";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

async function fetchCities(): Promise<string[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/mietspiegel/cities`, { cache: "no-store" });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

async function fetchCity(city: string): Promise<CityMietspiegel | null> {
  try {
    const res = await fetch(
      `${BACKEND_URL}/mietspiegel/${encodeURIComponent(city)}`,
      { cache: "force-cache", next: { revalidate: 86400 } }
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function MietspiegelPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const cities = await fetchCities();
  const initialCity = cities[0] ?? null;

  const [initialData, marketOverview] = await Promise.all([
    initialCity ? fetchCity(initialCity) : Promise.resolve(null),
    api.get<PortfolioMarketOverview>("/portfolio/market-overview", user).catch(() => null),
  ]);

  return (
    <MietspiegelClient
      cities={cities}
      initialCity={initialCity}
      initialData={initialData}
      marketOverview={marketOverview}
    />
  );
}
