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
