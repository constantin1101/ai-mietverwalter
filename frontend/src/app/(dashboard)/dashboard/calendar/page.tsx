import { createClient } from "@/lib/supabase/server";
import { api } from "@/lib/api/server";
import type { DeadlineCard } from "@/types/api";
import { CalendarClient } from "./calendar-client";

export default async function CalendarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const deadlines = await api
    .get<DeadlineCard[]>("/deadlines", user)
    .catch(() => [] as DeadlineCard[]);

  return <CalendarClient deadlines={deadlines} />;
}
