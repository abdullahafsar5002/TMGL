-- Migration 0013: Notifications + Announcements
-- Tables: notifications, announcements

-- ============================================================
-- TABLE: notifications
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_entity TEXT,
  related_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE: announcements
-- ============================================================

CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(recipient_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_announcements_published ON public.announcements(is_published) WHERE is_published = true;

-- ============================================================
-- ENABLE RLS
-- ============================================================

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES: notifications
-- ============================================================

CREATE POLICY "notifications: users can read own"
  ON public.notifications FOR SELECT
  USING (recipient_id = auth.uid());

CREATE POLICY "notifications: system can insert"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "notifications: user can update own read status"
  ON public.notifications FOR UPDATE
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- ============================================================
-- RLS POLICIES: announcements
-- ============================================================

CREATE POLICY "announcements: public can read published"
  ON public.announcements FOR SELECT
  USING (is_published = true);

CREATE POLICY "announcements: managers can read all"
  ON public.announcements FOR SELECT
  USING (get_user_role() IN ('super_admin', 'league_manager'));

CREATE POLICY "announcements: managers can insert"
  ON public.announcements FOR INSERT
  WITH CHECK (get_user_role() IN ('super_admin', 'league_manager'));

CREATE POLICY "announcements: managers can update"
  ON public.announcements FOR UPDATE
  USING (get_user_role() IN ('super_admin', 'league_manager'))
  WITH CHECK (get_user_role() IN ('super_admin', 'league_manager'));

CREATE POLICY "announcements: managers can delete"
  ON public.announcements FOR DELETE
  USING (get_user_role() IN ('super_admin', 'league_manager'));

-- ============================================================
-- TRIGGERS
-- ============================================================

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
