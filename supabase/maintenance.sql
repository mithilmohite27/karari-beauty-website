-- Safe maintenance commands to run in the Supabase SQL editor
-- Recommended: run these during a quiet period. They are low-risk.

-- 1) Show current DB size
SELECT pg_size_pretty(pg_database_size(current_database())) AS db_size;

-- 2) Reclaim space and update planner stats
VACUUM ANALYZE;

-- 3) Reindex the current database (helps if many bloaty indexes exist)
REINDEX DATABASE "current_database"; -- replace with actual DB name if required

-- 4) Show table sizes to identify large tables
SELECT
  schemaname,
  relname AS table_name,
  pg_size_pretty(pg_table_size(relid)) AS table_size,
  pg_size_pretty(pg_total_relation_size(relid)) AS total_size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC
LIMIT 25;

-- Notes:
-- - VACUUM ANALYZE is safe and will update planner stats; it does not lock writes long-term.
-- - VACUUM FULL is more aggressive (reclaims more disk) but takes an exclusive lock; run only if you accept downtime.
-- - REINDEX DATABASE may require higher privileges; if it fails, run REINDEX TABLE for specific large indexes shown above.
-- - For storage cleanup (images), use the Supabase Storage UI or the scripts/publish-optimized-images.mjs workflow to delete originals under the 'product-images' bucket manually after confirming optimized/ versions exist.
