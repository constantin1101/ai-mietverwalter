import { createClient } from "@/lib/supabase/server";
import { api } from "@/lib/api/server";
import type { DocumentCard, UnitCard } from "@/types/api";
import { DocumentsClient } from "./documents-client";

export default async function DocumentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token ?? "";

  const [documents, units] = await Promise.all([
    api.get<DocumentCard[]>("/documents", user).catch(() => [] as DocumentCard[]),
    api.get<UnitCard[]>("/units", user).catch(() => [] as UnitCard[]),
  ]);

  return <DocumentsClient documents={documents} units={units} token={token} />;
}
