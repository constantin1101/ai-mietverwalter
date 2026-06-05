# 🏗️ Technische Architektur

## Überblick

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser / Mobile Web                    │
│                    Next.js 15 App Router (Vercel)               │
│              TypeScript + Tailwind CSS + shadcn/ui              │
└────────────────────────────┬────────────────────────────────────┘
                             │ REST / HTTP
┌────────────────────────────▼────────────────────────────────────┐
│                   FastAPI Backend (Python)                       │
│                    (Railway / Fly.io, EU)                       │
│                                                                 │
│  POST /upload        POST /extract       POST /legal-check      │
│  POST /stripe/*      GET  /export        GET  /units            │
└──────┬─────────────────┬──────────────────┬──────────┬──────────┘
       │                 │                  │          │
┌──────▼──────┐  ┌───────▼──────┐  ┌───────▼──────┐  │
│  Supabase   │  │  Anthropic   │  │  Mistral OCR │  │
│  EU (FRA)   │  │  Claude API  │  │     API      │  │
│             │  │  (claude-    │  │              │  │
│ - Postgres  │  │  sonnet-4-6) │  │  PDF → Text  │  │
│ - Auth      │  │              │  │              │  │
│ - Storage   │  │  Extraktion  │  └──────────────┘  │
│ - pgvector  │  │  Rechts-Check│                     │
└─────────────┘  └──────────────┘             ┌───────▼──────┐
                                              │   Stripe     │
                                              │  Payments    │
                                              └──────────────┘
```

---

## Tech Stack — Entscheidungen

### Frontend: Next.js 15 App Router
**Warum**: Server Components by default = weniger Client-JS, schnellere Pages, einfacheres Auth-Handling. App Router ermöglicht Layouts ohne re-renders.

**Wichtige Patterns**:
- Server Components für Daten-Fetching direkt aus Supabase
- `'use client'` nur für Interaktivität (Upload-Dialog, Charts, Maps)
- Server Actions für Form-Submissions und Mutationen

### UI: shadcn/ui + Tailwind
**Warum**: shadcn/ui liefert zugängliche, unstyled Komponenten als Code (kein npm-Overhead). Vollständige Kontrolle über Design. Tailwind für schnelles Styling.

**Komponenten-Strategie**:
- `src/components/ui/` — shadcn/ui Basis (nicht anfassen)
- `src/components/layout/` — App-Shell, Sidebar, Header
- `src/components/units/` — Einheiten-spezifisch
- `src/components/documents/` — Upload, Viewer, Vorschau

### Backend: Supabase (EU Frankfurt)
**Warum**: Postgres + Auth + Storage + Realtime + pgvector in einem. DSGVO-konform durch EU-Region. Kein Vendor Lock-in (Open Source, selbst-hostbar).

**Row Level Security**: IMMER aktiviert. User sieht nur seine eigenen Daten.

```sql
-- Beispiel RLS Policy
CREATE POLICY "users_own_data" ON units
  FOR ALL USING (auth.uid() = user_id);
```

### Backend: FastAPI (Python)
**Warum**: Python ist die natürliche Heimat für AI/ML-Workloads — beste Bibliotheken (anthropic, mistralai, pydantic, pandas, openpyxl). FastAPI liefert automatische OpenAPI-Docs, async-Support und Type-Safety via Pydantic. Trennung von Frontend und Backend ermöglicht unabhängige Skalierung der AI-Workloads.

**Wichtige Patterns**:
- Pydantic-Models für alle Request/Response-Schemas (analog zu Zod im Frontend)
- `async`/`await` für parallele AI-Calls (OCR + Extraktion)
- Dependency Injection für Supabase-Client + Auth-Validierung
- Background Tasks (`BackgroundTasks`) für lange Extraktions-Jobs

**Hosting**: Railway oder Fly.io (EU-Region), Docker-Container

### AI: Claude claude-sonnet-4-6 (Anthropic)
**Warum**: Beste Dokument-Verständnis-Qualität in seiner Klasse. Besonders gut bei strukturierter Extraktion aus komplexen Rechtsdokumenten. Tool Use / Structured Output für verlässliche JSON-Rückgaben.

**Alternative**: AWS Bedrock EU (Frankfurt) für DSGVO-kritischere Setups — selbe Modelle, EU Data Processing.

### OCR: Mistral OCR
**Warum**: Beste OCR-Qualität für handgeschriebene und schlecht gescannte Dokumente. EU-konform. Günstiger als AWS Textract für das Volumen.

**Fallback**: AWS Textract Frankfurt bei Mistral-Ausfall.

### Payments: Stripe
**Warum**: De-facto Standard, beste DX. Subscription + One-Time in einem System. Stripe Tax für automatische MwSt.

---

## Datei-Struktur

```
ai-mietverwalter/
├── frontend/                           # Next.js App
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   ├── login/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── register/
│   │   │   │       └── page.tsx
│   │   │   ├── (dashboard)/
│   │   │   │   ├── layout.tsx          # Dashboard Shell + Sidebar
│   │   │   │   ├── page.tsx            # Portfolio-Übersicht
│   │   │   │   ├── units/
│   │   │   │   │   ├── page.tsx        # Einheiten-Liste
│   │   │   │   │   ├── new/
│   │   │   │   │   │   └── page.tsx    # Neue Einheit / Upload-Flow
│   │   │   │   │   └── [id]/
│   │   │   │   │       └── page.tsx    # Einheit-Detail (5 Tabs)
│   │   │   │   ├── documents/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── calendar/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── settings/
│   │   │   │       ├── page.tsx
│   │   │   │       └── billing/
│   │   │   │           └── page.tsx
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx                # Landing Page
│   │   ├── components/
│   │   │   ├── ui/                     # shadcn/ui (nicht anfassen)
│   │   │   ├── layout/
│   │   │   │   ├── sidebar.tsx
│   │   │   │   ├── header.tsx
│   │   │   │   └── dashboard-shell.tsx
│   │   │   ├── units/
│   │   │   │   ├── unit-card.tsx
│   │   │   │   ├── unit-detail-tabs.tsx
│   │   │   │   ├── kpi-cards.tsx
│   │   │   │   ├── rent-chart.tsx
│   │   │   │   └── legal-check-panel.tsx
│   │   │   ├── documents/
│   │   │   │   ├── upload-dropzone.tsx
│   │   │   │   ├── extraction-review.tsx
│   │   │   │   └── document-list.tsx
│   │   │   └── shared/
│   │   │       ├── confidence-badge.tsx
│   │   │       └── empty-state.tsx
│   │   ├── lib/
│   │   │   ├── supabase/
│   │   │   │   ├── client.ts           # Browser-seitiger Client
│   │   │   │   └── server.ts           # Server-seitiger Client
│   │   │   ├── api/
│   │   │   │   └── client.ts           # Fetch-Wrapper für FastAPI Backend
│   │   │   └── stripe/
│   │   │       └── client.ts
│   │   ├── types/
│   │   │   ├── api.ts                  # Shared Types (spiegelt Pydantic-Models)
│   │   │   └── index.ts
│   │   └── middleware.ts               # Auth-Guard (Supabase JWT prüfen)
│   ├── .env.local
│   └── package.json
│
├── backend/                            # FastAPI App (Python)
│   ├── app/
│   │   ├── main.py                     # FastAPI App-Instanz, Router-Einbindung
│   │   ├── routers/
│   │   │   ├── upload.py               # POST /upload
│   │   │   ├── extract.py              # POST /extract, POST /extract/confirm
│   │   │   ├── legal_check.py          # POST /legal-check
│   │   │   ├── export.py               # GET /export/excel, GET /export/tax
│   │   │   ├── units.py                # CRUD /units
│   │   │   └── stripe.py               # POST /stripe/checkout, POST /stripe/webhook
│   │   ├── services/
│   │   │   ├── ai/
│   │   │   │   ├── extract.py          # Haupt-Extraktions-Logik
│   │   │   │   ├── legal_check.py      # Rechts-Check Logik
│   │   │   │   └── prompts/
│   │   │   │       ├── extract_lease.py
│   │   │   │       └── legal_analysis.py
│   │   │   ├── ocr/
│   │   │   │   ├── mistral.py          # Mistral OCR Client
│   │   │   │   └── pipeline.py         # OCR → Text Pipeline
│   │   │   ├── supabase.py             # Supabase Python Client
│   │   │   ├── stripe.py               # Stripe Python Client
│   │   │   └── export.py               # openpyxl Excel-Export
│   │   ├── models/
│   │   │   ├── extraction.py           # Pydantic-Models für Extraktion
│   │   │   ├── units.py                # Unit/Lease/Tenant Models
│   │   │   └── responses.py            # Standard API Response Models
│   │   ├── core/
│   │   │   ├── config.py               # Settings (pydantic-settings)
│   │   │   ├── auth.py                 # JWT-Validierung (Supabase Token)
│   │   │   └── dependencies.py         # FastAPI Dependencies
│   │   └── utils/
│   │       ├── rent_calculator.py      # Indexmiete/Staffelmiete Berechnungen
│   │       └── deadline_generator.py   # Auto-Fristen nach Extraktion
│   ├── tests/
│   │   ├── test_extract.py
│   │   └── test_legal_check.py
│   ├── pyproject.toml                  # Dependencies (uv)
│   ├── Dockerfile
│   └── .env
│
├── supabase/
│   └── migrations/                     # DB-Migrationen
├── docs/
└── claude.md
```

---

## Datenfluss: Magic Upload

```
1. User lädt PDF hoch
   └─ Browser → FastAPI POST /upload
              └─ Validierung (Typ, Größe)
              └─ Supabase Storage (privat, user-scoped)
              └─ documents Tabelle → status: "uploaded"

2. Extraktion startet (async)
   └─ FastAPI POST /extract (Background Task)
              └─ Mistral OCR: PDF → strukturierter Text
              └─ Claude claude-sonnet-4-6: Text → JSON (tool_use)
                   └─ Pydantic-Validierung der Antwort
                   └─ Extrahierte Felder + Confidence-Scores
              └─ Supabase: units/leases/tenants befüllen
              └─ documents.status → "extracted"

3. Review-Dialog
   └─ User sieht alle extrahierten Felder (Frontend)
   └─ Felder mit Confidence < 0.8 hervorgehoben
   └─ User korrigiert, bestätigt
   └─ FastAPI POST /extract/confirm → finale Daten gespeichert

4. Dashboard aktualisiert
   └─ Neue Einheit erscheint sofort im Portfolio
```

---

## Auth-Flow

```
Landing Page → /auth/register → Supabase Magic Link Email
                                   └─ /auth/callback → Dashboard

Frontend-Middleware (middleware.ts):
  - Öffentlich: /, /auth/*, 
  - Geschützt: /dashboard/* → Redirect zu /auth/login wenn kein JWT

Backend-Auth (FastAPI Dependency):
  - Jeder geschützte Endpoint prüft Supabase JWT im Authorization-Header
  - async def get_current_user(token: str = Depends(oauth2_scheme))
  - Ungültiger Token → 401 Unauthorized
  - Stripe Webhook: eigene Signatur-Prüfung, kein JWT
```

---

## Feature Gating (Subscription Tiers)

```python
# backend/app/core/config.py
PLAN_LIMITS: dict[str, int] = {
    "free": 1,
    "solo": 3,
    "pro": 10,
    "portfolio": 999_999,  # unbegrenzt
}

# Geprüft als FastAPI Dependency — nie im Frontend (umgehbar)
async def check_unit_limit(
    current_user: User = Depends(get_current_user),
    db: SupabaseClient = Depends(get_db),
) -> None:
    plan = current_user.subscription.plan
    limit = PLAN_LIMITS[plan]
    count = await db.count_units(current_user.id)
    if count >= limit:
        raise HTTPException(status_code=403, detail="unit_limit_reached")
```

---

## Environment Variables

```bash
# frontend/.env.local
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000   # FastAPI
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://eu.posthog.com
NEXT_PUBLIC_APP_URL=http://localhost:3000

# backend/.env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=    # Service Role für Backend-Zugriff
SUPABASE_JWT_SECRET=          # JWT-Validierung

ANTHROPIC_API_KEY=            # oder AWS Bedrock Credentials
MISTRAL_API_KEY=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

RESEND_API_KEY=

ENVIRONMENT=development       # development | production
```

---

## ADRs (Architecture Decision Records)

### ADR-001 | 2026-06-05 | Next.js App Router (nicht Pages Router)
**Entscheidung**: App Router  
**Begründung**: Server Components = weniger Client-Bundle, einfacheres Auth, bessere Performance. Zukunftssicher (Vercel's Focus).  
**Alternative**: Pages Router (stabiler, mehr Ressourcen) — abgelehnt wegen schlechterem Server-Component-Support

### ADR-002 | 2026-06-05 | Supabase statt eigene Postgres + separate Auth
**Entscheidung**: Supabase All-in-one  
**Begründung**: Speed to market. Auth, Postgres, Storage, Realtime, pgvector — fertig. EU Frankfurt verfügbar. RLS für DSGVO ideal.  
**Alternative**: PlanetScale + Clerk + S3 — zu viele Moving Parts für MVP

### ADR-003 | 2026-06-05 | Claude claude-sonnet-4-6 direkt (nicht via LangChain/Vercel AI SDK)
**Entscheidung**: Anthropic SDK direkt  
**Begründung**: Weniger Abstraktion = mehr Kontrolle bei Tool-Use und Streaming. Einfacher zu debuggen.  
**Alternative**: Vercel AI SDK — nützlich für Streaming-UI, kann later hinzugefügt werden

### ADR-004 | 2026-06-05 | Mistral OCR (nicht AWS Textract)
**Entscheidung**: Mistral OCR  
**Begründung**: Bessere Qualität bei handgeschriebenen Texten. Günstiger. Einfachere API.  
**Alternative**: AWS Textract Frankfurt — als Fallback implementieren

### ADR-005 | 2026-06-05 | FastAPI (Python) Backend + Next.js Frontend
**Entscheidung**: Getrennte Services — FastAPI Backend, Next.js Frontend  
**Begründung**: Python ist die natürlichste Sprache für AI/ML-Workloads (anthropic SDK, mistralai, pydantic, openpyxl). FastAPI + Pydantic bietet dieselbe Type-Safety wie TypeScript + Zod. Klare Trennung ermöglicht unabhängige Skalierung der AI-intensiven Backend-Workloads. Kein JS-Backend das in die Länge gezogen wird für Sachen wie Excel-Export oder komplexe Berechnungen.  
**Alternative**: Next.js Monorepo — einfacheres Setup, aber Python-AI-Libs sind klar überlegen für diesen Use Case
