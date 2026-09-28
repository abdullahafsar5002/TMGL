BEGIN;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;

DO $grants$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('GRANT ALL ON TABLE public.%I TO anon, authenticated, service_role', r.tablename);
  END LOOP;

  FOR r IN SELECT sequencename FROM pg_sequences WHERE schemaname = 'public' LOOP
    EXECUTE format('GRANT ALL ON SEQUENCE public.%I TO anon, authenticated, service_role', r.sequencename);
  END LOOP;
END;
$grants$;

REVOKE ALL ON FUNCTION public.set_payment_checkout(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.finalize_payment_transaction(uuid, text, text, text, text, bigint, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_payment_transaction(uuid, text, text, text, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.get_payment_status(uuid, uuid) FROM anon;

NOTIFY pgrst, 'reload schema';

COMMIT;
