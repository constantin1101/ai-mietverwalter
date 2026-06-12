/**
 * Server-side API helper for Server Components.
 * Reads the Supabase session from the user object and calls the FastAPI backend.
 */
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

async function getToken(user: User): Promise<string> {
  // For server components we re-create the supabase client to get the session token
  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

export const api = {
  async get<T>(path: string, user: User): Promise<T> {
    const token = await getToken(user);
    const res = await fetch(`${BACKEND_URL}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      // Don't cache — always fresh data in dashboards
      cache: "no-store",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail ?? "API error");
    }
    return res.json() as Promise<T>;
  },
};
