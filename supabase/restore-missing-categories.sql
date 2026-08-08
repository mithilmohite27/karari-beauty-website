-- Karari Beauty - restore four missing category rows
--
-- PROBLEM
-- The categories table holds 9 rows, but live products reference 13 distinct
-- category slugs. Four categories have products but no category row:
--
--   crockery         8 active products
--   wedding-baskets  6 active products
--   watches          6 active products
--   ladies-wear      6 active products
--                   -- 26 products in total
--
-- Because navigation, the homepage category grid and /collections/[slug] all
-- resolve through the categories table, those 26 products are unreachable by
-- browsing. /collections/watches currently returns the same "Collection Not
-- Found" page as a nonsense URL, despite six live, purchasable products
-- sitting behind it.
--
-- The products themselves are fine - is_active = true and individually
-- reachable at /products/[slug]. Only the parent category rows are missing.
--
-- Copy of the category content below is taken from data/categories.js, which
-- is the app's bundled fallback definition of these same categories.
--
-- Safe to re-run: inserts are keyed on the unique slug and do nothing if the
-- row already exists.


-- ---------------------------------------------------------------------------
-- 1. BEFORE - confirm the problem (read-only)
-- ---------------------------------------------------------------------------
-- Expect four rows, each with a product count and no matching category.
select p.category_slug,
       count(*) filter (where p.is_active) as active_products,
       (c.id is not null)                  as category_row_exists
  from public.products p
  left join public.categories c on c.slug = p.category_slug
 where p.category_slug is not null
 group by p.category_slug, (c.id is not null)
 having (c.id is not null) = false
 order by active_products desc;


-- ---------------------------------------------------------------------------
-- 2. RESTORE the missing categories
-- ---------------------------------------------------------------------------
-- sort_order continues from the existing rows (highest currently in use is 11).
-- is_active = true so they appear immediately; set featured individually later
-- from the admin panel if any should be promoted on the homepage.

insert into public.categories (name, slug, description, product_count_label, featured, sort_order, is_active)
values
  ('Watches',         'watches',         'Trendy watches and personal gifting essentials.',   'Gift Picks',  false, 12, true),
  ('Crockery',        'crockery',        'Elegant crockery and home gifting selections.',     'Home Gifts',  false, 13, true),
  ('Ladies'' Wear',   'ladies-wear',     'Fashion pieces and accessories curated for women.', 'Style Picks', false, 14, true),
  ('Wedding Baskets', 'wedding-baskets', 'Decorative baskets for weddings and special moments.', 'Custom Made', false, 15, true)
on conflict (slug) do nothing;


-- ---------------------------------------------------------------------------
-- 3. RELINK the orphaned products
-- ---------------------------------------------------------------------------
-- These products carry category_slug but their category_id is null, because
-- there was no category row to point at. Repair the foreign key so admin
-- filtering and category deletion guards work correctly.

update public.products p
   set category_id = c.id,
       category_name = coalesce(nullif(trim(p.category_name), ''), c.name)
  from public.categories c
 where p.category_slug = c.slug
   and p.category_id is distinct from c.id;


-- ---------------------------------------------------------------------------
-- 4. AFTER - verify (read-only)
-- ---------------------------------------------------------------------------
-- 4a. Expect ZERO rows: no category_slug should lack a category row.
select p.category_slug, count(*) as products
  from public.products p
  left join public.categories c on c.slug = p.category_slug
 where p.category_slug is not null
   and c.id is null
 group by p.category_slug;

-- 4b. Every category with its live product count. All 13 should be listed.
select c.slug,
       c.name,
       c.is_active,
       c.sort_order,
       count(p.id) filter (where p.is_active) as active_products
  from public.categories c
  left join public.products p on p.category_slug = c.slug
 group by c.slug, c.name, c.is_active, c.sort_order
 order by c.sort_order, c.slug;


-- ---------------------------------------------------------------------------
-- 5. TWO REMAINING PRODUCTS NEED A HUMAN DECISION
-- ---------------------------------------------------------------------------
-- Two active products have no category_slug at all. They cannot be placed
-- automatically because there is nothing to infer the category from - assign
-- them in the admin panel, or here once you know where they belong.

select id, name, slug, price, created_at
  from public.products
 where is_active = true
   and (category_slug is null or trim(category_slug) = '')
 order by created_at desc;


-- ---------------------------------------------------------------------------
-- 6. OPTIONAL - duplicate sort_order
-- ---------------------------------------------------------------------------
-- 'umbrella' and 'handbags' both sit at sort_order = 3, so their relative
-- order in navigation is decided by the name tiebreaker rather than intent.
-- Uncomment to separate them.
--
-- update public.categories set sort_order = 4 where slug = 'handbags';
