# 📋 Aufgaben & Sprint-Tracking

> Format: `- [ ] Aufgabe [Prio: H/M/L] [Effort: XS/S/M/L/XL]`
> Status: `[ ]` offen | `[~]` in Arbeit | `[x]` fertig

---

## 🔥 In Progress

- [x] Supabase Projekt erstellen (EU Frankfurt) — vnzvxaljtvlzrlmdekpc

---

## 📌 Sprint 1 — Foundation (Wo 1–2)
*Ziel: Frontend + Backend laufen lokal, Auth funktioniert, Dokument kann hochgeladen werden*

### Frontend-Setup (Next.js)
- [x] Next.js 15 App initialisieren in `frontend/` (App Router, TypeScript, Tailwind)
- [x] shadcn/ui initialisieren + Basis-Komponenten installieren
- [x] Supabase Client-Integration (Browser-Client + Server-Client)
- [x] `frontend/.env.local` + `.env.example` anlegen
- [x] API-Client `frontend/src/lib/api/client.ts` — Fetch-Wrapper für FastAPI-Calls

### Backend-Setup (FastAPI / Python)
- [x] FastAPI App initialisieren in `backend/` mit uv
- [x] Projektstruktur anlegen (`routers/`, `services/`, `models/`, `core/`)
- [x] `pyproject.toml` mit Dependencies (fastapi, pydantic, anthropic, mistralai, supabase, stripe, openpyxl, python-multipart, python-dateutil)
- [x] `backend/app/core/config.py` — pydantic-settings mit allen Env-Vars
- [x] `backend/.env` + `.env.example` anlegen
- [x] Dockerfile für Backend
- [x] CORS-Konfiguration (Frontend-Origin erlauben)

### Supabase
- [x] Supabase Projekt erstellen (EU Frankfurt)
- [x] DB-Schema migrieren (12 Tabellen inkl. RLS — via SQL Editor)
- [x] Row Level Security (RLS) Policies für alle Tabellen
- [x] Supabase Storage Bucket `documents` (privat)

### Auth
- [x] Supabase Auth einrichten (Email + Magic Link aktiv, site URL konfiguriert)
- [x] Frontend: Login-Seite `(auth)/auth/login/page.tsx`
- [x] Frontend: Register-Seite `(auth)/auth/register/page.tsx`
- [x] Frontend: Auth-Callback Route `(auth)/auth/callback/route.ts`
- [x] Frontend: `proxy.ts` (Next.js 16, Route Protection — ersetzt middleware.ts)
- [x] Backend: JWT-Validierung `core/auth.py` — Supabase Token prüfen
- [x] Backend: `get_current_user` FastAPI Dependency
- [x] Frontend: Dashboard Shell mit Sidebar

### Upload
- [x] Frontend: Dokument-Upload UI (Drag & Drop, PDF/Bild) — `components/documents/upload-dropzone.tsx`
- [x] Backend: `routers/upload.py` — POST `/upload` (Datei → Supabase Storage)
- [x] Backend: Datei-Validierung (Typ: PDF/JPG/PNG, max 20 MB)

---

## 📌 Sprint 2 — AI-Pipeline (Wo 3–5)
*Ziel: Mietvertrag hochladen → strukturierte Daten mit Confidence-Scores*

### OCR (Python)
- [ ] Backend: `services/ocr/mistral.py` — Mistral OCR Client (async) [Prio: H] [Effort: S]
- [ ] Backend: `services/ocr/pipeline.py` — PDF → Seiten-Text zusammenfügen [Prio: H] [Effort: M]
- [ ] Backend: Fallback auf AWS Textract (bei Mistral-Ausfall) [Prio: M] [Effort: M]

### AI-Extraktion (Python)
- [ ] Backend: `models/extraction.py` — Pydantic-Models (ExtractionResult, ConfidenceField[T], alle Sub-Models) [Prio: H] [Effort: M]
- [ ] Backend: `services/ai/prompts/extract_lease.py` — System-Prompt + User-Prompt-Builder [Prio: H] [Effort: L]
- [ ] Backend: `services/ai/extract.py` — Claude-Call via `anthropic.AsyncAnthropic`, tool_use, Pydantic-Validierung [Prio: H] [Effort: M]
- [ ] Backend: `utils/deadline_generator.py` — Auto-Fristen aus ExtractionResult [Prio: H] [Effort: M]
- [ ] Backend: `routers/extract.py` — POST `/extract` (Background Task: OCR + Claude) + POST `/extract/confirm` [Prio: H] [Effort: M]
- [ ] Backend: Plausibilitäts-Checks (NK ≤ 50% Kaltmiete, Kaution ≤ 3 MM, Staffel-Chronologie) [Prio: H] [Effort: S]
- [ ] Frontend: Korrekturdialog `components/documents/extraction-review.tsx` (Low-Confidence Felder hervorheben) [Prio: H] [Effort: L]
- [ ] Frontend: Confidence-Badge-Komponente (grün/gelb/rot) [Prio: H] [Effort: S]

### Rechts-Check (Python)
- [ ] Backend: `services/ai/legal_database.py` — BGH-Urteils-Datenbank Top 50 als Pydantic-Models [Prio: H] [Effort: L]
- [ ] Backend: `services/ai/prompts/legal_analysis.py` — Klausel-Analyse-Prompt [Prio: H] [Effort: M]
- [ ] Backend: `services/ai/legal_check.py` — Claude-Call für Rechts-Check, Risiko-Scoring [Prio: H] [Effort: M]
- [ ] Backend: `routers/legal_check.py` — POST `/legal-check` [Prio: H] [Effort: S]
- [ ] Frontend: Rechts-Check UI `components/units/legal-check-panel.tsx` [Prio: H] [Effort: M]

### Mietspiegel (Python)
- [ ] Backend: Mietspiegel-Daten Top-10-Städte als JSON-Fixture in DB laden [Prio: M] [Effort: L]
- [ ] Backend: Vergleichs-Logik in `utils/rent_calculator.py` (Wohnfläche + Lage + Baujahr) [Prio: M] [Effort: M]

---

## 📌 Sprint 3 — Dashboard & UX (Wo 6–7)
*Ziel: Vollständiges Dashboard mit allen Views*

### Backend: Data-Endpoints (Python)
- [ ] Backend: `routers/units.py` — CRUD für Properties, Units, Leases, Tenants [Prio: H] [Effort: M]
- [ ] Backend: Portfolio-KPIs Endpoint (GET `/portfolio/kpis`) [Prio: H] [Effort: S]
- [ ] Backend: `routers/export.py` — GET `/export/excel` (openpyxl Multi-Sheet) [Prio: H] [Effort: M]
- [ ] Backend: Steuer-Export Anlage V (GET `/export/tax`) [Prio: M] [Effort: L]

### Frontend: Portfolio-Übersicht
- [ ] KPI-Cards (Gesamt-Kaltmiete, Anzahl Einheiten, ⌀ €/m², Vakanz-Rate) [Prio: H] [Effort: M]
- [ ] Listen-Ansicht aller Einheiten [Prio: H] [Effort: M]
- [ ] Karten-Ansicht (Mapbox oder Google Maps, Geocoding via API) [Prio: M] [Effort: L]

### Frontend: Einheiten-Detail (5 Tabs)
- [ ] Tab 1: Stammdaten + Dokumente [Prio: H] [Effort: M]
- [ ] Tab 2: Mieter-Informationen [Prio: H] [Effort: S]
- [ ] Tab 3: Finanzielles + Mietverlauf-Chart [Prio: H] [Effort: M]
- [ ] Tab 4: Termine & Fristen [Prio: H] [Effort: M]
- [ ] Tab 5: Rechts-Check [Prio: H] [Effort: S]

### Frontend: Spezial-Features
- [ ] Indexmiete-Tracker ("Du verschenkst X€/Monat") — Daten vom Backend [Prio: H] [Effort: M]
- [ ] Staffelmiete-Tracker mit nächster Stufe — Daten vom Backend [Prio: H] [Effort: M]
- [ ] Fristen-Kalender (monatliche Ansicht) [Prio: M] [Effort: M]
- [ ] Excel-Export Button (ruft Backend `/export/excel` auf) [Prio: H] [Effort: S]
- [ ] Steuer-Export Button (ruft Backend `/export/tax` auf) [Prio: M] [Effort: S]

---

## 📌 Sprint 4 — Monetarisierung (Wo 8–9)
*Ziel: Stripe läuft, Tiers werden enforced*

### Backend (Python)
- [ ] Backend: `services/stripe.py` — Stripe Python SDK Setup [Prio: H] [Effort: S]
- [ ] Backend: `routers/stripe.py` — POST `/stripe/checkout` (Checkout Session) [Prio: H] [Effort: M]
- [ ] Backend: POST `/stripe/webhook` — Subscription-Events verarbeiten, `user_subscriptions` updaten [Prio: H] [Effort: M]
- [ ] Backend: `check_unit_limit` FastAPI Dependency — Tier-Enforcement [Prio: H] [Effort: M]
- [ ] Backend: `PLAN_LIMITS` Dict in `core/config.py` (free:1, solo:3, pro:10, portfolio:∞) [Prio: H] [Effort: XS]

### Frontend
- [ ] Stripe Produkte + Preise anlegen (4 Tiers + 4 Add-Ons) im Stripe Dashboard [Prio: H] [Effort: S]
- [ ] Frontend: Pricing-Seite / Upgrade-Modal [Prio: H] [Effort: M]
- [ ] Frontend: Upgrade-Prompts (wenn Einheiten-Limit erreicht) [Prio: H] [Effort: S]
- [ ] Frontend: Billing-Seite `settings/billing/page.tsx` [Prio: M] [Effort: M]
- [ ] Frontend: Freemium-Flow (1 Einheit kostenlos, dann Paywall) [Prio: H] [Effort: M]

---

## 📌 Sprint 5 — Compliance & Polish (Wo 10–11)
*Ziel: DSGVO-konform, performant, launch-ready*

### DSGVO
- [ ] Frontend: Datenschutzerklärung (statische Seite) [Prio: H] [Effort: M]
- [ ] Frontend: AGB (statische Seite) [Prio: H] [Effort: M]
- [ ] Frontend: Cookie-Banner [Prio: M] [Effort: S]
- [ ] Backend: AVV-Template (PDF-Response bei Registration) [Prio: H] [Effort: S]
- [ ] Backend: GET `/account/export` — ZIP aller User-Daten (Art. 20 DSGVO) [Prio: H] [Effort: M]
- [ ] Backend: DELETE `/account` — Account-Löschung mit Kaskade [Prio: H] [Effort: M]

### Performance & QA
- [ ] Frontend: Lighthouse Score > 90 (Core Web Vitals) [Prio: M] [Effort: M]
- [ ] Frontend: Mobile Responsive Check (alle Screens) [Prio: H] [Effort: M]
- [ ] Frontend + Backend: Error Monitoring (Sentry) [Prio: M] [Effort: S]
- [ ] Frontend: PostHog Analytics Setup [Prio: M] [Effort: S]
- [ ] Backend: pytest Tests für kritischen Pfad (OCR-Mock → Extraktion → Validierung) [Prio: M] [Effort: L]
- [ ] E2E Test (Playwright): Upload → Extraktion → Dashboard erscheint [Prio: M] [Effort: L]

---

## 📌 Sprint 6 — Launch (Wo 12)
- [ ] Domain konfigurieren [Prio: H] [Effort: XS]
- [ ] Frontend: Vercel Production Deployment [Prio: H] [Effort: S]
- [ ] Backend: Railway/Fly.io Production Deployment (Docker) [Prio: H] [Effort: M]
- [ ] Backend: Resend Integration — Transaktions-Mails (Willkommen, Magic Link Custom Template) [Prio: H] [Effort: M]
- [ ] Frontend: Waitlist / Beta-Anmeldungs-Seite (Landing Page) [Prio: H] [Effort: L]
- [ ] Beta-User onboarden (5–10 reale Vermieter) [Prio: H] [Effort: M]

---

## 🧊 Backlog (Phase 2+)

- [ ] PSD2/FinAPI Bank-Anbindung
- [ ] OAuth E-Mail-Integration (Gmail/Outlook)
- [ ] Mahnwesen-Automatisierung
- [ ] Mieter-Kommunikation durch AI
- [ ] SCHUFA/Mieter-Screening
- [ ] Multi-User (Steuerberater-Zugang)
- [ ] Mobile App (React Native)
- [ ] Voice-Agenten
- [ ] Handwerker-Marketplace
- [ ] Versicherungs-Provisions-Modell

---

## ✅ Done

- [x] 2026-06-05 — Projekt-Kontext erstellt (claude.md, README, docs/, tasks.md)
- [x] 2026-06-05 — Architektur auf FastAPI (Python) Backend umgestellt
- [x] 2026-06-05 — Sprint 1 abgeschlossen: Frontend (Next.js 16) + Backend (FastAPI) + Supabase (12 Tabellen, Auth, Storage) laufen lokal
