"use client";

import { useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  FileText, ExternalLink, Loader2, Upload, Search, X,
  ChevronDown, ChevronRight, Plus,
} from "lucide-react";
import type { DocumentCard, UnitCard } from "@/types/api";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

// ── Document type catalogue ────────────────────────────────────────────────────

interface DocCategory {
  key: string;
  label: string;
  description: string;
  icon: string;
}

const CATEGORIES: DocCategory[] = [
  { key: "lease_contract",      label: "Mietverträge",            description: "Haupt- und Ergänzungsverträge", icon: "📄" },
  { key: "handover_protocol",   label: "Übergabeprotokolle",      description: "Ein- und Auszugsprotokolle",    icon: "🔑" },
  { key: "rent_increase",       label: "Mieterhöhungen",          description: "Anschreiben & Nachweise",       icon: "📈" },
  { key: "utility_statement",   label: "Nebenkostenabrechnungen",  description: "Jährliche NK-Abrechnungen",     icon: "🔢" },
  { key: "invoice",             label: "Rechnungen",              description: "Handwerker, Reparaturen, etc.", icon: "🧾" },
  { key: "insurance_policy",    label: "Versicherungen",          description: "Gebäude-, Haftpflicht-Policen", icon: "🛡️" },
  { key: "energy_certificate",  label: "Energieausweise",         description: "Pflichtnachweis bei Vermietung", icon: "⚡" },
  { key: "correspondence",      label: "Korrespondenz",           description: "Briefe, E-Mails, Notizen",      icon: "✉️" },
  { key: "other",               label: "Sonstiges",               description: "Weitere Unterlagen",            icon: "📁" },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE");
}

// ── Upload Dialog ──────────────────────────────────────────────────────────────

function UploadDialog({
  units,
  token,
  initialType,
  onClose,
  onDone,
}: {
  units: UnitCard[];
  token: string;
  initialType?: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [docType, setDocType] = useState(initialType ?? "other");
  const [unitId, setUnitId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { setError("Bitte eine Datei auswählen."); return; }
    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("document_type", docType);
      if (unitId) form.append("unit_id", unitId);

      const res = await fetch(`${BACKEND_URL}/documents/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail ?? "Upload fehlgeschlagen.");
      }
      router.refresh();
      onDone();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload fehlgeschlagen.");
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-[16px] font-semibold">Dokument hochladen</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Document type */}
          <div>
            <label className="block text-[13px] font-medium text-foreground mb-1.5">Dokumenttyp</label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full py-2 pl-3 pr-8 text-sm bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            >
              {CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>{c.icon} {c.label}</option>
              ))}
            </select>
          </div>

          {/* Unit selection */}
          <div>
            <label className="block text-[13px] font-medium text-foreground mb-1.5">
              Einheit <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <select
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
              className="w-full py-2 pl-3 pr-8 text-sm bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            >
              <option value="">Keine Einheit zuordnen</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.street} {u.house_number}{u.unit_number ? ` · ${u.unit_number}` : ""} – {u.primary_tenant_name}
                </option>
              ))}
            </select>
          </div>

          {/* File drop zone */}
          <div>
            <label className="block text-[13px] font-medium text-foreground mb-1.5">Datei</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/40 hover:bg-accent/20 transition-colors"
            >
              {file ? (
                <div className="flex items-center justify-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="font-medium text-foreground truncate max-w-[240px]">{file.name}</span>
                  <span className="text-muted-foreground text-xs">{fmtSize(file.size)}</span>
                </div>
              ) : (
                <div className="space-y-1">
                  <Upload className="h-7 w-7 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">
                    Datei hier ablegen oder <span className="text-primary">auswählen</span>
                  </p>
                  <p className="text-xs text-muted-foreground">PDF, JPG, PNG · max. 20 MB</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={uploading || !file}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? "Wird hochgeladen…" : "Hochladen"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Document row ───────────────────────────────────────────────────────────────

function DocRow({ doc, token }: { doc: DocumentCard; token: string }) {
  const [loading, setLoading] = useState(false);

  async function open() {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/documents/${doc.id}/url`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data: { url: string } = await res.json();
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch {
      alert("Dokument konnte nicht geöffnet werden.");
    } finally {
      setLoading(false);
    }
  }

  const address = doc.street
    ? `${doc.street} ${doc.house_number ?? ""}${doc.unit_number ? ` · ${doc.unit_number}` : ""}`
    : null;

  return (
    <div className="flex items-center justify-between px-4 py-3 hover:bg-stone-50/80 transition-colors group">
      <div className="flex items-center gap-3 min-w-0">
        <div className="shrink-0 w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center">
          <FileText className="h-3.5 w-3.5 text-stone-400" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-foreground truncate">{doc.filename}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {address && (
              <span className="text-[11px] text-muted-foreground">{address}</span>
            )}
            {doc.primary_tenant_name && (
              <span className="text-[11px] text-muted-foreground">· {doc.primary_tenant_name}</span>
            )}
            {doc.city && (
              <span className="text-[11px] text-muted-foreground">· {doc.city}</span>
            )}
            <span className="text-[11px] text-muted-foreground">· {fmtDate(doc.created_at)}</span>
            {doc.file_size_bytes && (
              <span className="text-[11px] text-muted-foreground">· {fmtSize(doc.file_size_bytes)}</span>
            )}
          </div>
        </div>
      </div>
      <button
        onClick={open}
        disabled={loading}
        className="shrink-0 ml-3 inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-primary border border-primary/25 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-primary/5 transition-all disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ExternalLink className="h-3 w-3" />}
        Öffnen
      </button>
    </div>
  );
}

// ── Category section ───────────────────────────────────────────────────────────

function CategorySection({
  category,
  docs,
  token,
  onUpload,
}: {
  category: DocCategory;
  docs: DocumentCard[];
  token: string;
  onUpload: (type: string) => void;
}) {
  const [open, setOpen] = useState(docs.length > 0);
  const isEmpty = docs.length === 0;

  return (
    <div className="bg-white rounded-2xl border border-border overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-stone-50/60 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl leading-none">{category.icon}</span>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-semibold text-foreground">{category.label}</span>
              {docs.length > 0 && (
                <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-600 min-w-[20px]">
                  {docs.length}
                </span>
              )}
            </div>
            <p className="text-[12px] text-muted-foreground">{category.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onUpload(category.key); }}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-muted-foreground border border-border rounded-lg hover:text-primary hover:border-primary/30 transition-colors"
          >
            <Plus className="h-3 w-3" />
            Hinzufügen
          </button>
          {open ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Body */}
      {open && (
        <div className="border-t border-border/60">
          {isEmpty ? (
            <div className="px-5 py-6 flex items-center gap-3 text-muted-foreground">
              <span className="text-2xl opacity-40">{category.icon}</span>
              <div>
                <p className="text-[13px] font-medium">Noch keine {category.label}</p>
                <button
                  onClick={() => onUpload(category.key)}
                  className="text-[12px] text-primary hover:underline mt-0.5"
                >
                  Erstes Dokument hochladen →
                </button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {docs.map((d) => (
                <DocRow key={d.id} doc={d} token={token} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function DocumentsClient({
  documents,
  units,
  token,
}: {
  documents: DocumentCard[];
  units: UnitCard[];
  token: string;
}) {
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadType, setUploadType] = useState("other");

  const cities = useMemo(
    () => Array.from(new Set(documents.map((d) => d.city).filter(Boolean) as string[])).sort(),
    [documents],
  );

  const filtered = useMemo(() => {
    return documents.filter((d) => {
      if (cityFilter && d.city !== cityFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const addr = `${d.street ?? ""} ${d.house_number ?? ""} ${d.city ?? ""}`.toLowerCase();
        const tenant = (d.primary_tenant_name ?? "").toLowerCase();
        const name = d.filename.toLowerCase();
        if (!addr.includes(q) && !tenant.includes(q) && !name.includes(q)) return false;
      }
      return true;
    });
  }, [documents, cityFilter, search]);

  const docsByType = useMemo(() => {
    const map: Record<string, DocumentCard[]> = {};
    for (const cat of CATEGORIES) map[cat.key] = [];
    for (const d of filtered) {
      const key = d.document_type in map ? d.document_type : "other";
      map[key].push(d);
    }
    return map;
  }, [filtered]);

  function openUpload(type: string) {
    setUploadType(type);
    setUploadOpen(true);
  }

  const hasFilters = !!search || !!cityFilter;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dokumente</h1>
          <p className="text-[14px] text-muted-foreground mt-0.5">
            {documents.length > 0
              ? `${documents.length} Dokument${documents.length !== 1 ? "e" : ""} gespeichert`
              : "Alle Unterlagen zentral verwalten"}
          </p>
        </div>
        <button
          onClick={() => openUpload("other")}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Upload className="h-4 w-4" />
          Hochladen
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Dateiname, Adresse oder Mieter…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-muted-foreground"
          />
        </div>

        <select
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          className="py-2 pl-3 pr-8 text-sm bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-foreground"
        >
          <option value="">Alle Städte</option>
          {cities.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        {hasFilters && (
          <button
            onClick={() => { setSearch(""); setCityFilter(""); }}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            Zurücksetzen
          </button>
        )}

        {hasFilters && (
          <span className="text-[13px] text-muted-foreground ml-auto">
            {filtered.length} von {documents.length} Dokument{documents.length !== 1 ? "en" : ""}
          </span>
        )}
      </div>

      {/* Category sections */}
      <div className="space-y-3">
        {CATEGORIES.map((cat) => (
          <CategorySection
            key={cat.key}
            category={cat}
            docs={docsByType[cat.key] ?? []}
            token={token}
            onUpload={openUpload}
          />
        ))}
      </div>

      {/* Upload dialog */}
      {uploadOpen && (
        <UploadDialog
          units={units}
          token={token}
          initialType={uploadType}
          onClose={() => setUploadOpen(false)}
          onDone={() => setUploadOpen(false)}
        />
      )}
    </div>
  );
}
