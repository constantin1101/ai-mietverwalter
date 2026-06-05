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
