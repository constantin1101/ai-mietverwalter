import { ButtonLink } from "@/components/ui/button-link";

export default function UnitsPage() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Einheiten</h1>
        <ButtonLink href="/dashboard/units/new">+ Hinzufügen</ButtonLink>
      </div>
      <p className="text-muted-foreground text-sm">
        Noch keine Einheiten — lade deinen ersten Mietvertrag hoch.
      </p>
    </div>
  );
}
