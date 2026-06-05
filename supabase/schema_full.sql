-- ============================================================
-- Migration 0001: Initial schema
-- user_profiles, user_subscriptions
-- ============================================================

-- User profiles (extends Supabase auth.users)
CREATE TABLE public.user_profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT,
  company_name TEXT,
  phone       TEXT,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_profiles_own" ON public.user_profiles
  FOR ALL USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Subscription tiers
CREATE TABLE public.user_subscriptions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id    TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  plan                  TEXT NOT NULL DEFAULT 'free'
                          CHECK (plan IN ('free', 'solo', 'pro', 'portfolio')),
  status                TEXT NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
  current_period_end    TIMESTAMPTZ,
  cancel_at_period_end  BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_subscriptions_own" ON public.user_subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- Auto-create free subscription on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_subscriptions (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_subscription();
-- ============================================================
-- Migration 0002: Properties & Units
-- ============================================================

CREATE TABLE public.properties (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  street        TEXT NOT NULL,
  house_number  TEXT NOT NULL,
  city          TEXT NOT NULL,
  postal_code   TEXT NOT NULL,
  country       TEXT NOT NULL DEFAULT 'DE',
  lat           NUMERIC(10, 7),
  lng           NUMERIC(10, 7),
  property_type TEXT NOT NULL DEFAULT 'residential'
                  CHECK (property_type IN ('residential', 'commercial', 'mixed')),
  build_year    INT,
  total_area_sqm NUMERIC(8, 2),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "properties_own" ON public.properties
  FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_properties_user ON public.properties (user_id);

-- ----

CREATE TABLE public.units (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id   UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unit_number   TEXT,
  floor         INT,
  area_sqm      NUMERIC(8, 2),
  rooms         NUMERIC(3, 1),
  has_parking   BOOLEAN NOT NULL DEFAULT false,
  parking_number TEXT,
  has_cellar    BOOLEAN NOT NULL DEFAULT false,
  has_garden    BOOLEAN NOT NULL DEFAULT false,
  status        TEXT NOT NULL DEFAULT 'vacant'
                  CHECK (status IN ('occupied', 'vacant', 'renovation')),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "units_own" ON public.units
  FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_units_property ON public.units (property_id);
CREATE INDEX idx_units_user     ON public.units (user_id);
-- ============================================================
-- Migration 0003: Tenants & Leases
-- ============================================================

CREATE TABLE public.tenants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name  TEXT NOT NULL,
  last_name   TEXT NOT NULL,
  email       TEXT,
  phone       TEXT,
  date_of_birth DATE,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenants_own" ON public.tenants
  FOR ALL USING (auth.uid() = user_id);

-- ----

CREATE TABLE public.leases (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id     UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Vertragslaufzeit
  start_date          DATE NOT NULL,
  end_date            DATE,
  is_fixed_term       BOOLEAN NOT NULL DEFAULT false,
  notice_period_months INT NOT NULL DEFAULT 3,

  -- Finanzielles
  base_rent           NUMERIC(10, 2) NOT NULL,
  operating_costs     NUMERIC(10, 2),
  total_rent          NUMERIC(10, 2),
  deposit             NUMERIC(10, 2),
  payment_day         INT NOT NULL DEFAULT 1 CHECK (payment_day BETWEEN 1 AND 28),
  payment_method      TEXT DEFAULT 'transfer'
                        CHECK (payment_method IN ('transfer', 'direct_debit')),

  -- Mietart
  rent_type           TEXT NOT NULL DEFAULT 'fixed'
                        CHECK (rent_type IN ('fixed', 'indexed', 'graduated')),

  -- Indexmiete
  index_type                          TEXT CHECK (index_type IN ('VPI', 'other')),
  index_base_value                    NUMERIC(10, 4),
  index_base_date                     DATE,
  index_adjustment_interval_months    INT DEFAULT 12,

  -- Sondervereinbarungen
  pets_allowed                BOOLEAN,
  subletting_allowed          BOOLEAN,
  cosmetic_repairs_clause     TEXT,

  -- AI-Extraktion Metadaten
  extracted_at            TIMESTAMPTZ,
  extraction_confidence   NUMERIC(3, 2),
  extraction_corrections  JSONB,

  -- Status
  is_active           BOOLEAN NOT NULL DEFAULT true,
  terminated_at       TIMESTAMPTZ,
  termination_reason  TEXT,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leases_own" ON public.leases
  FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_leases_unit   ON public.leases (unit_id);
CREATE INDEX idx_leases_user   ON public.leases (user_id);
CREATE INDEX idx_leases_active ON public.leases (is_active) WHERE is_active = true;

-- ----

CREATE TABLE public.lease_tenants (
  lease_id    UUID NOT NULL REFERENCES public.leases(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  is_primary  BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (lease_id, tenant_id)
);

ALTER TABLE public.lease_tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lease_tenants_own" ON public.lease_tenants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.leases l
      WHERE l.id = lease_id AND l.user_id = auth.uid()
    )
  );
-- ============================================================
-- Migration 0004: Rent adjustments (Staffel & Indexmiete)
-- ============================================================

CREATE TABLE public.rent_adjustments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id        UUID NOT NULL REFERENCES public.leases(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  effective_date  DATE NOT NULL,
  new_base_rent   NUMERIC(10, 2) NOT NULL,
  adjustment_type TEXT NOT NULL
                    CHECK (adjustment_type IN ('graduated', 'index', 'mietspiegel', 'manual')),

  -- Index-Anpassungen
  new_index_value       NUMERIC(10, 4),
  old_index_value       NUMERIC(10, 4),
  index_change_percent  NUMERIC(6, 3),

  -- Schreiben verschickt?
  notice_sent           BOOLEAN NOT NULL DEFAULT false,
  notice_sent_at        TIMESTAMPTZ,
  notice_document_id    UUID,

  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rent_adjustments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rent_adjustments_own" ON public.rent_adjustments
  FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_rent_adj_lease ON public.rent_adjustments (lease_id);
-- ============================================================
-- Migration 0005: Documents + Storage bucket
-- ============================================================

-- Enable pgvector for semantic search (if not already enabled)
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE public.documents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unit_id       UUID REFERENCES public.units(id) ON DELETE SET NULL,
  property_id   UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  lease_id      UUID REFERENCES public.leases(id) ON DELETE SET NULL,

  filename      TEXT NOT NULL,
  file_path     TEXT NOT NULL,
  file_size_bytes INT,
  mime_type     TEXT,

  document_type TEXT NOT NULL DEFAULT 'other'
                  CHECK (document_type IN (
                    'lease_contract', 'handover_protocol', 'energy_certificate',
                    'insurance_policy', 'invoice', 'rent_increase',
                    'utility_statement', 'correspondence', 'other'
                  )),

  -- AI-Verarbeitung
  ocr_text          TEXT,
  ocr_processed     BOOLEAN NOT NULL DEFAULT false,
  ai_tags           TEXT[],
  ai_summary        TEXT,

  status        TEXT NOT NULL DEFAULT 'uploaded'
                  CHECK (status IN ('uploaded', 'processing', 'extracted', 'error')),
  error_message TEXT,

  -- Semantic search vector
  embedding     vector(1536),

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "documents_own" ON public.documents
  FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_documents_user    ON public.documents (user_id);
CREATE INDEX idx_documents_unit    ON public.documents (unit_id);
CREATE INDEX idx_documents_status  ON public.documents (status);

-- Vector index for semantic search (created separately after data load)
-- CREATE INDEX idx_documents_embedding ON public.documents
--   USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ----
-- Storage bucket: private, user-scoped
-- Run in Supabase Dashboard > Storage or via API:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

-- Storage RLS: users can only access their own files
-- File path convention: {user_id}/{uuid}_{filename}
-- CREATE POLICY "documents_storage_own" ON storage.objects
--   FOR ALL USING (
--     bucket_id = 'documents'
--     AND (storage.fspath(name))[1] = auth.uid()::text
--   );
-- ============================================================
-- Migration 0006: Deadlines & Legal checks
-- ============================================================

CREATE TABLE public.deadlines (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unit_id       UUID REFERENCES public.units(id) ON DELETE CASCADE,
  lease_id      UUID REFERENCES public.leases(id) ON DELETE CASCADE,

  title         TEXT NOT NULL,
  description   TEXT,
  due_date      DATE NOT NULL,

  deadline_type TEXT NOT NULL
                  CHECK (deadline_type IN (
                    'rent_adjustment', 'lease_termination', 'notice_period',
                    'inspection', 'insurance_renewal', 'utility_statement',
                    'tax_deadline', 'custom'
                  )),

  is_auto_generated BOOLEAN NOT NULL DEFAULT false,
  is_completed      BOOLEAN NOT NULL DEFAULT false,
  completed_at      TIMESTAMPTZ,

  notify_days_before  INT[] NOT NULL DEFAULT '{30,14,7}',
  last_notified_at    TIMESTAMPTZ,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.deadlines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deadlines_own" ON public.deadlines
  FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_deadlines_user ON public.deadlines (user_id);
CREATE INDEX idx_deadlines_due  ON public.deadlines (due_date) WHERE NOT is_completed;

-- ----

CREATE TABLE public.legal_checks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id    UUID NOT NULL REFERENCES public.leases(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  overall_risk  TEXT CHECK (overall_risk IN ('low', 'medium', 'high')),
  analyzed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  claude_model  TEXT,

  -- Array of finding objects:
  -- [{clause_text, clause_type, risk_level, issue, bgh_reference, recommendation, confidence}]
  findings      JSONB NOT NULL DEFAULT '[]',

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.legal_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "legal_checks_own" ON public.legal_checks
  FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_legal_checks_lease ON public.legal_checks (lease_id);
-- ============================================================
-- Migration 0007: Rent index data + Views + Helper functions
-- ============================================================

-- Mietspiegel reference data (public read, admin write)
CREATE TABLE public.rent_index_data (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city                TEXT NOT NULL,
  postal_code         TEXT,
  district            TEXT,
  area_sqm_min        NUMERIC(6, 1),
  area_sqm_max        NUMERIC(6, 1),
  build_year_min      INT,
  build_year_max      INT,
  quality             TEXT CHECK (quality IN ('simple', 'medium', 'good', 'luxury')),
  rent_per_sqm_lower  NUMERIC(6, 2),
  rent_per_sqm_median NUMERIC(6, 2),
  rent_per_sqm_upper  NUMERIC(6, 2),
  valid_from          DATE NOT NULL,
  valid_until         DATE,
  source              TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Public read access (reference data, not personal)
ALTER TABLE public.rent_index_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rent_index_public_read" ON public.rent_index_data
  FOR SELECT USING (true);

CREATE INDEX idx_rent_index_city ON public.rent_index_data (city);

-- ============================================================
-- View: units with active lease (for dashboard)
-- ============================================================
CREATE OR REPLACE VIEW public.units_with_lease AS
SELECT
  u.id,
  u.property_id,
  u.user_id,
  u.unit_number,
  u.floor,
  u.area_sqm,
  u.rooms,
  u.has_parking,
  u.has_cellar,
  u.has_garden,
  u.status,
  p.street,
  p.house_number,
  p.city,
  p.postal_code,
  p.lat,
  p.lng,
  l.id                                          AS lease_id,
  l.base_rent,
  l.total_rent,
  l.rent_type,
  l.start_date                                  AS lease_start,
  l.end_date                                    AS lease_end,
  l.is_fixed_term,
  l.index_type,
  l.index_base_value,
  l.index_base_date,
  l.index_adjustment_interval_months,
  t.first_name || ' ' || t.last_name            AS primary_tenant_name,
  t.email                                       AS primary_tenant_email,
  t.phone                                       AS primary_tenant_phone
FROM public.units u
LEFT JOIN public.properties p     ON p.id = u.property_id
LEFT JOIN public.leases l         ON l.unit_id = u.id AND l.is_active = true
LEFT JOIN public.lease_tenants lt ON lt.lease_id = l.id AND lt.is_primary = true
LEFT JOIN public.tenants t        ON t.id = lt.tenant_id;

-- ============================================================
-- Function: Portfolio KPIs for a user
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_portfolio_kpis(p_user_id UUID)
RETURNS TABLE (
  total_units       BIGINT,
  occupied_units    BIGINT,
  vacant_units      BIGINT,
  total_monthly_rent NUMERIC,
  avg_rent_per_sqm  NUMERIC
) LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT
    COUNT(u.id)                                               AS total_units,
    COUNT(l.id)                                               AS occupied_units,
    COUNT(u.id) - COUNT(l.id)                                 AS vacant_units,
    COALESCE(SUM(l.base_rent), 0)                             AS total_monthly_rent,
    COALESCE(
      SUM(l.base_rent) / NULLIF(SUM(u.area_sqm), 0),
      0
    )                                                         AS avg_rent_per_sqm
  FROM public.units u
  LEFT JOIN public.leases l
    ON l.unit_id = u.id AND l.is_active = true
  WHERE u.user_id = p_user_id;
$$;
