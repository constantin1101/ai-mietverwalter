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
