BEGIN;

CREATE OR REPLACE FUNCTION public.guard_profile_privileges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND current_user NOT IN ('postgres', 'supabase_admin')
     AND NOT (public.is_service_role() OR public.is_event_manager()) THEN
    NEW.role := OLD.role;
  END IF;
  RETURN NEW;
END;
$$;

INSERT INTO public.profiles (id, email, full_name, role)
SELECT
  u.id,
  u.email,
  coalesce(nullif(u.raw_user_meta_data->>'full_name', ''), nullif(u.raw_user_meta_data->>'name', ''), 'TMGL Administrator'),
  'super_admin'::public.user_role
FROM auth.users u
WHERE lower(u.email) = lower('torukofficial@gmail.com')
ON CONFLICT (id) DO UPDATE
SET role = 'super_admin'::public.user_role,
    email = EXCLUDED.email;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = lower('torukofficial@gmail.com')) THEN
    RAISE WARNING 'No auth user found for torukofficial@gmail.com. Sign up in the app first, then re-run this migration.';
  ELSIF NOT EXISTS (SELECT 1 FROM public.profiles WHERE role = 'super_admin'::public.user_role) THEN
    RAISE WARNING 'Profile promotion did not take effect for torukofficial@gmail.com.';
  END IF;
END;
$$;

COMMIT;
