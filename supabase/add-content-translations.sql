-- Karari Beauty - translations for catalogue content
--
-- WHY THIS EXISTS
-- The UI chrome (navigation, buttons, form labels) is translated in code by
-- lib/i18n/dictionaries.js. Catalogue content is not, and cannot be: product
-- names, descriptions and category copy live in these tables as single text
-- columns entered by the admin.
--
-- Without this migration, switching the site to Hindi translates the buttons
-- and leaves every product in English. This adds a place to store the other
-- languages, with the existing columns remaining the default.
--
-- SHAPE
-- A single jsonb column per table, keyed by language code:
--
--   {
--     "hi": {
--       "name": "रेशम राखी सेट",
--       "short_description": "...",
--       "description": "..."
--     }
--   }
--
-- jsonb rather than a translations table because there are only a handful of
-- translatable fields, they are always read together with the parent row, and
-- this avoids a join on the hottest query in the application (the catalogue
-- read). Adding a third language means adding a key, not a migration.
--
-- Safe to re-run.


-- ---------------------------------------------------------------------------
-- 1. COLUMNS
-- ---------------------------------------------------------------------------

alter table public.products
  add column if not exists translations jsonb not null default '{}'::jsonb;

alter table public.categories
  add column if not exists translations jsonb not null default '{}'::jsonb;

-- Reject anything that is not a JSON object, so a malformed write cannot make
-- the storefront read fail.
alter table public.products drop constraint if exists products_translations_is_object;
alter table public.products add constraint products_translations_is_object
  check (jsonb_typeof(translations) = 'object');

alter table public.categories drop constraint if exists categories_translations_is_object;
alter table public.categories add constraint categories_translations_is_object
  check (jsonb_typeof(translations) = 'object');


-- ---------------------------------------------------------------------------
-- 2. EXAMPLE - translating one product
-- ---------------------------------------------------------------------------
-- Replace the slug and text. jsonb_set with create_if_missing preserves any
-- other languages already stored on the row.
--
-- update public.products
--    set translations = jsonb_set(
--          translations,
--          '{hi}',
--          jsonb_build_object(
--            'name',              'रेशम राखी सेट',
--            'short_description', 'भाई के लिए पारंपरिक रेशम राखी।',
--            'description',       'हाथ से बनी रेशम राखी, रोली और चावल के साथ।'
--          ),
--          true
--        )
--  where slug = 'divine-spiritual-om-rakhi';


-- ---------------------------------------------------------------------------
-- 3. PROGRESS - what still needs translating
-- ---------------------------------------------------------------------------
-- Run after each batch to see how much of the catalogue is covered.

select count(*)                                                as total_active_products,
       count(*) filter (where translations ? 'hi')             as translated_hi,
       count(*) filter (where not (translations ? 'hi'))       as remaining_hi
  from public.products
 where is_active = true;

select slug, name
  from public.products
 where is_active = true
   and not (translations ? 'hi')
 order by sort_order, name
 limit 50;


-- ---------------------------------------------------------------------------
-- 4. AFTER RUNNING THIS
-- ---------------------------------------------------------------------------
-- The columns exist and default to '{}', so nothing changes on the storefront
-- until rows are populated. Products without a translation fall back to the
-- English columns, which means the site is never half-broken - it is simply
-- less translated in places.
--
-- The admin panel has no editor for this field yet. Until it does, translations
-- are entered here in SQL. That editor is the natural next piece of work if the
-- client intends to maintain Hindi copy themselves.
