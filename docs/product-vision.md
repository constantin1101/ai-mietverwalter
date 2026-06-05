# 🏠 Produkt-Vision: AI-Native Property Management

## Vision

**Jeder Vermieter — vom Erstkäufer bis zum Portfolio-Halter — verdient einen persönlichen Hausverwalter, der nie schläft, alles weiß und einen Bruchteil dessen kostet, was traditionelle Verwaltung kostet.**

Wir demokratisieren professionelle Immobilienverwaltung durch AI-Agenten und schaffen damit das, was bisher nur institutionellen Investoren oder Family Offices vorbehalten war: **echte Verwaltungs-Exzellenz auf Knopfdruck**.

## Mission

Wir befreien private Vermieter von der ätzenden Bürokratie, die ihnen das Eigentum vermiest. Mit AI-Agenten, die Verträge verstehen, Fristen wahren, Mahnungen schreiben und Mieter-Anfragen beantworten — verwandeln wir 250 Stunden Verwaltungs-Frust pro Jahr in 5 Minuten Setup und einen Klick.

**Unser Versprechen**: Lade einen Mietvertrag hoch — und in 3 Minuten verwaltet sich deine Wohnung quasi selbst.

---

## Wettbewerbspositionierung

| Bestehende Tools | AI-Mietverwalter |
|------------------|-----------------|
| Digitalisierte Formulare | Autonome Agenten |
| 30–60 Min. Setup pro Einheit | 3 Min. für gesamtes Portfolio |
| „Software hilft mir, etwas zu tun" | „Software erledigt es für mich" |
| Manuelle Eingabe | AI-Extraktion aus Dokumenten |
| Statische Datenbank | Aktiver Co-Pilot mit Empfehlungen |

**Bestehende Konkurrenten**: Immoware24, Verwalter-Software, Excel (!)
**Unser Moat**: Magic Onboarding + autonome Agenten (kein Konkurrent hat das)

---

## Zielgruppe

### Beachhead-Markt: Private Klein- bis Mittel-Vermieter Deutschland
- **Größe**: 3,9 Mio. private Vermieter mit 1–10 Einheiten
- **Sweet Spot**: Vermieter mit 3–10 Einheiten
- **Hauptpain-Points**:
  1. Verwaltungs-Zeitaufwand (~250h/Jahr)
  2. Rechtliche Komplexität (Klauseln, Kündigungsfristen, DSGVO)
  3. Verpasste Einnahmen (Mieterhöhungen nicht erkannt, Indexmiete vergessen)
  4. Steuer-Chaos (Anlage V, Abschreibungen, Belege)
- **Heute**: Excel + Steuerberater + Anwalt = teuer, fragmentiert, nervig

### Markt-Größe
- Deutschland: 3–7 Mrd. €/Jahr
- EU/DACH: 15–30 Mrd. €/Jahr

---

## MVP Scope

### ✅ Im MVP

#### Kern-Funktionalität: „Magic Upload"
- Mietvertrag-Upload (PDF, gescannt oder digital)
- AI-Extraktion aller relevanten Vertragsdaten:
  - Stammdaten Objekt (Adresse, Wohnfläche, Zimmer, Stellplatz)
  - Mieter-Daten (Name, Kontakt, Personenanzahl)
  - Finanzielle Konditionen (Kaltmiete, NK, Kaution, Zahlungsweise)
  - Vertragslaufzeit (befristet/unbefristet, Kündigungsfristen)
  - Sondervereinbarungen (Tierhaltung, Schönheitsreparaturen, etc.)
  - Staffel- und Indexmiete inkl. Stufen und Basiswerte
- Confidence-Scores mit Korrektur-Möglichkeit

#### Dashboard
- Portfolio-Übersicht mit KPIs (Gesamt-Miete, Anzahl Einheiten, ⌀ €/m²)
- Listen-Ansicht aller Wohnungen
- Karten-Ansicht (Geocoding der Adressen)
- Detail-View pro Wohneinheit mit 5 Tabs:
  - Stammdaten + Dokumente
  - Mieter
  - Finanzielles + Mietverlauf-Chart
  - Termine & Fristen
  - Rechts-Check

#### Der „Wow"-Mehrwert
- **Rechts-Check** mit AI-Klausel-Analyse
  - Identifikation problematischer Klauseln
  - BGH-Urteils-Referenzen (Top-50-Datenbank)
  - Risiko-Bewertung pro Klausel (hoch/mittel/niedrig)
- **Indexmiete-/Staffelmiete-Tracker**
  - „Du verschenkst seit 18 Monaten 240€/Monat"
- **Mietspiegel-Vergleich** für Top-10-Städte
- **Termin-Kalender** mit allen Fristen
- **Steuer-Vorbereitung** (Anlage V als PDF/Excel)

#### Dokumenten-Management
- Multi-Upload: Mietverträge, Energieausweise, Übergabeprotokolle, Versicherungspolicen, Handwerker-Rechnungen
- AI-Verschlagwortung und Volltext-Suche
- OCR auch für Scans

#### Excel-Export (Trust-Anker)
- Multi-Sheet-Workbook: Übersicht, Objekte, Mieter, Mietverlauf, Termine, Rechts-Check, Steuer

#### Compliance
- EU-gehostet (Frankfurt)
- DSGVO-konformes Design
- Datenexport (Art. 20)
- Account-Löschung mit Kaskade
- AVV-Template

### ❌ Nicht im MVP (bewusst ausgeschlossen)

- Bank-Konto-Anbindung (PSD2/FinAPI) → Phase 2
- E-Mail-Integration (OAuth Gmail/Outlook) → Phase 2
- Voice-Agenten → Phase 3
- Mieter-Kommunikation durch AI → Phase 2–3
- Mahnwesen-Automatisierung → Phase 2
- Mieter-Screening / SCHUFA-Anbindung → Phase 2
- Handwerker-Marketplace → Phase 3
- Versicherungs-/Energie-Provisions-Modell → Phase 3
- Multi-User / Steuerberater-Zugang → Phase 2
- Mobile App (nur Mobile-Web responsive) → Phase 2

---

## Pricing-Modell

| Tier | Preis | Einheiten | Zielgruppe |
|------|-------|-----------|------------|
| **Free Forever** | 0 € | 1 | Akquise, Word-of-Mouth |
| **Solo** | 4,90 €/Mo oder 49 €/Jahr | 3 | Klein-Vermieter (70% des Marktes) |
| **Pro** | 12,90 €/Mo oder 129 €/Jahr | 10 | Sweet Spot — Profitabilitäts-Treiber |
| **Portfolio** | 24,90 €/Mo oder 249 €/Jahr | ∞ | Power-User |

### One-Time Add-Ons (auch für Free-User)
| Add-On | Preis |
|--------|-------|
| Rechtssicheres Mieterhöhungs-Schreiben | 19 € |
| NK-Abrechnung-Generator pro Einheit | 29 € |
| Premium-Rechts-Check | 9 € |
| Anwalts-Review (echter Anwalt, 48h) | 89 € |

**Erwartete Conversion**: 5–10% Free → Paid | Blended ARPU: ~80–120 €/Jahr

---

## Unit Economics

### Pro Kunde (gemischtes Tier)
- Revenue: ~80–120 €/Jahr (Subscription) + Add-Ons
- AI-Kosten: 15–30 €/Jahr
- Hosting/Storage/Tools: 5–10 €/Jahr
- **Gross Margin: ~75–85%**

### Break-Even
- ~2.500–3.500 zahlende Kunden (ohne Personalkosten, Solo-Founder)
- ~5.000 Kunden = 400–600k ARR

---

## Strategische Säulen

### 1. AI-Native Architektur
Agenten-basiertes System statt monolithischer SaaS. Jeder Workflow ist ein autonomer Agent: Posteingang, Voice, Mahnwesen, Compliance, Buchhaltung.

### 2. Magic Onboarding
Aus einem Dokument-Upload entsteht das vollständige Verständnis des Portfolios. Kein Formular-Ausfüllen.

### 3. Trust-First Design
Excel-Export jederzeit möglich. EU-gehostet. DSGVO by Design. Nutzer kann jederzeit gehen — paradoxerweise bleiben mehr.

### 4. Schwungrad durch Daten
Jede Interaktion macht die AI besser: bessere Klausel-Erkennung, treffendere Mahnformulierungen, präzisere Mietspiegel-Daten.

---

## 12-Wochen-Roadmap

| Wochen | Phase | Deliverables |
|--------|-------|-------------|
| 1–2 | Foundation | Auth, Upload, Datenmodell, Basis-UI |
| 3–5 | AI-Pipeline | Extraktion, Rechts-Check, Mietspiegel |
| 6–7 | Dashboard & UX | Alle Views, Charts, Export |
| 8–9 | Monetarisierung | Stripe, Tiers, Add-Ons, Paywalls |
| 10–11 | Compliance & Polish | DSGVO, AGB, Performance, Tests |
| 12 | Launch | Soft Launch, Beta-User, Public |

---

## Initial-Investment (Schätzung)

| Position | Kosten |
|----------|--------|
| Entwicklung (12 Wochen, solo) | 0–30k € (eigene Zeit) |
| Freelancer (optional) | 15–30k € |
| Legal (AGB, Datenschutz, AVV) | 2–4k € |
| Tools & Infrastruktur (3 Monate) | 1–2k € |
| Marketing-Vorbereitung | 2–5k € |
| **Total** | **20–70k €** |
