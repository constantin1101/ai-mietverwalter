"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { UploadDropzone } from "@/components/documents/upload-dropzone";
import ExtractionReview from "@/components/documents/extraction-review";
import { api, ApiError } from "@/lib/api/client";

type Step = 1 | 2 | 3;

interface ExtractionApiResponse {
  document_id: string;
  extraction: Record<string, unknown>;
  validation_errors: Array<{ field: string; level: "warning" | "error"; message: string }>;
  ocr_text_preview: string;
}

const STEPS: { id: Step; label: string }[] = [
  { id: 1, label: "Upload" },
  { id: 2, label: "Analyse" },
  { id: 3, label: "Prüfen" },
];

function StepIndicator({ current }: { current: Step }) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((step, idx) => {
        const isDone = step.id < current;
        const isActive = step.id === current;
        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors",
                  isDone
                    ? "bg-green-500 text-white"
                    : isActive
                      ? "bg-green-500 text-white ring-4 ring-green-100"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {isDone ? <Check className="h-4 w-4" /> : step.id}
              </div>
              <span
                className={cn(
                  "text-xs font-medium",
                  isActive ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={cn(
                  "h-px w-16 mx-2 mb-5 transition-colors",
                  step.id < current ? "bg-green-500" : "bg-border",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function AnalysingState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-6">
      <div className="relative">
        <div className="h-16 w-16 rounded-full border-4 border-green-100" />
        <div className="absolute inset-0 h-16 w-16 rounded-full border-4 border-green-500 border-t-transparent animate-spin" />
      </div>
      <div className="text-center space-y-1.5">
        <p className="text-lg font-semibold text-foreground">
          AI analysiert deinen Mietvertrag...
        </p>
        <p className="text-sm text-muted-foreground">
          Das dauert meist nur wenige Sekunden.
        </p>
      </div>
    </div>
  );
}

export default function NewUnitPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [extractionData, setExtractionData] = useState<ExtractionApiResponse | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);

  useEffect(() => {
    if (step !== 2 || !documentId) return;

    let cancelled = false;

    async function runExtraction() {
      setExtractError(null);
      try {
        const data = await api.post<ExtractionApiResponse>("/extract", {
          document_id: documentId,
        });
        if (!cancelled) {
          setExtractionData(data);
          setStep(3);
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof ApiError
              ? err.message
              : "Extraktion fehlgeschlagen. Bitte erneut versuchen.";
          setExtractError(message);
        }
      }
    }

    runExtraction();
    return () => {
      cancelled = true;
    };
  }, [step, documentId]);

  function handleUploadSuccess(uploadedDocumentId: string) {
    setDocumentId(uploadedDocumentId);
    setStep(2);
  }

  async function handleConfirm() {
    if (!extractionData) return;
    try {
      await api.post("/extract/confirm", { document_id: extractionData.document_id });
      router.push("/dashboard");
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Bestätigung fehlgeschlagen. Bitte erneut versuchen.";
      setExtractError(message);
    }
  }

  function handleRetryExtraction() {
    setExtractError(null);
    setStep(2);
  }

  return (
    <div className="min-h-full bg-background">
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ChevronLeft className="h-4 w-4" />
            Zurück zur Übersicht
          </Link>
          <h1 className="text-2xl font-bold text-foreground">
            Neue Einheit hinzufügen
          </h1>
          <p className="text-[15px] text-muted-foreground mt-1">
            Lade einen Mietvertrag hoch — wir erledigen den Rest.
          </p>
        </div>

        <div className="flex justify-center">
          <StepIndicator current={step} />
        </div>

        <div className="bg-white rounded-2xl border border-border shadow-sm p-8">
          {step === 1 && (
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-foreground">
                Mietvertrag hochladen
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                PDF, gescannte Seiten oder Foto — unsere AI liest alles aus.
              </p>
              <UploadDropzone onSuccess={handleUploadSuccess} />
            </div>
          )}

          {step === 2 && (
            <>
              {extractError ? (
                <div className="flex flex-col items-center justify-center py-16 gap-5 text-center">
                  <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
                    <span className="text-destructive text-2xl">!</span>
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground">
                      Extraktion fehlgeschlagen
                    </p>
                    <p className="text-sm text-muted-foreground">{extractError}</p>
                  </div>
                  <button
                    onClick={handleRetryExtraction}
                    className="text-sm font-medium text-green-600 hover:text-green-700 underline underline-offset-2"
                  >
                    Erneut versuchen
                  </button>
                </div>
              ) : (
                <AnalysingState />
              )}
            </>
          )}

          {step === 3 && extractionData && (
            <ExtractionReview
              documentId={extractionData.document_id}
              extractionData={extractionData.extraction}
              validationErrors={extractionData.validation_errors}
              onConfirm={async (corrected) => {
                await api.post("/extract/confirm", {
                  document_id: extractionData.document_id,
                  extraction: corrected,
                });
                router.push("/dashboard");
              }}
              onCancel={() => setStep(1)}
            />
          )}
        </div>
      </div>
    </div>
  );
}