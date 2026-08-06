-- Karari Beauty - Phase 2: inventory, payment integrity and performance
--
-- Run this in the Supabase SQL editor for project pwdbvmplcftqnrnyizkf AFTER
-- supabase/schema.sql. It is idempotent and safe to re-run.
--
-- Sections:
--   1. Diagnostics      - read-only, run first and keep the output
--   2. Inventory        - stock tracking the storefront currently has no column for
--   3. Payment integrity- webhook idempotency support
--   4. Indexes          - covering the query shapes the app actually issues
--   5. RLS verification - confirm no table is publicly readable by accident


-- ---------------------------------------------------------------------------
-- 1. DIAGNOSTICS (read-only)
-- ---------------------------------------------------------------------------

-- 1a. Is RLS enabled everywhere, and does each table have policies?
select c.relname                                        as table_name,
       c.relrowsecurity                                 as rls_enabled,
       (select count(*)
          from pg_policies p
         where p.schemaname = 'public'
           and p.tablename = c.relname)                 as policy_count,
       coalesce(s.n_live_tup, 0)                        as approx_rows
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  left join pg_stat_user_tables s
         on s.relname = c.relname and s.schemaname = 'public'
 where n.nspname = 'public'
   and c.relkind = 'r'
 order by c.relname;

-- 1b. Which indexes exist, and which have never been used?
select relname as table_name,
       indexrelname as index_name,
       idx_scan as times_used,
       pg_size_pretty(pg_relation_size(indexrelid)) as size
  from pg_stat_user_indexes
 where schemaname = 'public'
 order by idx_scan asc, relname;

-- 1c. Sequential scans on large tables signal a missing index.
select relname as table_name,
       seq_scan,
       seq_tup_read,
       idx_scan,
       n_live_tup
  from pg_stat_user_tables
 where schemaname = 'public'
 order by seq_tup_read desc;

-- 1d. Confirm the storefront catalog query plan uses an index rather than a
--     full scan. This is the single hottest read in the application.
explain (analyze, buffers)
select id, slug, name, price, image_url, category_slug, is_featured, sort_order
  from public.products
 where is_active = true
 order by sort_order asc, name asc;


-- ---------------------------------------------------------------------------
-- 2. INVENTORY
-- ---------------------------------------------------------------------------
-- The schema tracks stock_status as a label but has no quantity, so a paid
-- order cannot decrement anything. NULL means "not tracked" for this product,
-- which keeps every existing row behaving exactly as it does today.

alter table public.products
  add column if not exists stock_quantity integer;

alter table public.products
  drop constraint if exists products_stock_quantity_check;
alter table public.products
  add constraint products_stock_quantity_check
  check (stock_quantity is null or stock_quantity >= 0);

-- Marks an order's stock as already deducted, so a webhook retry cannot
-- decrement the same order twice.
alter table public.orders
  add column if not exists inventory_applied boolean not null default false;


-- ---------------------------------------------------------------------------
-- 3. PAYMENT INTEGRITY
-- ---------------------------------------------------------------------------

-- Razorpay delivers payment.captured more than once, and the browser's verify
-- call races the webhook. Doing the check-and-decrement in one locked
-- statement is what makes double-processing impossible; an app-side
-- read-then-write cannot close that window.
create or replace function public.apply_order_inventory(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_applied boolean;
begin
  -- Serialises concurrent callers for this order.
  select inventory_applied
    into v_applied
    from public.orders
   where id = p_order_id
     for update;

  if not found then
    raise exception 'Order % not found', p_order_id;
  end if;

  if v_applied then
    return;
  end if;

  update public.products p
     set stock_quantity = greatest(p.stock_quantity - oi.quantity, 0),
         stock_status = case
                          when greatest(p.stock_quantity - oi.quantity, 0) = 0 then 'out_of_stock'
                          else p.stock_status
                        end
    from public.order_items oi
   where oi.order_id = p_order_id
     and oi.product_id = p.id
     and p.stock_quantity is not null;

  update public.orders
     set inventory_applied = true
   where id = p_order_id;
end;
$$;

-- Only the server (service role) may run this. It must never be callable from
-- browser code holding the anon or a customer key.
revoke all on function public.apply_order_inventory(uuid) from public, anon, authenticated;
grant execute on function public.apply_order_inventory(uuid) to service_role;

-- A Razorpay order id maps to exactly one internal order. Without this, a bug
-- or replay could attach two orders to one payment and updates would be
-- non-deterministic.
create unique index if not exists idx_orders_razorpay_order_id_unique
  on public.orders (razorpay_order_id)
  where razorpay_order_id is not null;


-- ---------------------------------------------------------------------------
-- 4. INDEXES
-- ---------------------------------------------------------------------------

-- The storefront only ever reads active products in this exact order, so a
-- partial index matching the predicate keeps the hot path off a full scan.
create index if not exists idx_products_active_sorted
  on public.products (sort_order asc, name asc)
  where is_active = true;

create index if not exists idx_products_active_category
  on public.products (category_slug)
  where is_active = true;

-- Admin order search runs ILIKE '%term%' across these columns; a btree index
-- cannot serve a leading wildcard, so trigram indexes are required.
create extension if not exists pg_trgm;

create index if not exists idx_orders_order_number_trgm
  on public.orders using gin (order_number gin_trgm_ops);
create index if not exists idx_orders_customer_name_trgm
  on public.orders using gin (customer_name gin_trgm_ops);
create index if not exists idx_orders_customer_phone_trgm
  on public.orders using gin (customer_phone gin_trgm_ops);
create index if not exists idx_orders_customer_email_trgm
  on public.orders using gin (customer_email gin_trgm_ops);

-- Admin list sorts by created_at desc and filters by status.
create index if not exists idx_orders_status_created_at
  on public.orders (status, created_at desc);

analyze public.products;
analyze public.orders;


-- ---------------------------------------------------------------------------
-- 5. RLS VERIFICATION
-- ---------------------------------------------------------------------------
-- Expect ZERO rows. Any row here is a table the public anon key can read.
-- orders, order_items, customers, admin_profiles and site_settings must never
-- appear in this result.

select tablename, policyname, roles, cmd, qual
  from pg_policies
 where schemaname = 'public'
   and tablename in ('orders', 'order_items', 'order_status_history',
                     'customers', 'admin_profiles', 'site_settings')
   and ('anon' = any (roles) or 'public' = any (roles));

-- Confirm RLS is enabled on every table (expect zero rows).
select c.relname as table_without_rls
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public'
   and c.relkind = 'r'
   and c.relrowsecurity = false;


-- ---------------------------------------------------------------------------
-- 6. SUPABASE ADVISOR FIXES
-- ---------------------------------------------------------------------------

-- 6a. lint 0011 function_search_path_mutable - public.set_updated_at
-- Pin search_path so a role-level setting cannot redirect identifier
-- resolution inside the trigger. pg_catalog is still searched implicitly, so
-- now() continues to resolve.
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

-- 6b. lint 0025 public_bucket_allows_listing - product-images
-- The bucket is public, so image URLs are served without any policy. This
-- policy only granted the storage list() API, letting anyone enumerate every
-- object in the bucket. All app access uses the service role, which bypasses
-- RLS, so dropping it does not affect uploads or the admin media library.
drop policy if exists "Public can read product image files" on storage.objects;

-- Verify: product images still load, and listing is refused for anon.
select id, name, public from storage.buckets where id = 'product-images';
select policyname
  from pg_policies
 where schemaname = 'storage'
   and tablename = 'objects';


-- ---------------------------------------------------------------------------
-- 7. ADVISORIES THAT NEED NO CODE CHANGE
-- ---------------------------------------------------------------------------
--
-- lint 0008 rls_enabled_no_policy on orders, order_items, order_status_history,
-- customers, admin_profiles and site_settings is INFO level and is the intended
-- design, not a defect.
--
-- RLS enabled with zero policies means deny-all for the anon and authenticated
-- roles: no browser-side key can read or write those tables at all. The server
-- reaches them with the service role key, which bypasses RLS by design.
--
-- Do NOT "resolve" these by adding policies. Adding a permissive policy to
-- orders or customers would expose customer names, phone numbers, addresses and
-- order history to anyone holding the public anon key, which is embedded in the
-- browser bundle. The advisory is telling you the tables are locked down.
--
-- Confirm deny-all is real (expect zero rows):
select tablename, policyname, roles, cmd
  from pg_policies
 where schemaname = 'public'
   and tablename in ('orders', 'order_items', 'order_status_history',
                     'customers', 'admin_profiles', 'site_settings');
--
-- auth_leaked_password_protection is a dashboard toggle and cannot be set from
-- SQL. Enable it at:
--   Authentication > Providers > Email > "Prevent use of leaked passwords"

