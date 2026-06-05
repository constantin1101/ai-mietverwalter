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
