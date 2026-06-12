# 📋 Aufgaben & Sprint-Tracking

> Format: `- [ ] Aufgabe [Prio: H/M/L] [Effort: XS/S/M/L/XL]`
> Status: `[ ]` offen | `[~]` in Arbeit | `[x]` fertig

---

## 🔥 In Progress

*(Sprint 5 — Monetarisierung)*

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

## 📌 Sprint 4 — Mietspiegel & Excel-Export
*Ziel: Marktvergleich für alle Einheiten + professioneller Steuerberater-tauglicher Export*

### Mietspiegel — Datenbasis

- [x] **Daten kuratieren**: `backend/app/data/mietspiegel.json` — Angebotsmieten für 12 Städte (München, Berlin, Hamburg, Frankfurt, Stuttgart, Düsseldorf, Köln, Nürnberg, Leipzig, Dresden, Hannover, Bremen). 5 Flächenbänder × {min, avg, max} €/m², data_year 2024, source ImmobilienScout24/Empirica [Prio: H] [Effort: M]

- [ ] **DB-Migration 0008**: Optionale Tabelle `mietspiegel_overrides` — erlaubt Admin-Korrekturen ohne Code-Deploy [Prio: L] [Effort: S]

### Mietspiegel — Backend

- [x] `utils/rent_calculator.py` — `get_market_comparison(city, area_sqm)`, `get_city_data(city)`, `get_supported_cities()` [Prio: H] [Effort: S]

- [x] `routers/mietspiegel.py` — `GET /mietspiegel/cities`, `GET /mietspiegel/{city}`, `GET /mietspiegel/{city}/lookup` (keine Auth nötig) [Prio: H] [Effort: M]

- [ ] `GET /portfolio/mietspiegel` — Batch-Vergleich aller Einheiten des Users gegen Marktdaten. Aggregat: `{units_below_market, total_potential_increase_monthly}` [Prio: M] [Effort: M]

- [ ] `routers/units.py` — `GET /units/kpis` um `units_below_market_count` und `monthly_potential` ergänzen [Prio: M] [Effort: XS]

### Mietspiegel — Frontend

- [x] **Typen**: `MietspiegelBand`, `CityMietspiegel`, `MarketComparison` in `frontend/src/types/api.ts` [Prio: H] [Effort: XS]

- [x] **Neue Seite `/dashboard/mietspiegel`**: Stadt-Selektor + Tabelle mit min/avg/max pro Flächenband, visueller Positionsbalken, KPI-Cards oben, Disclaimer-Box. Sidebar-Link "Marktmieten" [Prio: H] [Effort: M]

- [x] **Dashboard-Widget** `components/mietspiegel-widget.tsx`: Kompakte Karte mit Stadt-Dropdown, Ø-Wert für 40–60 m², Mini-Balken für alle Bänder, Link zur vollen Seite [Prio: H] [Effort: S]

- [x] **Einheiten-Detail, Tab Finanzen**: Mietspiegel-Card unterhalb der Miete — aktueller €/m² vs. Markt-Ø, Positionsbalken, Badge ("Unter/Im/Über Marktniveau") [Prio: M] [Effort: M]

- [x] **Portfolio-Marktvergleich**: `/dashboard/mietspiegel` Tab "Mein Portfolio" — Ranking aller Einheiten mit Positionsbalken (min/avg/max), Bucket-Filter-Pills, Sortierung nach Potenzial/Abweichung/Adresse [Prio: M] [Effort: M]

- [x] **Dashboard KPI-Card "Marktpotenzial"**: Amber wenn Einheiten unter Markt, Link zu gefilterter Einheitenliste [Prio: M] [Effort: S]

- [x] **Units-Liste Marktlage-Spalte**: Badge + Delta % je Einheit, Filter-Dropdown "Alle Marktlagen" [Prio: M] [Effort: S]

- [x] **Einheiten bearbeiten**: `PATCH /units/{id}` + `UnitEditDialog` (4-Tab-Formular + Diff-Review-Schritt) [Prio: H] [Effort: L]

- [ ] **DB-Migration 0008**: Optionale Tabelle `mietspiegel_overrides` [Prio: L] [Effort: S]

- [ ] `routers/units.py` — `GET /units/kpis` um `units_below_market_count` und `monthly_potential` ergänzen [Prio: M] [Effort: XS]

---

### Excel-Export — Redesign

- [x] **ADR**: Bestehende `routers/export.py` ersetzen statt neue Datei. openpyxl bleibt, Struktur komplett neu. Ziel: Steuerberater-tauglicher, vollständiger Überblick [Prio: H] [Effort: XS]

- [x] **Sheet 1 — Deckblatt**: Heimio-Logo (PNG eingebettet), Export-Datum, Zeitraum-Filter (falls angewendet), KPI-Zusammenfassung (Einheiten, Gesamtmiete, Fristen, Leerstand), Kontakt-Hinweis "Erstellt mit Heimio" [Prio: M] [Effort: S]

- [x] **Sheet 2 — Portfolio-Übersicht**: Eine Zeile pro Einheit. Spalten: Adresse, Einheit-Nr., Stadt, PLZ, Mieter (Hauptmieter), Kaltmiete, Betriebskosten VP, Warmmiete, Kaution, €/m², Zimmer, Fläche (m²), Mietart, Mietbeginn, Laufzeit/Ende, Kündigungsfrist, Mietspiegel-Bucket (falls verfügbar). Summenzeile: Gesamtkaltmiete, Gesamtwarmmiete [Prio: H] [Effort: M]

- [x] **Sheet 3 — Mietverträge**: Ein Datensatz pro Lease. Alle Vertragsfelder: Mietbeginn, Vertragsende, Befristet (Ja/Nein), Kündigungsfrist, Zahlungstag, Zahlungsweise, Haustiere, Untermiete, Schönheitsreparaturen-Klausel, Indexmiete-Parameter (Typ, Basiswert, Basisdatum, Intervall), Extraktions-Konfidenz [Prio: H] [Effort: M]

- [x] **Sheet 4 — Mieter**: Pro Mieter: Vorname, Nachname, E-Mail, Telefon, Einheit (Adresse), Rolle (Haupt-/Mitmieter), Mietbeginn, Kaution [Prio: H] [Effort: S]

- [x] **Sheet 5 — Finanzen**: Pro Einheit + Monat (rollierendes 12-Monats-Fenster): Kaltmiete IST, Betriebskosten VP, Warmmiete, sowie Jahressummen. Zusatz-Zeilen: Staffelmiete-Stufen (zukünftige Erhöhungen), Indexmiete-Basis. Pivot-ähnliche Ansicht nach Jahr/Monat [Prio: H] [Effort: L]

- [x] **Sheet 6 — Fristen & Termine**: Alle offenen Fristen. Spalten: Titel, Fälligkeitsdatum, Typ (deutsch), Einheit, Mieter, Tage bis Fälligkeit, Status. Conditional Formatting: überfällig = rot, ≤14 Tage = orange, ≤30 Tage = gelb [Prio: H] [Effort: M]

- [x] **Sheet 7 — Mietentwicklung**: Alle `rent_adjustments` + zukünftige Staffel-Stufen. Spalten: Einheit, Mieter, Typ (Staffel/Index/Manual), Gültig ab, Alte Miete, Neue Miete, Veränderung (+€ / +%), Anschreiben verschickt. Separate Zeilen für Ist-Verlauf und Prognose. Conditional Formatting: Zukunft = hellblau hinterlegt [Prio: H] [Effort: M]

- [x] **Sheet 8 — Dokumente**: Alle Dokumente mit: Dateiname, Typ (deutsch), Einheit, Mieter, Hochgeladen am, Dateigröße, Status. Hyperlink auf Supabase-Signed-URL (60-Tage-Gültigkeit für Export) [Prio: M] [Effort: M]

- [x] **Formatierung** (alle Sheets): Frozen Panes (erste 2 Zeilen), Spaltenbreiten auto-fit (max 45 Zeichen), Header-Zeile dunkel (#1C2B3A) mit weißer Fett-Schrift, alternierende Zeilenfarben (#FFFFFF / #F9F9F7), Währungsformat `#.##0,00 €`, Datumsformat `TT.MM.JJJJ`, Tab-Farben pro Sheet, Sheet-Reihenfolge wie oben [Prio: H] [Effort: M]

- [x] **Export-Dialog Frontend**: Ersetzt einfachen Button. Optionen: Alle Daten / Zeitraum wählen (Von–Bis für Finanzen & Fristen), Einheiten-Filter (alle / einzelne Stadt auswählen). Zeigt Ladeindikator. Dateiname: `heimio-export-YYYY-MM-DD.xlsx` [Prio: M] [Effort: M]

- [x] **Export-Endpunkt erweitern**: `GET /export/excel` akzeptiert Query-Parameter: `date_from`, `date_to` (ISO), `city` (optional). Filtert Fristen und Finanzen-Sheet entsprechend [Prio: M] [Effort: S]

---

## 📌 Sprint 5 — Monetarisierung
*Ziel: Stripe läuft, Tiers werden enforced*

### Backend
- [ ] `services/stripe.py` + `routers/stripe.py` — Checkout + Webhook [Prio: H] [Effort: M]
- [ ] `check_unit_limit` Dependency aktiv schalten [Prio: H] [Effort: S]

### Frontend
- [ ] Pricing-Seite / Upgrade-Modal [Prio: H] [Effort: M]
- [ ] Upgrade-Prompt wenn Einheiten-Limit erreicht [Prio: H] [Effort: S]
- [ ] Billing-Seite `settings/billing/page.tsx` [Prio: M] [Effort: M]

---

## 📌 Sprint 6 — Compliance & Polish
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

## 📌 Sprint 7 — Launch
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
- [x] 2026-06-12 — Excel-Export Redesign: 8-Sheet Workbook (Deckblatt, Portfolio, Mietverträge, Mieter, Finanzen, Fristen, Mietentwicklung, Dokumente) + ExportDialog mit Filtern
- [x] 2026-06-12 — Mietspiegel Feature: Daten 12 Städte, Backend-API, Seite /dashboard/mietspiegel + Dashboard-Widget
- [x] 2026-06-12 — Marktvergleich an 3 UI-Stellen: Unit-Detail Finanzen-Tab, Units-Liste Spalte, Dashboard KPI-Card
- [x] 2026-06-12 — Portfolio-Marktvergleich: /dashboard/mietspiegel Tab "Mein Portfolio" mit visuellem Ranking aller Einheiten
- [x] 2026-06-12 — Einheiten bearbeiten: PATCH /units/{id} + UnitEditDialog (4-Tab + Diff-Review)
