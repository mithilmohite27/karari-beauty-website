-- Karari Beauty - clear the two actionable Supabase security advisories.
--
-- Paste this whole file into the Supabase SQL editor for project
-- pwdbvmplcftqnrnyizkf and run it. Safe to re-run. Takes about a second.
--
-- This is the minimal fix. The wider migration (inventory support, indexes,
-- diagnostics) is in supabase/phase2-performance-and-payments.sql and can be
-- run separately.


-- ===========================================================================
-- FIX 1 of 2 - lint 0011: function_search_path_mutable
-- ===========================================================================
-- public.set_updated_at runs on every insert/update across seven tables. With
-- a mutable search_path, a role-level setting could change which schema its
-- identifiers resolve to. Pinning it removes that.
--
-- Empty search_path is safe here: pg_catalog is always searched implicitly, so
-- now() still resolves, and the function references no tables of its own.
-- Replacing the function does not disturb the triggers that call it.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ===========================================================================
-- FIX 2 of 2 - lint 0025: public_bucket_allows_listing
-- ===========================================================================
-- The product-images bucket is already public, so image URLs are served
-- without any policy. This policy therefore added nothing for displaying
-- images - but it did grant the storage list() API, letting anyone enumerate
-- every object in the bucket, including images belonging to unpublished or
-- deleted products.
--
-- Every application path to this bucket (list, upload, remove) runs
-- server-side with the service role key, which bypasses RLS entirely. Dropping
-- this policy does not affect the storefront or the admin media library.

drop policy if exists "Public can read product image files" on storage.objects;


-- ===========================================================================
-- VERIFY
-- ===========================================================================

-- 1. Expect one row, with proconfig containing search_path=.
select p.proname,
       p.proconfig as search_path_setting
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
   and p.proname = 'set_updated_at';

-- 2. Expect the bucket to still be public = true (images keep working).
select id, public
  from storage.buckets
 where id = 'product-images';

-- 3. Expect ZERO rows for the dropped policy.
select policyname
  from pg_policies
 where schemaname = 'storage'
   and tablename = 'objects'
   and policyname = 'Public can read product image files';


-- ===========================================================================
-- AFTER RUNNING
-- ===========================================================================
-- Re-run the advisors. The two WARN items above should be gone.
--
-- Two things this script deliberately does NOT touch:
--
-- 1. auth_leaked_password_protection is a dashboard toggle and cannot be set
--    from SQL. Enable it at:
--      Authentication > Providers > Email > "Prevent use of leaked passwords"
--
-- 2. The six rls_enabled_no_policy INFO items are the intended design and must
--    be left alone. RLS enabled with zero policies means deny-all for the anon
--    and authenticated roles - no browser-held key can touch those tables. The
--    server reaches them with the service role key, which bypasses RLS.
--
--    Adding a policy to orders or customers to "resolve" the advisory would
--    expose customer names, phone numbers, delivery addresses and full order
--    history to anyone holding the public anon key, which is embedded in the
--    browser bundle and readable by any visitor. The advisory is confirming
--    those tables are locked down, not reporting a defect.
--
--    Sanity check - expect ZERO rows:
--      select tablename, policyname, roles, cmd
--        from pg_policies
--       where schemaname = 'public'
--         and tablename in ('orders', 'order_items', 'order_status_history',
--                           'customers', 'admin_profiles', 'site_settings');
