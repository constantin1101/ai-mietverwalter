# Heimio — Claude Code Instructions

## Projekt-Überblick
AI-natives Property-Management-SaaS für private Vermieter in Deutschland.
**Tagline**: "Foto vom Mietvertrag. 5 Minuten. Fertiges Dashboard."

→ Produkt-Vision: [docs/product-vision.md](docs/product-vision.md)
→ Architektur: [docs/architecture.md](docs/architecture.md)
→ Datenmodell: [docs/data-model.md](docs/data-model.md)
→ AI-Pipeline: [docs/ai-pipeline.md](docs/ai-pipeline.md)
→ Design System: [docs/design-system.md](docs/design-system.md)
→ Aufgaben & Roadmap: [.claude/tasks.md](.claude/tasks.md)

---

## Tech Stack

| Layer | Tool |
|-------|------|
| Frontend | Next.js 15 (App Router), TypeScript strict, Tailwind CSS, shadcn/ui |
| Backend | **FastAPI (Python 3.12+)**, Pydantic v2, uv (Package Manager) |
| Datenbank + Auth + Storage | Supabase (EU Frankfurt Region) |
| AI Hauptmodell | `claude-sonnet-4-6` via Anthropic API |
| OCR | `gemini-2.5-flash` (multimodal, PyMuPDF für digitale PDFs) |
| Marktdaten | Kuratierte JSON-Datei (`backend/app/data/mietspiegel.json`) |
| Payment | Stripe (noch nicht implementiert — Sprint 5) |
| Hosting | Vercel (Frontend) + Railway/Fly.io (FastAPI, EU) |

---

## Implementierter Stand (Sprint 1–4 abgeschlossen)

**Live-Features:**
- Auth (Login/Register/Callback), Route-Guard via `proxy.ts`
- Upload → OCR → KI-Extraktion → Review-Dialog → DB-Persistierung
- Dashboard: KPI-Cards, Staffel-/Indexmiete-Tracker, Marktpotenzial-Card, Mietspiegel-Widget
- Einheiten-Liste: Filter (Stadt, Mietart, Marktlage), Marktvergleich-Spalte
- Einheiten-Detail: 5 Tabs (Übersicht, Finanzen, Fristen, Dokumente, Rechts-Check)
- **Einheiten bearbeiten**: Edit-Dialog mit 4-Tab-Formular + Diff-Review-Schritt (PATCH /units/{id})
- Dokumente-Seite: 9 Kategorien, Filter, Vorschau via signierter URL
- Fristen-Kalender: Monatsansicht
- Excel-Export: 8-Sheet Workbook (Deckblatt, Portfolio, Mietverträge, Mieter, Finanzen, Fristen, Mietentwicklung, Dokumente)
- Marktmieten-Seite (`/dashboard/mietspiegel`): 2 Tabs — Marktdaten (Städte-Lookup) + Mein Portfolio (Ranking aller Einheiten mit Positionsbalken)
- Marktvergleich: Unit-Detail Finanzen-Tab, Units-Liste Spalte, Dashboard KPI-Card

---

## Dateistruktur (kritische Dateien)

### Frontend
```
frontend/src/
  app/
    (auth)/auth/                    # Login, Register, Callback, Reset
    (dashboard)/dashboard/
      page.tsx                      # Dashboard-Übersicht (Server Component)
      layout.tsx                    # Sidebar + Layout-Wrapper
      units/
        page.tsx                    # Einheiten-Liste (Server, fetcht market overview)
        units-client.tsx            # Filter, Tabelle, ExportDialog (Client)
        [id]/page.tsx               # Einheit-Detail-Page (Server)
        [id]/unit-detail-client.tsx # Tabs + Edit-Button + MarketComparison (Client)
        new/page.tsx                # 3-Schritt Upload-Flow (Client)
      documents/
        page.tsx / documents-client.tsx
      calendar/
        page.tsx / calendar-client.tsx
      mietspiegel/
        page.tsx                    # Fetcht cities + market overview (Server, Auth)
        mietspiegel-client.tsx      # Tabs: Marktdaten + Mein Portfolio (Client)
      settings/page.tsx

  components/
    layout/sidebar.tsx              # Nav: Übersicht, Einheiten, Dokumente, Fristen, Marktmieten, Einstellungen
    unit-edit-dialog.tsx            # Edit-Dialog (2-Schritt: Formular → Diff-Review)
    export-dialog.tsx               # Excel-Export-Dialog
    mietspiegel-widget.tsx          # Dashboard-Widget
    documents/
      extraction-review.tsx         # AI-Extraction Review mit Confidence-Badges
      upload-dropzone.tsx
    ui/                             # shadcn: button, input, label, card, badge, tabs, separator, sonner
    brand/logo.tsx

  lib/
    api/
      client.ts                     # get, post, postForm, patch, delete (mit Auth + Timeout)
      server.ts                     # Server-side API-Calls (nutzt Supabase user-Objekt)
    supabase/
      client.ts                     # Browser-Client
      server.ts                     # Server-Client (async, cookies)

  types/api.ts                      # Alle TypeScript-Interfaces (spiegelt Backend Pydantic-Models)
  proxy.ts                          # Next.js Middleware: Route-Guard für /dashboard/*
```

### Backend
```
backend/app/
  main.py                           # FastAPI-App, CORS, alle Router eingebunden
  core/
    config.py                       # pydantic-settings (.env)
    auth.py                         # JWT-Validierung (Supabase JWKS ES256 + HS256-Fallback)
    dependencies.py                 # CurrentUser, SupabaseClient FastAPI-Dependencies
  routers/
    units.py                        # GET /units, /units/kpis, /units/trackers, /units/{id}, PATCH /units/{id}
    extract.py                      # POST /extract, POST /extract/confirm
    upload.py                       # POST /upload
    documents.py                    # GET /documents, POST /documents/upload, GET /documents/{id}/url
    deadlines.py                    # GET /deadlines
    export.py                       # GET /export/excel (8-Sheet openpyxl)
    mietspiegel.py                  # GET /mietspiegel/cities|/{city}|/{city}/lookup, GET /portfolio/market-overview
  services/
    excel_export.py                 # build_workbook() — openpyxl 8-Sheet-Builder
    ai/
      extract.py                    # KI-Extraktion via Anthropic API
      prompts/extract_lease.py      # Deutsch-Prompt für Mietvertrags-Extraktion
    ocr/pipeline.py                 # PyMuPDF (digital) + Gemini (Scans/Fotos)
  models/
    extraction.py                   # Pydantic v2: ExtractionResult, ConfidenceField[T]
  utils/
    deadline_generator.py           # Auto-Fristen aus Vertragsdaten
    rent_calculator.py              # get_market_comparison(), get_city_data() — mit @lru_cache
  data/
    mietspiegel.json                # 12 Städte × 5 Flächenbänder, Angebotsmieten 2024
```

---

## API-Endpunkte (vollständige Liste)

| Method | Path | Auth | Beschreibung |
|--------|------|------|--------------|
| GET | `/health` | Nein | Health-Check |
| POST | `/upload` | Ja | Datei → Supabase Storage |
| POST | `/extract` | Ja | Dokument-ID → KI-Extraktion |
| POST | `/extract/confirm` | Ja | Extraktion → DB persistieren |
| GET | `/units` | Ja | Alle Einheiten (UnitCard-Liste) |
| GET | `/units/kpis` | Ja | Portfolio-KPIs |
| GET | `/units/trackers` | Ja | Staffel-/Indexmiete-Alerts |
| GET | `/units/{id}` | Ja | Einheit-Detail vollständig |
| PATCH | `/units/{id}` | Ja | Einheit/Lease/Tenant updaten |
| GET | `/documents` | Ja | Alle Dokumente |
| GET | `/documents/{id}/url` | Ja | Signierte Download-URL |
| GET | `/deadlines` | Ja | Alle offenen Fristen |
| GET | `/export/excel` | Ja | Excel-Download (?date_from&date_to&city) |
| GET | `/mietspiegel/cities` | Nein | Liste unterstützter Städte |
| GET | `/mietspiegel/{city}` | Nein | Daten einer Stadt (alle Bänder) |
| GET | `/mietspiegel/{city}/lookup` | Nein | Passendes Band für area_sqm |
| GET | `/portfolio/market-overview` | Ja | Alle Einheiten vs. Markt (Bucket + Potenzial) |

---

## Coding-Konventionen

### Allgemein
- **Sprache in Code**: Englisch (Variablen, Funktionen, Kommentare)
- **Sprache in UI**: Deutsch (alle User-facing Texte, HTTP `detail`-Felder)
- Frontend: TypeScript strict — kein `any` ohne Kommentar
- Backend: Python 3.12+, type hints überall

### Frontend
- Server Components by default; `'use client'` nur bei Interaktivität/Hooks
- API-Calls: **nur** über `frontend/src/lib/api/client.ts` (`api.get/post/patch/delete`) — nie direkte `fetch`-Calls
- Server-side API-Calls: `frontend/src/lib/api/server.ts` — nutzt Supabase `user`-Objekt für Auth
- Token-Passing: Server Component → `supabase.auth.getSession()` → `token` als Prop an Client Component

### Backend
- Router-Funktionen sind dünn: validieren → delegieren an Service → Response returnen
- `async def` überall wo I/O stattfindet
- Supabase-Calls via `_run(db, lambda: ...)` Wrapper:
  ```python
  def _run(db, fn):
      return asyncio.get_event_loop().run_in_executor(None, fn)
  ```
- HTTP-Errors: `HTTPException(status_code=..., detail="Deutsches Feedback")` in Routers
- Pydantic v2: `model_dump(exclude_unset=True)` für PATCH-Operationen (nur gesetzte Felder)

### Supabase
- Immer RLS aktiviert — Backend prüft `user_id = current_user.sub` in Queries
- Service Role Key im Backend — nie im Frontend
- Storage: privater Bucket `documents`, Zugriff via `create_signed_url`

### Dialog/Modal-Pattern
- **Kein** shadcn `<Dialog>` installiert. Immer raw div overlay:
  ```tsx
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 overflow-hidden">
  ```
- Referenz: `components/export-dialog.tsx`, `components/unit-edit-dialog.tsx`

### Formular-Inputs (konsistente Klassen)
```tsx
// Text-Input
"w-full py-2 px-3 text-sm bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
// Select
"w-full py-2 pl-3 pr-8 text-sm bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
// Fehler-Zustand: zusätzlich "border-red-400 focus:border-red-500"
```

---

## Kritische Muster & Gotchas

**Mietspiegel-Daten**: Kuratierte JSON, kein DB-Eintrag. `@lru_cache` in `rent_calculator.py`. Nur unterstützte Städte bekommen Marktvergleich — fehlende Städte liefern einfach `null`/`None`, kein Fehler.

**Markt-Bucket-Logik**: `below` = delta_pct < −5 %, `above` = > +5 %, `at` = ±5 %. Definition in `mietspiegel.py` und Frontend `BUCKET`-Konstanten.

**PATCH /units/{id}**: Nutzt `UnitEditPayload` mit optional `unit`, `lease`, `tenant`. Nur explizit gesendete Felder werden überschrieben (`exclude_unset=True`). Nullable Felder (z.B. `end_date: null`) löschen den Wert in der DB — PATCH-Semantik.

**Excel-Export**: Alle Workbook-Logik in `services/excel_export.py`, Router `routers/export.py` ist nur thin HTTP-Layer. `StreamingResponse(iter([xlsx_bytes]))` für den Download.

**Auth in Server Components**: Immer `createClient()` (async, cookie-basiert) aus `@/lib/supabase/server`. Für API-Calls an Backend: `api.get<T>(path, user)` aus `@/lib/api/server`.

**`_run()` Signatur**: In `units.py` und `mietspiegel.py` unterschiedlich — `units.py` nimmt `_run(db, fn)`, `mietspiegel.py` nimmt `_run(fn)`. Beim Hinzufügen neuer Funktionen: konsistent mit dem jeweiligen File bleiben.

---

## DSGVO & Compliance

- Alle AI-Calls EU-seitig (Anthropic EU / AWS Bedrock Frankfurt)
- Keine Mieterdaten an US-Services ohne SCC
- Supabase Storage für Dokumente — niemals externe CDNs
- Angebotsmieten-Disclaimer bei Mietspiegel-Daten (nicht rechtsverbindlich)
- Jedes neue Feature: Datenschutz-Check (was gespeichert, wie lange, Rechtsgrundlage)

---

## Aufgaben-Workflow

Neue Aufgaben in [.claude/tasks.md](.claude/tasks.md) — Backlog-Sektion.
Sprint-Aufgaben oben in "In Progress". Abgeschlossenes unter "Done" mit Datum.

Architektur-Entscheidungen (ADRs) in [docs/architecture.md](docs/architecture.md).
Format: **Datum | Entscheidung | Begründung | Alternativen**
