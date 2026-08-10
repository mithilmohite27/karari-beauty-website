-- Safe cleanup for old log-like rows (30+ days)
-- Run this in Supabase SQL editor during a quiet period. It only deletes
-- rows from tables that exist and that have a recognized timestamp column.

DO $$
DECLARE
  candidate_tables text[] := array[
    'webhook_deliveries', 'webhook_logs', 'webhook_attempts',
    'audit_logs', 'event_logs', 'request_logs', 'job_logs', 'job_runs',
    'queue_events', 'log_entries', 'notifications', 'email_logs', 'activity_logs'
  ];
  tbl text;
  ts_col text;
  deleted_count bigint;
BEGIN
  RAISE NOTICE 'Starting cleanup: deleting rows older than 30 days from known log tables if present.';

  FOR tbl IN SELECT unnest(candidate_tables) LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=tbl) THEN
      -- pick a sensible timestamp column if it exists
      SELECT column_name INTO ts_col
      FROM information_schema.columns
      WHERE table_schema='public' AND table_name=tbl AND column_name IN ('created_at','inserted_at','created','timestamp','ts','logged_at')
      ORDER BY (column_name='created_at') DESC NULLS LAST
      LIMIT 1;

      IF ts_col IS NOT NULL THEN
        EXECUTE format('WITH deleted AS (DELETE FROM public.%I WHERE %I < now() - interval ''30 days'' RETURNING 1) SELECT count(*) FROM deleted', tbl, ts_col)
        INTO deleted_count;

        IF deleted_count IS NULL THEN
          deleted_count := 0;
        END IF;

        RAISE NOTICE 'Table %: deleted % row(s) using column %', tbl, deleted_count, ts_col;
      ELSE
        RAISE NOTICE 'Table % exists but no recognized timestamp column found; skipping.', tbl;
      END IF;
    ELSE
      RAISE NOTICE 'Table % not present; skipping.', tbl;
    END IF;
  END LOOP;

  RAISE NOTICE 'Cleanup complete.';
END$$;

-- Notes:
-- 1) This script is conservative: it only deletes from tables that match the
--    candidate list and have a recognized timestamp column.
-- 2) For aggressive cleanup, adjust the candidate_tables list or the interval.
-- 3) Always run a SELECT first to preview rows, e.g.:
--    SELECT count(*) FROM public.webhook_logs WHERE created_at < now() - interval '30 days';
