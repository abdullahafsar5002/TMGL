DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'player_statistics'
      AND c.relkind IN ('v', 'm')
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = 'player_statistics'
        AND c.relkind = 'm'
    ) THEN
      EXECUTE 'DROP MATERIALIZED VIEW public.player_statistics';
    ELSE
      EXECUTE 'DROP VIEW public.player_statistics';
    END IF;
  END IF;
END;
$$;
