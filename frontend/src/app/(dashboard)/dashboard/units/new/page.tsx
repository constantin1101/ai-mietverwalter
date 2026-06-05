import { UploadDropzone } from "@/components/documents/upload-dropzone";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function NewUnitPage() {
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
          Zurück zur Übersicht
        </Link>
        <h1 className="text-2xl font-bold">Neue Einheit hinzufügen</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Lade einen Mietvertrag hoch — wir erledigen den Rest.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mietvertrag hochladen</CardTitle>
          <CardDescription>
            PDF, gescannte Seiten oder Foto — unsere AI liest alles aus.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UploadDropzone />
        </CardContent>
      </Card>
    </div>
  );
}
