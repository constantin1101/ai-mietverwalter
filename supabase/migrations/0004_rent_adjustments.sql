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
