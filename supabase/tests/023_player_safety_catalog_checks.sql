-- Chess Universe player safety migration 023: read-only verification
-- Run only AFTER applying the migration in a staging/test Supabase project.
-- Does not change data or schema. Raises an error if a critical guard is absent.
DO $check$
BEGIN
  IF to_regclass('public.player_reports') IS NULL OR to_regclass('public.player_blocks') IS NULL THEN
    RAISE EXCEPTION '023 missing player_reports or player_blocks';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_class
    WHERE oid = 'public.player_reports'::regclass AND relrowsecurity
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_class
    WHERE oid = 'public.player_blocks'::regclass AND relrowsecurity
  ) THEN
    RAISE EXCEPTION '023 exposed table without RLS';
  END IF;

  IF has_table_privilege('anon', 'public.player_reports', 'INSERT')
     OR has_table_privilege('anon', 'public.player_reports', 'SELECT')
     OR has_table_privilege('anon', 'public.player_blocks', 'INSERT')
     OR has_table_privilege('anon', 'public.player_blocks', 'SELECT') THEN
    RAISE EXCEPTION '023 anonymous role has access to protected tables';
  END IF;

  IF NOT has_column_privilege('authenticated', 'public.player_reports', 'reporter_id', 'INSERT')
     OR NOT has_column_privilege('authenticated', 'public.player_reports', 'reason', 'INSERT')
     OR has_column_privilege('authenticated', 'public.player_reports', 'status', 'INSERT')
     OR has_table_privilege('authenticated', 'public.player_reports', 'SELECT')
     OR has_table_privilege('authenticated', 'public.player_reports', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.player_reports', 'DELETE') THEN
    RAISE EXCEPTION '023 report insert or read privileges are unsafe';
  END IF;

  IF NOT has_table_privilege('service_role', 'public.player_reports', 'SELECT')
     OR NOT has_table_privilege('service_role', 'public.player_reports', 'UPDATE') THEN
    RAISE EXCEPTION '023 operators cannot review or resolve reports';
  END IF;

  IF has_column_privilege('authenticated', 'public.player_blocks', 'created_at', 'INSERT')
     OR NOT has_table_privilege('authenticated', 'public.player_blocks', 'SELECT')
     OR NOT has_table_privilege('authenticated', 'public.player_blocks', 'DELETE') THEN
    RAISE EXCEPTION '023 block management privileges are unsafe';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
    WHERE schemaname='public' AND tablename='player_reports'
      AND policyname='players can submit own reports'
      AND cmd='INSERT'
  ) THEN
    RAISE EXCEPTION '023 report insert policy missing';
  END IF;

  IF to_regclass('public.player_reports_once_per_match_idx') IS NULL THEN
    RAISE EXCEPTION '023 duplicate-report guard missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_trigger
    WHERE tgrelid='public.games'::regclass
      AND tgname='reject_blocked_matchups' AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION '023 blocked match trigger missing';
  END IF;

  RAISE NOTICE '023 player-safety catalog checks passed. Still run two-account RLS and match tests.';
END
$check$;
