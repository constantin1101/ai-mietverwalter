"use client";

import { useState } from "react";
import { Download, Loader2, FileSpreadsheet, X } from "lucide-react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  token: string;
  cities?: string[];
}

export function ExportDialog({ open, onClose, token, cities = [] }: ExportDialogProps) {
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [city, setCity] = useState("");

  if (!open) return null;

  async function handleExport() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      if (city) params.set("city", city);

      const url = `${BACKEND_URL}/export/excel${params.toString() ? `?${params}` : ""}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Export fehlgeschlagen");

      const blob = await res.blob();
      const today = new Date().toISOString().split("T")[0];
      const filename = `heimio-export-${today}.xlsx`;
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(link.href);
      onClose();
    } catch {
      alert("Export fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setLoading(false);
    }
  }

  const hasFilters = Boolean(dateFrom || dateTo || city);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            <h2 className="text-[16px] font-semibold">Portfolio-Export</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Info */}
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            Erstellt eine Excel-Datei mit 8 Sheets: Deckblatt, Portfolio-Übersicht,
            Mietverträge, Mieter, Finanzen, Fristen, Mietentwicklung und Dokumente.
          </p>

          {/* City filter */}
          <div className="space-y-1.5">
            <label className="block text-[13px] font-medium text-foreground">
              Stadt filtern <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            {cities.length > 0 ? (
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full py-2 pl-3 pr-8 text-sm bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              >
                <option value="">Alle Städte</option>
                {cities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                placeholder="z.B. München"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full py-2 px-3 text-sm bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-muted-foreground"
              />
            )}
          </div>

          {/* Date range */}
          <div className="space-y-1.5">
            <label className="block text-[13px] font-medium text-foreground">
              Fristen-Zeitraum <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="flex-1 py-2 px-3 text-sm bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
              <span className="text-muted-foreground text-sm shrink-0">bis</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="flex-1 py-2 px-3 text-sm bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Filtert den &quot;Fristen &amp; Termine&quot;-Sheet auf diesen Zeitraum.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-1">
            {hasFilters ? (
              <button
                onClick={() => { setDateFrom(""); setDateTo(""); setCity(""); }}
                className="text-[12px] text-muted-foreground hover:text-foreground underline underline-offset-2"
              >
                Filter zurücksetzen
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-muted-foreground border border-border rounded-xl hover:bg-accent transition-colors disabled:opacity-50"
              >
                Abbrechen
              </button>
              <button
                onClick={handleExport}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-primary rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {loading ? "Erstelle..." : "Excel herunterladen"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
