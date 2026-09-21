-- Migration 0021: Galleries + Audit Logs
-- Tables: galleries, gallery_images, audit_logs

-- ============================================================
-- TABLE: galleries
-- ============================================================

CREATE TABLE IF NOT EXISTS public.galleries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE: gallery_images
-- ============================================================

CREATE TABLE IF NOT EXISTS public.gallery_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id UUID NOT NULL REFERENCES public.galleries(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE: audit_logs
-- ============================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_galleries_tournament ON public.galleries(tournament_id);
CREATE INDEX IF NOT EXISTS idx_gallery_images_gallery ON public.gallery_images(gallery_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at);

-- ============================================================
-- ENABLE RLS
-- ============================================================

ALTER TABLE public.galleries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES: galleries
-- ============================================================

DROP POLICY IF EXISTS "galleries: public can read" ON public.galleries;
CREATE POLICY "galleries: public can read"
  ON public.galleries FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "galleries: managers can insert" ON public.galleries;
CREATE POLICY "galleries: managers can insert"
  ON public.galleries FOR INSERT
  WITH CHECK (get_user_role() IN ('super_admin', 'league_manager'));

DROP POLICY IF EXISTS "galleries: managers can update" ON public.galleries;
CREATE POLICY "galleries: managers can update"
  ON public.galleries FOR UPDATE
  USING (get_user_role() IN ('super_admin', 'league_manager'))
  WITH CHECK (get_user_role() IN ('super_admin', 'league_manager'));

DROP POLICY IF EXISTS "galleries: managers can delete" ON public.galleries;
CREATE POLICY "galleries: managers can delete"
  ON public.galleries FOR DELETE
  USING (get_user_role() IN ('super_admin', 'league_manager'));

-- ============================================================
-- RLS POLICIES: gallery_images
-- ============================================================

DROP POLICY IF EXISTS "gallery_images: public can read" ON public.gallery_images;
CREATE POLICY "gallery_images: public can read"
  ON public.gallery_images FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "gallery_images: authenticated can insert" ON public.gallery_images;
CREATE POLICY "gallery_images: authenticated can insert"
  ON public.gallery_images FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "gallery_images: authenticated can update own" ON public.gallery_images;
CREATE POLICY "gallery_images: authenticated can update own"
  ON public.gallery_images FOR UPDATE
  USING (uploaded_by = auth.uid())
  WITH CHECK (uploaded_by = auth.uid());

DROP POLICY IF EXISTS "gallery_images: authenticated can delete own" ON public.gallery_images;
CREATE POLICY "gallery_images: authenticated can delete own"
  ON public.gallery_images FOR DELETE
  USING (uploaded_by = auth.uid());

-- ============================================================
-- RLS POLICIES: audit_logs
-- ============================================================

DROP POLICY IF EXISTS "audit_logs: managers can read" ON public.audit_logs;
CREATE POLICY "audit_logs: managers can read"
  ON public.audit_logs FOR SELECT
  USING (get_user_role() IN ('super_admin', 'league_manager'));

DROP POLICY IF EXISTS "audit_logs: authenticated can insert" ON public.audit_logs;
CREATE POLICY "audit_logs: authenticated can insert"
  ON public.audit_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- TRIGGERS
-- ============================================================

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.galleries
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
