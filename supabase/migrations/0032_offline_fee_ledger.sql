BEGIN;

DO $fns$
DECLARE
  v_signature text;
BEGIN
  FOR v_signature IN
    SELECT p.oid::regprocedure::text
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'set_payment_checkout',
        'finalize_payment_transaction',
        'get_payment_status',
        'create_payment_transaction'
      )
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || v_signature || ' CASCADE';
  END LOOP;
END;
$fns$;

DROP TABLE IF EXISTS public.payment_webhook_events;
DROP TABLE IF EXISTS public.payment_transactions;

ALTER TABLE public.fee_invoices
  ADD COLUMN IF NOT EXISTS settled_via text,
  ADD COLUMN IF NOT EXISTS settled_reference text,
  ADD COLUMN IF NOT EXISTS settled_by_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS settled_at timestamptz;

ALTER TABLE public.fee_invoices
  DROP CONSTRAINT IF EXISTS fee_invoices_settled_via_check;
ALTER TABLE public.fee_invoices
  ADD CONSTRAINT fee_invoices_settled_via_check
  CHECK (settled_via IS NULL OR settled_via IN ('cash', 'bank_transfer', 'cheque', 'other'));

CREATE OR REPLACE FUNCTION public.protect_fee_invoice_amount() RETURNS trigger
LANGUAGE plpgsql
AS $protect$
BEGIN
  IF NEW.amount_minor IS DISTINCT FROM OLD.amount_minor THEN
    RAISE EXCEPTION 'fee_invoice_amount_immutable';
  END IF;
  IF NEW.payer_profile_id IS DISTINCT FROM OLD.payer_profile_id THEN
    RAISE EXCEPTION 'fee_invoice_payer_immutable';
  END IF;
  IF NEW.kind IS DISTINCT FROM OLD.kind THEN
    RAISE EXCEPTION 'fee_invoice_kind_immutable';
  END IF;
  IF NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key THEN
    RAISE EXCEPTION 'fee_invoice_idempotency_immutable';
  END IF;
  IF NEW.status = 'paid' AND OLD.status IS DISTINCT FROM 'paid' THEN
    NEW.settled_at := coalesce(NEW.settled_at, now());
  END IF;
  IF NEW.status IS DISTINCT FROM 'paid' AND OLD.status = 'paid' THEN
    NEW.settled_at := NULL;
    NEW.settled_via := NULL;
    NEW.settled_reference := NULL;
    NEW.settled_by_profile_id := NULL;
  END IF;
  RETURN NEW;
END;
$protect$;

DROP TRIGGER IF EXISTS fee_invoices_protect_amount ON public.fee_invoices;
CREATE TRIGGER fee_invoices_protect_amount
  BEFORE UPDATE ON public.fee_invoices
  FOR EACH ROW EXECUTE FUNCTION public.protect_fee_invoice_amount();

DO $policies$
BEGIN
  EXECUTE 'DROP POLICY IF EXISTS "fee_invoices: managers can read" ON public.fee_invoices';
  EXECUTE 'DROP POLICY IF EXISTS "fee_invoices: payer can read" ON public.fee_invoices';

  EXECUTE 'CREATE POLICY "fee_invoices: managers can read" ON public.fee_invoices FOR SELECT TO authenticated USING (public.is_event_manager())';
  EXECUTE 'CREATE POLICY "fee_invoices: payer can read" ON public.fee_invoices FOR SELECT TO authenticated USING (payer_profile_id = auth.uid())';
  EXECUTE 'CREATE POLICY "fee_invoices: managers can create" ON public.fee_invoices FOR INSERT TO authenticated WITH CHECK (public.is_event_manager())';
  EXECUTE 'CREATE POLICY "fee_invoices: managers can update" ON public.fee_invoices FOR UPDATE TO authenticated USING (public.is_event_manager()) WITH CHECK (public.is_event_manager())';
  EXECUTE 'CREATE POLICY "fee_invoices: managers can delete" ON public.fee_invoices FOR DELETE TO authenticated USING (public.is_event_manager())';
END;
$policies$;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.fee_invoices TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
