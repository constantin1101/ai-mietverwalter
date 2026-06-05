# AI-Mietverwalter — Claude Code Instructions

## Projekt-Überblick
AI-natives Property-Management-SaaS für private Vermieter in Deutschland.
**Tagline**: "Foto vom Mietvertrag. 5 Minuten. Fertiges Dashboard."

→ Vollständige Produkt-Vision: [docs/product-vision.md](docs/product-vision.md)
→ Architektur: [docs/architecture.md](docs/architecture.md)
→ Datenmodell: [docs/data-model.md](docs/data-model.md)
→ AI-Pipeline: [docs/ai-pipeline.md](docs/ai-pipeline.md)
→ Aufgaben & Roadmap: [.claude/tasks.md](.claude/tasks.md)

---

## Tech Stack (immer beachten)

| Layer | Tool |
|-------|------|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| Backend | **FastAPI (Python)**, Pydantic v2, uv (Package Manager) |
| Datenbank + Auth + Storage | Supabase (EU Frankfurt Region) |
| AI Hauptmodell | Claude claude-sonnet-4-6 via Anthropic API (oder AWS Bedrock EU) |
| OCR | Mistral OCR API |
| Vector Search | pgvector in Supabase |
| Payment | Stripe (Subscriptions + One-Time) |
| Mailing | Resend |
| Analytics | PostHog EU Cloud |
| Hosting | Vercel (Frontend) + Railway/Fly.io (FastAPI Backend, EU) |

---

## Coding-Konventionen

### Allgemein
- **Sprache in Code**: Englisch (Variablen, Funktionen, Kommentare)
- **Sprache in UI**: Deutsch (alle User-facing Texte)
- Frontend: TypeScript strict mode — kein `any` ohne Kommentar
- Backend: Python 3.12+, type hints überall, keine ungetypten Funktionen

### Frontend (Next.js)
- Funktionale Komponenten, keine Class Components
- Server Components by default; `'use client'` nur bei Interaktivität/Hooks
- API-Calls zum Backend via `frontend/src/lib/api/client.ts` (nie direkte fetch-Calls verstreut)

### Backend (FastAPI / Python)
```
backend/app/
  routers/        # FastAPI Router — nur HTTP-Handling, keine Business-Logik
  services/       # Business-Logik, AI-Calls, Supabase-Zugriffe
  models/         # Pydantic-Models für Request/Response/DB
  core/           # Config, Auth-Dependencies, shared Utilities
```

- Router-Funktionen sind dünn: validieren, delegieren an Service, returnen Response
- Pydantic v2 für alle Schemas (analog zu Zod im Frontend)
- `async def` überall wo I/O stattfindet (DB, AI API, OCR API)
- Exceptions: eigene `AppException(status_code, detail)` — nie nackte `Exception` raiseen

### Supabase
- Immer Row Level Security (RLS) aktivieren
- Backend nutzt Service Role Key (voller Zugriff, Auth-Check in FastAPI Dependency)
- Frontend nutzt Anon Key + Supabase Auth JWT
- Keine direkten DB-Calls aus Frontend-Komponenten

### AI / Claude (Python)
- Prompts in separaten Dateien unter `backend/app/services/ai/prompts/`
- Immer strukturierte Outputs (Pydantic-Model + tool_use) bei Extraktion
- Confidence-Scores für alle extrahierten Felder mitliefern
- Kosten pro Request loggen (input_tokens, output_tokens, Dauer)

### Error Handling
- HTTP-Errors als `HTTPException(status_code=..., detail=...)` in Routers
- Business-Errors als eigene Exception-Klassen in Services
- User-facing Errors auf Deutsch (im `detail`-Feld)
- Dev-Logs auf Englisch

---

## DSGVO & Compliance (immer im Kopf behalten)
- Alle AI-Calls bleiben EU-seitig (AWS Bedrock Frankfurt oder Anthropic EU)
- Keine Mieterdaten an US-Services ohne SCC
- Supabase Storage für Dokumente — niemals externe CDNs für sensible Docs
- Jede neue Feature-Idee: kurz Datenschutz-Check (was wird gespeichert, wie lange, welche Rechtsgrundlage)

---

## Aufgaben-Workflow
Neue Aufgaben in [.claude/tasks.md](.claude/tasks.md) eintragen (Backlog-Sektion).
Aktuelle Sprint-Aufgaben oben in "In Progress".
Abgeschlossenes unter "Done" mit Datum.

---

## Wichtige Entscheidungen (ADRs)
Architektur-Entscheidungen in [docs/architecture.md](docs/architecture.md) dokumentieren.
Format: **Datum | Entscheidung | Begründung | Alternativen**
