# 🗃️ Datenmodell (Supabase / PostgreSQL)

## Entity-Relationship-Überblick

```
users (Supabase Auth)
  └─── user_subscriptions (1:1)
  └─── properties (1:N)
         └─── units (1:N)
                └─── leases (1:N, aber max 1 aktiv)
                       └─── tenants (N:M via lease_tenants)
                       └─── rent_history (1:N)
                       └─── rent_adjustments (1:N)  ← Staffel/Index-Stufen
                └─── documents (1:N)
                └─── deadlines (1:N)
  └─── documents (1:N)  ← Property-Level Docs (z.B. Versicherung)
```

---

## Tabellen-Schema

### `users` (von Supabase Auth verwaltet)
```sql
-- Supabase's auth.users Tabelle — wir erweitern mit public.user_profiles
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  company_name TEXT,
  phone TEXT,
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_profile" ON user_profiles FOR ALL USING (auth.uid() = id);
```

### `user_subscriptions`
```sql
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free'
    CHECK (plan IN ('free', 'solo', 'pro', 'portfolio')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_subscription" ON user_subscriptions
  FOR ALL USING (auth.uid() = user_id);
```

### `properties` (Immobilien / Objekte)
```sql
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,             -- z.B. "Mehrfamilienhaus Musterstr."
  street TEXT NOT NULL,
  house_number TEXT NOT NULL,
  city TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'DE',
  lat NUMERIC(10, 7),             -- für Karten-Ansicht
  lng NUMERIC(10, 7),
  property_type TEXT DEFAULT 'residential'
    CHECK (property_type IN ('residential', 'commercial', 'mixed')),
  build_year INT,
  total_area_sqm NUMERIC(8, 2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_properties" ON properties
  FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_properties_user ON properties(user_id);
```

### `units` (Wohneinheiten)
```sql
CREATE TABLE units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  unit_number TEXT,               -- z.B. "EG links", "3. OG"
  floor INT,
  area_sqm NUMERIC(8, 2),
  rooms NUMERIC(3, 1),            -- Zimmeranzahl, z.B. 2.5
  has_parking BOOLEAN DEFAULT false,
  parking_number TEXT,
  has_cellar BOOLEAN DEFAULT false,
  has_garden BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'vacant'
    CHECK (status IN ('occupied', 'vacant', 'renovation')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_units" ON units
  FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_units_property ON units(property_id);
CREATE INDEX idx_units_user ON units(user_id);
```

### `tenants` (Mieter)
```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  date_of_birth DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_tenants" ON tenants
  FOR ALL USING (auth.uid() = user_id);
```

### `leases` (Mietverträge)
```sql
CREATE TABLE leases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Vertragslaufzeit
  start_date DATE NOT NULL,
  end_date DATE,                  -- NULL = unbefristet
  is_fixed_term BOOLEAN DEFAULT false,
  notice_period_months INT DEFAULT 3,
  
  -- Finanzielle Konditionen
  base_rent NUMERIC(10, 2) NOT NULL,     -- Kaltmiete €
  operating_costs NUMERIC(10, 2),        -- Betriebskosten/NK €
  total_rent NUMERIC(10, 2),             -- Warmmiete € (calculated)
  deposit NUMERIC(10, 2),                -- Kaution €
  payment_day INT DEFAULT 1,             -- Fälligkeitstag (1-28)
  payment_method TEXT DEFAULT 'transfer'
    CHECK (payment_method IN ('transfer', 'direct_debit')),
  
  -- Mietart
  rent_type TEXT NOT NULL DEFAULT 'fixed'
    CHECK (rent_type IN ('fixed', 'indexed', 'graduated')),
  
  -- Indexmiete (wenn rent_type = 'indexed')
  index_type TEXT CHECK (index_type IN ('VPI', 'other')),
  index_base_value NUMERIC(10, 4),       -- Basiswert VPI beim Vertragsschluss
  index_base_date DATE,                  -- Datum des Basiswerts
  index_adjustment_interval_months INT DEFAULT 12,
  
  -- Staffelmiete (wenn rent_type = 'graduated')
  -- Stufen in rent_adjustments Tabelle
  
  -- Sondervereinbarungen
  pets_allowed BOOLEAN,
  subletting_allowed BOOLEAN,
  cosmetic_repairs_clause TEXT,          -- Schönheitsreparaturen Klausel-Text
  
  -- AI-Extraktion Metadaten
  extracted_at TIMESTAMPTZ,
  extraction_confidence NUMERIC(3, 2),   -- 0.0 - 1.0 overall
  extraction_corrections JSONB,          -- User-Korrekturen
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  terminated_at TIMESTAMPTZ,
  termination_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE leases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_leases" ON leases
  FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_leases_unit ON leases(unit_id);
CREATE INDEX idx_leases_user ON leases(user_id);
CREATE INDEX idx_leases_active ON leases(is_active) WHERE is_active = true;
```

### `lease_tenants` (N:M zwischen Mietvertrag und Mieter)
```sql
CREATE TABLE lease_tenants (
  lease_id UUID REFERENCES leases(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,  -- Hauptmieter
  PRIMARY KEY (lease_id, tenant_id)
);
ALTER TABLE lease_tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_lease_tenants" ON lease_tenants
  FOR ALL USING (
    EXISTS (SELECT 1 FROM leases l WHERE l.id = lease_id AND l.user_id = auth.uid())
  );
```

### `rent_adjustments` (Staffelmiete-Stufen & Index-Anpassungen)
```sql
CREATE TABLE rent_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id UUID REFERENCES leases(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  effective_date DATE NOT NULL,          -- Ab wann gilt diese Miete
  new_base_rent NUMERIC(10, 2) NOT NULL, -- Neue Kaltmiete
  adjustment_type TEXT NOT NULL
    CHECK (adjustment_type IN ('graduated', 'index', 'mietspiegel', 'manual')),
  
  -- Nur bei Index-Anpassungen
  new_index_value NUMERIC(10, 4),
  old_index_value NUMERIC(10, 4),
  index_change_percent NUMERIC(6, 3),
  
  -- Notification Status
  notice_sent BOOLEAN DEFAULT false,
  notice_sent_at TIMESTAMPTZ,
  notice_document_id UUID,               -- Link zu generiertem Schreiben
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE rent_adjustments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_adjustments" ON rent_adjustments
  FOR ALL USING (auth.uid() = user_id);
```

### `documents`
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  lease_id UUID REFERENCES leases(id) ON DELETE SET NULL,
  
  -- Datei-Info
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,               -- Supabase Storage Path
  file_size_bytes INT,
  mime_type TEXT,
  
  -- Klassifizierung
  document_type TEXT NOT NULL DEFAULT 'other'
    CHECK (document_type IN (
      'lease_contract',       -- Mietvertrag
      'handover_protocol',    -- Übergabeprotokoll
      'energy_certificate',   -- Energieausweis
      'insurance_policy',     -- Versicherungspolice
      'invoice',              -- Rechnung/Handwerker
      'rent_increase',        -- Mieterhöhungsschreiben
      'utility_statement',    -- Nebenkostenabrechnung
      'correspondence',       -- Sonstige Korrespondenz
      'other'
    )),
  
  -- AI-Verarbeitung
  ocr_text TEXT,                         -- Extrahierter Text
  ocr_processed BOOLEAN DEFAULT false,
  ai_tags TEXT[],                        -- AI-generierte Schlagworte
  ai_summary TEXT,                       -- Kurze AI-Zusammenfassung
  
  -- Status
  status TEXT NOT NULL DEFAULT 'uploaded'
    CHECK (status IN ('uploaded', 'processing', 'extracted', 'error')),
  error_message TEXT,
  
  -- Vektoren für Suche
  embedding vector(1536),               -- pgvector für Volltext-Suche
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_documents" ON documents
  FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_documents_user ON documents(user_id);
CREATE INDEX idx_documents_unit ON documents(unit_id);
CREATE INDEX idx_documents_embedding ON documents USING ivfflat (embedding vector_cosine_ops);
```

### `deadlines` (Fristen & Termine)
```sql
CREATE TABLE deadlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
  lease_id UUID REFERENCES leases(id) ON DELETE CASCADE,
  
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  
  deadline_type TEXT NOT NULL
    CHECK (deadline_type IN (
      'rent_adjustment',      -- Mieterhöhung / Index-Anpassung fällig
      'lease_termination',    -- Vertrag läuft aus
      'notice_period',        -- Kündigungsfrist
      'inspection',           -- Besichtigung / Überprüfung
      'insurance_renewal',    -- Versicherungsverlängerung
      'utility_statement',    -- NK-Abrechnung Frist (12 Monate)
      'tax_deadline',         -- Steuer-Frist
      'custom'
    )),
  
  is_auto_generated BOOLEAN DEFAULT false,  -- Von AI erstellt
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  
  -- Benachrichtigungen
  notify_days_before INT[] DEFAULT ARRAY[30, 14, 7],
  last_notified_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE deadlines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_deadlines" ON deadlines
  FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_deadlines_user ON deadlines(user_id);
CREATE INDEX idx_deadlines_due ON deadlines(due_date) WHERE NOT is_completed;
```

### `legal_checks` (Rechts-Check Ergebnisse)
```sql
CREATE TABLE legal_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id UUID REFERENCES leases(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Gesamt-Bewertung
  overall_risk TEXT CHECK (overall_risk IN ('low', 'medium', 'high')),
  analyzed_at TIMESTAMPTZ DEFAULT now(),
  claude_model TEXT,                     -- Welches Modell war es
  
  -- Einzelne Klausel-Befunde (JSONB Array)
  findings JSONB NOT NULL DEFAULT '[]',
  /*
  findings Format:
  [{
    "clause_text": "Der Mieter...",
    "clause_type": "cosmetic_repairs",
    "risk_level": "high",
    "issue": "Formularklausel unwirksam nach BGH...",
    "bgh_reference": "BGH VIII ZR 354/04",
    "recommendation": "Klausel streichen oder...",
    "confidence": 0.92
  }]
  */
  
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE legal_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_legal_checks" ON legal_checks
  FOR ALL USING (auth.uid() = user_id);
```

### `rent_index_data` (Mietspiegel-Referenzdaten — public read)
```sql
CREATE TABLE rent_index_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL,
  postal_code TEXT,
  district TEXT,
  
  -- Wohnungs-Charakteristika
  area_sqm_min NUMERIC(6, 1),
  area_sqm_max NUMERIC(6, 1),
  build_year_min INT,
  build_year_max INT,
  quality TEXT CHECK (quality IN ('simple', 'medium', 'good', 'luxury')),
  
  -- Mietspiegel-Werte
  rent_per_sqm_lower NUMERIC(6, 2),
  rent_per_sqm_median NUMERIC(6, 2),
  rent_per_sqm_upper NUMERIC(6, 2),
  
  valid_from DATE NOT NULL,
  valid_until DATE,
  source TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);
-- Kein RLS nötig — öffentliche Referenzdaten
CREATE INDEX idx_rent_index_city ON rent_index_data(city);
```

---

## Supabase Storage Buckets

```sql
-- Privater Bucket für Nutzerdokumente
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

-- RLS Policy: Nur eigene Dateien
CREATE POLICY "own_documents_storage" ON storage.objects
  FOR ALL USING (
    bucket_id = 'documents' AND
    auth.uid()::text = (storage.fspath(name))[1]
  );
-- Dateipfad-Konvention: {user_id}/{property_id}/{unit_id}/{filename}
```

---

## Nützliche Views & Functions

```sql
-- View: Einheiten mit aktivem Mietvertrag (für Dashboard)
CREATE OR REPLACE VIEW units_with_lease AS
SELECT
  u.*,
  p.street, p.house_number, p.city, p.postal_code,
  l.id AS lease_id,
  l.base_rent,
  l.total_rent,
  l.rent_type,
  l.start_date AS lease_start,
  l.end_date AS lease_end,
  t.first_name || ' ' || t.last_name AS primary_tenant_name
FROM units u
LEFT JOIN properties p ON p.id = u.property_id
LEFT JOIN leases l ON l.unit_id = u.id AND l.is_active = true
LEFT JOIN lease_tenants lt ON lt.lease_id = l.id AND lt.is_primary = true
LEFT JOIN tenants t ON t.id = lt.tenant_id;

-- Funktion: Portfolio-KPIs für einen User
CREATE OR REPLACE FUNCTION get_portfolio_kpis(p_user_id UUID)
RETURNS TABLE (
  total_units INT,
  occupied_units INT,
  total_monthly_rent NUMERIC,
  avg_rent_per_sqm NUMERIC
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    COUNT(u.id)::INT AS total_units,
    COUNT(l.id)::INT AS occupied_units,
    COALESCE(SUM(l.base_rent), 0) AS total_monthly_rent,
    COALESCE(SUM(l.base_rent) / NULLIF(SUM(u.area_sqm), 0), 0) AS avg_rent_per_sqm
  FROM units u
  LEFT JOIN leases l ON l.unit_id = u.id AND l.is_active = true
  WHERE u.user_id = p_user_id;
$$;
```

---

## Migrationsstrategie

Migrationen in `supabase/migrations/` als nummerierte SQL-Dateien:
```
supabase/migrations/
├── 0001_initial_schema.sql      # user_profiles, user_subscriptions
├── 0002_properties.sql          # properties, units
├── 0003_tenants_leases.sql      # tenants, leases, lease_tenants
├── 0004_rent_adjustments.sql    # rent_adjustments
├── 0005_documents.sql           # documents + storage bucket
├── 0006_deadlines.sql           # deadlines
├── 0007_legal_checks.sql        # legal_checks
├── 0008_rent_index.sql          # rent_index_data
└── 0009_views_functions.sql     # Views + Functions
```

Deployment via `supabase db push` (lokal) und automatisch via Supabase GitHub Action (Produktion).
