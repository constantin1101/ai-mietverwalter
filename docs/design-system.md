# 🎨 Design System — Heimio

**Status**: v1.0 — Approved  
**Erstellt**: 2026-06-05  
**Philosophie**: Apple-inspired · Content-first · Endlich alles im Griff

---

## Design-Prinzipien

### 1. Kontrolle durch Klarheit
Jeder Nutzer soll beim Öffnen sofort wissen, wo er steht. Kein Rätseln, kein Suchen. Die wichtigsten Zahlen sieht man ohne zu scrollen.

### 2. Weniger ist mehr — aber nicht weniger Information
Whitespace ist kein leerer Raum, er ist Struktur. Inhalte atmen. Aber auf dem Dashboard fehlt nie eine wichtige Zahl.

### 3. Proaktiv, nicht reaktiv
Das Interface spricht den Nutzer an — "Du verschenkst 240€/Monat" — bevor er selbst suchen muss. Wie ein guter Hausverwalter.

### 4. Apple-Vertrautheit, SaaS-Power
Rundungen, Schatten, sanfte Übergänge wie iOS. Aber die Informationsdichte und Tabellen-Power eines professionellen Tools.

---

## Farben

### Primärpalette

```
Background:    #FAFAF9   (warm-white — kein reines Weiß)
Surface:       #FFFFFF   (Karten, Panels)
Border:        #E7E5E4   (stone-200, warm)
Text Primary:  #1C1917   (stone-900, warm-black)
Text Secondary:#78716C   (stone-500)
Text Muted:    #A8A29E   (stone-400)
```

### Akzentfarbe — Warm Green

```
green-600:  #16A34A   → Primäre CTAs, aktive Nav-Items
green-50:   #F0FDF4   → Subtile Hintergründe (Success, Active Badge)
green-100:  #DCFCE7   → Hover-States auf Cards
green-700:  #15803D   → Hover auf Primary Buttons
```

### Semantische Farben

```
Erfolg/Aktiv:   green-600  #16A34A
Warnung/Frist:  amber-500  #F59E0B  (nie orange — zu aggressiv)
Fehler/Risiko:  red-500    #EF4444
Info/Neutral:   stone-500  #78716C
Leer/Vakanz:    stone-300  #D6D3D1
```

### Was NIE passiert

- Mehr als 2 Akzentfarben gleichzeitig sichtbar
- Reines Schwarz (#000000) als Text
- Reines Weiß (#FFFFFF) als Seitenhintergrund
- Blau nirgends (außer externe Links)

---

## Typografie

**Font**: DM Sans (Google Fonts, via `next/font/google`)  
**Warum**: Geometrisch-rund, modern, sehr klar bei Zahlen. Wird von Stripe und vielen Fintech-Apps genutzt. Optische Größenachse (`opsz`) für scharfes Rendering bei kleinen Sizes aktiviert.  
**Fallback**: -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif  
**Mono**: DM Mono (für Zahlen-Blöcke, Code-Snippets)

### Scale

```
Display:    36px / font-bold    → Große Zahlen im KPI-Bereich
Heading 1:  24px / font-bold    → Seitentitel
Heading 2:  18px / font-semibold → Sektions-Überschriften
Heading 3:  15px / font-semibold → Karten-Titel
Body:       15px / font-normal  → Fließtext (MINIMUM 14px überall)
Small:      13px / font-normal  → Meta-Infos, Timestamps
Label:      12px / font-medium  → Badges, Tags, Caps
```

### Zahlen-Darstellung

Alle Geldbeträge: `font-variant-numeric: tabular-nums` — damit Zahlen nicht springen.

```
8.240 €   → font-bold, Display-Größe im KPI-Block
850 €/Mo  → font-semibold, Heading-3-Größe auf Einheiten-Cards
```

---

## Spacing & Layout

### Grundraster: 4px

```
xs:   4px
sm:   8px
md:  16px
lg:  24px
xl:  32px
2xl: 48px
3xl: 64px
```

### Seitenränder

```
Dashboard-Content:  max-w-5xl, px-6 py-6
Cards:              p-5 (innen), gap-4 (zwischen Cards)
KPI-Block:          p-6, gap-6 zwischen KPIs
```

### Border-Radius

```
Buttons:     rounded-xl   (12px) — weich, iOS-like
Cards:       rounded-2xl  (16px) — großzügig
Badges:      rounded-full         — Pill-Form
Input:       rounded-xl   (12px)
Sidebar:     rounded-xl   (für aktive Items)
```

---

## Schatten

Sparsam einsetzen. Nur wo Elevation wirklich kommuniziert werden muss.

```css
/* Card — leichter Schatten, kein Box-Model-Stress */
shadow-sm:   0 1px 2px rgba(0,0,0,0.05)

/* Aktive Card / Hover */
shadow-md:   0 4px 6px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.05)

/* Modal (falls nötig) */
shadow-xl:   0 20px 25px rgba(0,0,0,0.10)
```

---

## Navigation — Schmale Sidebar

```
Breite:         64px (collapsed) / 240px (expanded)
Default:        Expanded (Desktop), Collapsed (Mobile)
Background:     #FFFFFF mit border-r border-stone-100
Padding:        px-3 py-4

Nav-Item normal:
  height: 36px, rounded-xl, px-3
  Icon: 18px, stone-400
  Label: 13px, font-medium, stone-600

Nav-Item aktiv:
  background: green-50
  Icon: green-600
  Label: green-700, font-semibold

Logo-Bereich:
  Nur Icon (🏠 oder SVG-Haus), 24px
  Keine Wortmarke im Interface selbst
```

---

## Komponenten

### KPI Card

```
Layout:       Karte (surface), rounded-2xl, p-5, shadow-sm
Label:        12px / font-medium / stone-500 / uppercase
Wert:         36px / font-bold / stone-900 / tabular-nums
Sub-Label:    13px / stone-400
Icon:         18px / stone-300 (rechts oben, dezent)
Hover:        shadow-md, transition-shadow 150ms
```

### Einheiten-Card

```
Größe:        min-w-[280px], rounded-2xl, p-5, shadow-sm
Aufbau:
  ┌─────────────────────────┐
  │ Adresse            >    │  ← 15px bold + Chevron
  │ Mieter-Name             │  ← 13px stone-500
  ├─────────────────────────┤
  │ 850 €          ● Aktiv  │  ← Betrag bold + Status-Badge
  │ /Monat                  │
  ├─────────────────────────┤  ← nur wenn Alert
  │ ⚠ Frist in 12 Tagen    │  ← amber-600, 13px
  └─────────────────────────┘

Status-Badge "Aktiv":   green-50 bg, green-700 text, rounded-full, px-2 py-0.5
Status-Badge "Leer":    stone-100 bg, stone-500 text
Status-Badge "Risiko":  red-50 bg, red-600 text
```

### Action Banner (Proaktive Hinweise)

```
Erscheint:    Nur wenn Handlungsbedarf besteht — oben auf Dashboard
Layout:       rounded-2xl, p-4, Hintergrund abhängig von Typ
Typen:
  💰 Verschenkte Miete:  amber-50 bg, amber-600 icon
  ⚠ Frist:              red-50 bg, red-500 icon
  ✅ Alles ok:          NICHT anzeigen — kein "Grün = nichts zu tun"-Banner

Inhalt:
  Icon (24px) + Fettschrift-Aussage + CTA-Button
  Beispiel: "Du verschenkst 240 €/Monat — Indexmiete seit 18 Monaten nicht angepasst"
  CTA: "Jetzt anpassen →" (ghost button, green-600)
```

### Buttons

```
Primary:
  bg-green-600, text-white, rounded-xl, h-9, px-4
  hover: bg-green-700, transition 150ms
  font-medium, 14px

Secondary / Ghost:
  border border-stone-200, bg-white, text-stone-700, rounded-xl
  hover: bg-stone-50

Destructive:
  bg-red-50, text-red-600, border border-red-200, rounded-xl
  hover: bg-red-100

Disabled:
  opacity-40, pointer-events-none (KEIN cursor-not-allowed)
```

### Inputs & Forms

```
Input:
  border border-stone-200, rounded-xl, h-10, px-3
  bg-white, text-stone-900, placeholder: stone-400
  focus: border-green-500, ring-2 ring-green-100
  font-size: 15px (MINIMUM — Lesbarkeit)

Label:
  13px, font-medium, stone-700, mb-1.5

Error:
  border-red-400, ring-2 ring-red-100
  Error-Text: 13px, red-500, mt-1

Kein Placeholder als einzige Beschriftung — immer Label oben.
```

### Tabs (Einheiten-Detail)

```
Style:       Underline-Tabs (kein Pill-Style)
Aktiv:       border-b-2 border-green-600, text-green-700, font-medium
Inaktiv:     text-stone-500, hover: text-stone-700
Font:        14px
Gap:         24px zwischen Tabs
```

### Skeleton Loader

```
Immer bei Daten-Fetch. Kein leeres Weiß.
Farbe:       stone-100, animate-pulse
KPI-Skeleton: h-8 w-24 rounded-lg
Card-Skeleton: h-40 w-full rounded-2xl
```

---

## Seiten-spezifische Layout-Regeln

### Dashboard / Portfolio-Übersicht

```
1. Action Banner (nur wenn Alerts)
2. Page Header: "Mein Portfolio" + "+ Einheit hinzufügen" Button
3. KPI Row: 4 Cards, responsive 2x2 auf Mobile
4. Einheiten-Raster: 2-3 Spalten (responsive), Cards
5. Empty State (wenn keine Einheiten)
```

### Einheit-Detail

```
Header:  Adresse groß + Breadcrumb + Status-Badge
Tabs:    Stammdaten · Mieter · Finanzen · Fristen · Rechts-Check
Content: Nie mehr als 2 Spalten. Links Hauptinfo, rechts Aktionen/Meta.
```

### Upload-Flow

```
Fullscreen-ish Dropzone — kein Modal
Klarer Progress: Upload → Analyse → Prüfen → Fertig
Progress in Schritten, KEIN nackter Spinner ohne Text
```

---

## Animationen & Transitions

```
Standard:         150ms ease-out (Hover-States, Farb-Wechsel)
Karten erscheinen: 200ms, fade-in + leichtes translateY(4px)→0
Page-Transitions: Keine aufwändigen Animationen — Content sofort da
Skeleton → Content: Fade-in 200ms

Was NIE passiert:
- Bounce-Animationen
- Parallax
- Transitions über 300ms bei UI-Elementen
```

---

## Mobile (Responsive)

```
Breakpoints:
  Mobile:  < 768px
  Tablet:  768px - 1024px
  Desktop: > 1024px

Mobile-Sidebar:
  Versteckt, Button unten rechts (Floating Action Button)
  Oder: Tab-Bar am unteren Bildschirmrand (4 Items)

Cards:
  Mobile: 1 Spalte, full-width
  Tablet: 2 Spalten
  Desktop: 2-3 Spalten

KPI-Row:
  Mobile: 2x2 Grid
  Desktop: 1x4 Row
```

---

## Barrierefreiheit

```
Kontrast:   Alle Text-Kombinationen min. WCAG AA (4.5:1)
Focus:      Sichtbarer Focus-Ring (ring-2 ring-green-400 ring-offset-2)
Font-Size:  Minimum 14px überall, 15px für Body
Touch:      Minimum 44px Tappable-Area auf Mobile
Labels:     Jeder Input hat ein assoziiertes <label>
```

---

## Tone of Voice (UI-Texte)

```
✅ "Mietvertrag hochladen"          (aktiv, klar)
✅ "Du verschenkst 240 €/Monat"     (direkt, persönlich)
✅ "Alles erledigt."                 (kurz, bestätigend)
✅ "Bitte prüfe Feld X"             (respektvoll, nicht anklagend)

❌ "Es ist ein Fehler aufgetreten"   (technisch, kalt)
❌ "Klicken Sie hier"                (formell, distanziert)
❌ "Erfolgreich gespeichert worden"  (passiv, umständlich)
❌ "Warning: ..."                    (englisch im deutschen UI)

Regel: Du-Form. Kurze Sätze. Aktiv-Konstruktionen. Keine Fremdwörter.
```

---

## Tailwind-Konfiguration (Referenz)

```js
// tailwind.config — Auszug der wichtigsten Custom-Values
colors: {
  background: '#FAFAF9',
  surface:    '#FFFFFF',
  border:     '#E7E5E4',
},
fontFamily: {
  sans: ['var(--font-geist-sans)', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
},
borderRadius: {
  'xl':  '12px',
  '2xl': '16px',
},
```

---

## Dos & Don'ts auf einen Blick

| ✅ Do | ❌ Don't |
|-------|----------|
| Warm-White als Hintergrund | Reines Weiß #FFFFFF als Page-BG |
| Stone-Grau für Sekundärtext | Grau unter 13px |
| Green-600 sparsam als Akzent | Grün + Orange + Blau gleichzeitig |
| Rounded-2xl für Cards | Scharfe 0px-Radius Karten |
| Skeleton beim Laden | Leerer weißer Screen |
| Kurze DU-Form Texte | Lange Erklärungen in Buttons |
| In-Place Editing wo möglich | Modal für jede kleine Aktion |
| 15px Body-Text | Text unter 14px |
