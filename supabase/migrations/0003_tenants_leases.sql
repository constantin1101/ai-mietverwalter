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
