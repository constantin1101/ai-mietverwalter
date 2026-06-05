"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { UploadCloud, FileText, AlertCircle, CheckCircle2 } from "lucide-react";

type UploadState =
  | { type: "idle" }
  | { type: "dragover" }
  | { type: "uploading"; progress: number }
  | { type: "success"; documentId: string; filename: string }
  | { type: "error"; message: string };

interface UploadResponse {
  document_id: string;
  file_path: string;
  filename: string;
  status: string;
}

export function UploadDropzone() {
  const router = useRouter();
  const [state, setState] = useState<UploadState>({ type: "idle" });

  const uploadFile = useCallback(async (file: File) => {
    setState({ type: "uploading", progress: 0 });

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await api.postForm<UploadResponse>("/upload", form);
      setState({
        type: "success",
        documentId: res.document_id,
        filename: res.filename,
      });
      // Redirect to extraction flow
      router.push(`/dashboard/units/new?document_id=${res.document_id}`);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Upload fehlgeschlagen. Bitte erneut versuchen.";
      setState({ type: "error", message });
    }
  }, [router]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) uploadFile(file);
    },
    [uploadFile],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) uploadFile(file);
    },
    [uploadFile],
  );

  const isUploading = state.type === "uploading";

  return (
    <div className="space-y-4">
      <label
        htmlFor="file-upload"
        onDragOver={(e) => {
          e.preventDefault();
          setState((s) => (s.type === "idle" ? { type: "dragover" } : s));
        }}
        onDragLeave={() =>
          setState((s) => (s.type === "dragover" ? { type: "idle" } : s))
        }
        onDrop={handleDrop}
        className={cn(
          "flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 cursor-pointer transition-colors",
          state.type === "dragover"
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
          isUploading && "pointer-events-none opacity-70",
        )}
      >
        <input
          id="file-upload"
          type="file"
          accept=".pdf,image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={handleFileInput}
          disabled={isUploading}
        />

        {state.type === "uploading" ? (
          <>
            <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4" />
            <p className="font-medium">Wird hochgeladen…</p>
            <p className="text-sm text-muted-foreground">Einen Moment bitte</p>
          </>
        ) : state.type === "success" ? (
          <>
            <CheckCircle2 className="h-10 w-10 text-green-500 mb-4" />
            <p className="font-medium">Upload erfolgreich!</p>
            <p className="text-sm text-muted-foreground">{state.filename}</p>
          </>
        ) : state.type === "error" ? (
          <>
            <AlertCircle className="h-10 w-10 text-destructive mb-4" />
            <p className="font-medium text-destructive">Fehler</p>
            <p className="text-sm text-muted-foreground text-center">{state.message}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setState({ type: "idle" })}
            >
              Erneut versuchen
            </Button>
          </>
        ) : (
          <>
            <UploadCloud className="h-10 w-10 text-muted-foreground mb-4" />
            <p className="font-medium">Mietvertrag hier ablegen</p>
            <p className="text-sm text-muted-foreground mt-1">
              oder klicken zum Auswählen
            </p>
            <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
              <FileText className="h-3.5 w-3.5" />
              PDF · JPG · PNG · max. 20 MB
            </div>
          </>
        )}
      </label>

      <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">Was passiert nach dem Upload?</p>
        <ol className="list-decimal list-inside space-y-0.5">
          <li>AI erkennt den Text (OCR)</li>
          <li>Alle Vertragsdaten werden automatisch extrahiert</li>
          <li>Du prüfst und bestätigst die Daten ({"< 1 Minute"})</li>
        </ol>
      </div>
    </div>
  );
}
