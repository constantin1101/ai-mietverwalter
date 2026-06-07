# 🏠 Heimio

> **"Foto vom Mietvertrag. 5 Minuten. Fertiges Dashboard."**

AI-natives Property-Management-SaaS für private Vermieter in Deutschland.
Wir demokratisieren professionelle Immobilienverwaltung durch autonome AI-Agenten.

---

## Was ist das?

Private Vermieter verbringen im Schnitt 250 Stunden/Jahr mit Verwaltungs-Aufwand — Fristen im Blick behalten, Indexmieten anpassen, Klauseln prüfen, Steuer vorbereiten.

**Heimio** löst das: Einen Mietvertrag hochladen → AI extrahiert alle Daten → Dashboard mit allen KPIs, Fristen, Rechts-Check und Steuer-Vorbereitung ist sofort fertig.

---

## Features (MVP)

| Feature | Beschreibung |
|---------|-------------|
| 🪄 **Magic Upload** | PDF oder Scan → AI extrahiert alle Vertragsdaten in 60s |
| 📊 **Portfolio-Dashboard** | Alle Einheiten, KPIs, Karten-Ansicht auf einen Blick |
| ⚖️ **Rechts-Check** | AI analysiert Klauseln, referenziert BGH-Urteile |
| 📈 **Mieten-Tracker** | Indexmiete & Staffelmiete — kein verschenktes Geld mehr |
| 📅 **Fristen-Kalender** | Alle Termine automatisch erkannt und getrackt |
| 📋 **Steuer-Vorbereitung** | Anlage V als PDF/Excel auf Knopfdruck |
| 📁 **Dokument-Verwaltung** | OCR, KI-Verschlagwortung, Volltext-Suche |
| 📤 **Excel-Export** | Jederzeit alle Daten raus — Trust-Anker |

---

## Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes
- **Datenbank / Auth / Storage**: Supabase (EU Frankfurt)
- **AI**: Claude claude-sonnet-4-6 (Anthropic / AWS Bedrock EU)
- **OCR**: Mistral OCR
- **Payments**: Stripe
- **Hosting**: Vercel

Vollständiger Stack → [docs/architecture.md](docs/architecture.md)

---

## Projekt-Struktur

```
ai-mietverwalter/
├── claude.md              # Claude Code Instruktionen
├── docs/
│   ├── product-vision.md  # Produkt-Spec & Business Case
│   ├── architecture.md    # Technische Architektur & ADRs
│   ├── data-model.md      # Datenbank-Schema
│   └── ai-pipeline.md     # AI-Extraktions-Pipeline
├── .claude/
│   └── tasks.md           # Aufgaben & Sprint-Tracking
└── src/                   # Next.js App (nach Setup)
```

---

## Pricing

| Tier | Preis | Einheiten |
|------|-------|-----------|
| Free Forever | 0 € | 1 |
| Solo | 4,90 €/Monat | 3 |
| Pro | 12,90 €/Monat | 10 |
| Portfolio | 24,90 €/Monat | ∞ |

Add-Ons: Mieterhöhungs-Schreiben (19 €), NK-Abrechnung (29 €), Anwalts-Review (89 €)

---

## Roadmap

**Phase 1 — MVP (12 Wochen)**
- [ ] Foundation: Auth, Upload, Datenmodell (Wo 1–2)
- [ ] AI-Pipeline: Extraktion, Rechts-Check, Mietspiegel (Wo 3–5)
- [ ] Dashboard & UX (Wo 6–7)
- [ ] Monetarisierung: Stripe, Tiers, Add-Ons (Wo 8–9)
- [ ] Compliance & Polish: DSGVO, AGB, Performance (Wo 10–11)
- [ ] Soft Launch + Public Launch (Wo 12)

**Phase 2** — Bank-Anbindung (PSD2), E-Mail-Integration, Mahnwesen

**Phase 3** — Voice-Agenten, Handwerker-Marketplace

---

## Compliance

- ✅ EU-Hosting (Frankfurt)
- ✅ DSGVO by Design
- ✅ Datenexport (Art. 20 DSGVO)
- ✅ AVV-Template für Nutzer
- ✅ Keine Mieterdaten an US-Services

---

## Status

🚧 **In Entwicklung** — Aktueller Stand: Kontext & Architektur-Setup

Aufgaben & Sprint → [.claude/tasks.md](.claude/tasks.md)
