# 📋 Aufgaben & Sprint-Tracking

> Format: `- [ ] Aufgabe [Prio: H/M/L] [Effort: XS/S/M/L/XL]`
> Status: `[ ]` offen | `[~]` in Arbeit | `[x]` fertig

---

## 🔥 In Progress

*(Sprint 4 — Monetarisierung)*

---

## ✅ Sprint 1 — Foundation (abgeschlossen)

- [x] Next.js 16 App + shadcn/ui + Supabase-Clients + `.env`-Setup
- [x] API-Client (`lib/api/client.ts`) mit Timeout-Handling
- [x] FastAPI Backend mit uv, Projektstruktur, Dockerfile
- [x] `core/config.py` mit pydantic-settings
- [x] Supabase: Projekt (EU Frankfurt), 12 Tabellen, RLS, Storage Bucket `documents`
- [x] Auth: Login/Register (Email+Passwort), Callback, `proxy.ts` Route-Guard
- [x] Backend: JWT-Validierung via Supabase JWKS (ES256 + HS256 Fallback)
- [x] Upload: Drag & Drop UI + `POST /upload` → Supabase Storage

---

## ✅ Sprint 2 — AI-Pipeline (abgeschlossen)

### OCR
- [x] `services/ocr/pipeline.py` — PyMuPDF direkter Text-Extrakt (digitale PDFs <100ms), Vision-LLM Fallback für Scans
- [x] Modell: `gemini-2.5-flash` für OCR (schnell, multimodal)

### AI-Extraktion
- [x] `models/extraction.py` — Pydantic v2 mit `ConfidenceField[T]`, `lease_terms`-Alias, alle Sub-Models
- [x] `services/ai/prompts/extract_lease.py` — Deutscher Prompt mit Mietrecht-Defaults, flexibel
- [x] `services/ai/extract.py` — OpenAI-kompatibler Proxy-Call, Pydantic-Validierung
- [x] `utils/deadline_generator.py` — Auto-Fristen (Staffelmiete, Indexmiete, Vertragsende, NK)
- [x] `routers/extract.py` — `POST /extract` + `POST /extract/confirm` (DB-Persistierung)
- [x] Plausibilitäts-Checks (NK, Kaution, Staffel-Chronologie)
- [x] Frontend: Extraction-Review-Dialog mit Confidence-Badges + Inline-Editing
- [x] Frontend: 3-Schritt-Flow Upload → Analyse → Prüfen
- [x] Modell optimiert: `gpt-5` → `gemini-2.5-flash` (3× schneller, 21/21 Felder)

### Test-Fixtures
- [x] `test-fixtures/mietvertrag_bauer_festmiete.txt`
- [x] `test-fixtures/mietvertrag_hoffmann_staffelmiete.txt`
- [x] `test-fixtures/mietvertrag_wagner_indexmiete.txt`

---

## ✅ Sprint 3 — Dashboard & UX (abgeschlossen)

### Backend: Data-Endpoints
- [x] `routers/units.py` — GET `/units`, GET `/units/kpis`, GET `/units/{id}`
- [x] `routers/units.py` — GET `/units/trackers` (Staffel- & Indexmiete-Alerts)
- [x] `routers/export.py` — GET `/export/excel` (openpyxl Multi-Sheet)
- [x] `routers/documents.py` — GET `/documents`, POST `/documents/upload`, GET `/documents/{id}/url`
- [x] `routers/deadlines.py` — GET `/deadlines` (alle Fristen mit Einheiten-Kontext)
- [ ] GET `/export/tax` — Steuer-Export Anlage V → **verschoben auf Phase 2**

### Frontend: Portfolio-Übersicht
- [x] Dashboard KPI-Cards mit echten Daten vom Backend
- [x] Einheiten-Cards (Adresse, Mieter, Betrag, Status-Badge)
- [x] Einheiten Listen-Ansicht (`/dashboard/units`) — filterbar nach Stadt, Mietart, Suche
- [x] Excel-Export Button

### Frontend: Einheiten-Detail
- [x] Prominenter Header (Adresse, Miete, Mieter, Mietstart)
- [x] Tab 1: Stammdaten (Objekt, Mieter, Vertrag)
- [x] Tab 2: Finanzielles (Miete, Kaution, €/m²)
- [x] Tab 3: Fristen (farbige Deadline-Badges)
- [x] Tab 4: Dokumente (Liste + Öffnen via signierter URL)
- [x] Tab 5: Rechts-Check (Placeholder für Phase 2)

### Frontend: Dokumente-Seite
- [x] `/dashboard/documents` — 9 Kategorien (Mietverträge, Übergabeprotokolle, etc.)
- [x] Filter: Freitext (Dateiname, Adresse, Mieter) + Stadt
- [x] Upload-Dialog: Drag & Drop, Dokumenttyp-Auswahl, Einheits-Zuordnung
- [x] Dokument-Vorschau via signierter Supabase-Storage-URL

### Frontend: Spezial-Features
- [x] Indexmiete-Tracker auf Dashboard ("Anpassung möglicherweise fällig")
- [x] Staffelmiete-Tracker auf Dashboard (nächste Stufe + Countdown)
- [x] Fristen-Kalender (`/dashboard/calendar`) — Monatsansicht mit farbigen Badges

---

## 📌 Sprint 4 — Monetarisierung
*Ziel: Stripe läuft, Tiers werden enforced*

### Backend
- [ ] `services/stripe.py` + `routers/stripe.py` — Checkout + Webhook [Prio: H] [Effort: M]
- [ ] `check_unit_limit` Dependency aktiv schalten [Prio: H] [Effort: S]

### Frontend
- [ ] Pricing-Seite / Upgrade-Modal [Prio: H] [Effort: M]
- [ ] Upgrade-Prompt wenn Einheiten-Limit erreicht [Prio: H] [Effort: S]
- [ ] Billing-Seite `settings/billing/page.tsx` [Prio: M] [Effort: M]

---

## 📌 Sprint 5 — Compliance & Polish
*Ziel: DSGVO-konform, launch-ready*

### DSGVO
- [ ] Datenschutzerklärung + AGB (statische Seiten) [Prio: H] [Effort: M]
- [ ] Cookie-Banner [Prio: M] [Effort: S]
- [ ] GET `/account/export` — ZIP aller User-Daten (Art. 20) [Prio: H] [Effort: M]
- [ ] DELETE `/account` — Account-Löschung mit Kaskade [Prio: H] [Effort: M]

### Performance & QA
- [ ] Mobile Responsive Check [Prio: H] [Effort: M]
- [ ] Error Monitoring (Sentry) [Prio: M] [Effort: S]
- [ ] PostHog Analytics [Prio: M] [Effort: S]
- [ ] pytest kritischer Pfad (OCR-Mock → Extraktion) [Prio: M] [Effort: L]

---

## 📌 Sprint 6 — Launch
- [ ] Domain konfigurieren [Prio: H] [Effort: XS]
- [ ] Vercel + Railway/Fly.io Production Deployment [Prio: H] [Effort: M]
- [ ] Resend Transaktions-Mails [Prio: H] [Effort: M]
- [ ] Landing Page / Waitlist [Prio: H] [Effort: L]
- [ ] Beta-User onboarden (5–10 reale Vermieter) [Prio: H] [Effort: M]

---

## 🧊 Backlog Phase 2 — Nach Launch

### Rechts-Check *(bewusst verschoben)*
- [ ] BGH-Urteils-Datenbank (Top 50 Klauseln als Pydantic-Models)
- [ ] Klausel-Analyse-Prompt + Risiko-Scoring
- [ ] `routers/legal_check.py` — POST `/legal-check`
- [ ] Frontend: Rechts-Check Panel (Tab 5 in Einheiten-Detail — Placeholder bereits vorhanden)

### Steuer-Export *(verschoben)*
- [ ] GET `/export/tax` — Steuer-Export Anlage V (openpyxl)

### Mietspiegel *(bewusst verschoben)*
- [ ] Mietspiegel-Daten Top-10-Städte in DB laden
- [ ] Vergleichs-Logik in `utils/rent_calculator.py`
- [ ] Frontend: Mietspiegel-Vergleich in Einheiten-Detail

### Weitere Phase-2-Features
- [ ] PSD2/FinAPI Bank-Anbindung
- [ ] OAuth E-Mail-Integration (Gmail/Outlook)
- [ ] Mahnwesen-Automatisierung
- [ ] Mieter-Kommunikation durch AI
- [ ] SCHUFA/Mieter-Screening
- [ ] Multi-User (Steuerberater-Zugang)
- [ ] Mobile App (React Native)
- [ ] Voice-Agenten
- [ ] Handwerker-Marketplace

---

## ✅ Done

- [x] 2026-06-05 — Projekt-Kontext erstellt (claude.md, README, docs/, tasks.md)
- [x] 2026-06-05 — Architektur auf FastAPI (Python) Backend umgestellt
- [x] 2026-06-05 — Sprint 1 abgeschlossen
- [x] 2026-06-07 — App-Name: Heimio. Design System erstellt + implementiert (DM Sans, Warm Green, Apple-Style)
- [x] 2026-06-10 — Sprint 2 abgeschlossen: AI-Pipeline live (Upload → OCR → Extraktion → Review → DB)
- [x] 2026-06-12 — AI-Pipeline optimiert: gemini-2.5-flash, 3× schneller, 21/21 Felder
- [x] 2026-06-12 — Rechts-Check + Mietspiegel auf Phase 2 verschoben
- [x] 2026-06-12 — Sprint 3 abgeschlossen: Dashboard, Einheiten-Listen, Kalender, Dokumente, Tracker
