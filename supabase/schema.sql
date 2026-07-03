-- Karari Beauty Supabase schema
-- Phase 1 foundation only: database, security policies, and future admin/auth support.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  product_count_label text,
  image_url text,
  featured boolean default false,
  sort_order int default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text unique not null,
  sku text,
  description text,
  short_description text,
  price numeric(10,2) not null default 0 check (price >= 0),
  original_price numeric(10,2) check (original_price is null or original_price >= 0),
  discount_label text,
  rating numeric(2,1) check (rating is null or (rating >= 0 and rating <= 5)),
  badge text,
  offer text,
  image_url text,
  category_name text,
  category_slug text,
  tags text[] default '{}',
  is_featured boolean default false,
  is_active boolean default true,
  stock_status text default 'in_stock' check (stock_status in ('in_stock', 'low_stock', 'out_of_stock', 'made_to_order', 'preorder')),
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  image_url text not null,
  storage_path text,
  alt_text text,
  is_main boolean default false,
  sort_order int default 0,
  created_at timestamptz default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text,
  phone text,
  email text,
  country text,
  city text,
  address text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null,
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text,
  customer_phone text,
  customer_email text,
  delivery_country text,
  delivery_city text,
  delivery_address text,
  order_type text default 'domestic' check (order_type in ('domestic', 'international')),
  payment_preference text,
  subtotal numeric(10,2) default 0 check (subtotal >= 0),
  discount_amount numeric(10,2) default 0 check (discount_amount >= 0),
  total_amount numeric(10,2) default 0 check (total_amount >= 0),
  status text default 'new' check (status in ('new', 'confirmed', 'processing', 'packed', 'shipped', 'delivered', 'cancelled')),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  product_slug text,
  product_image text,
  category_slug text,
  unit_price numeric(10,2) not null default 0 check (unit_price >= 0),
  quantity int not null default 1 check (quantity > 0),
  line_total numeric(10,2) not null default 0 check (line_total >= 0),
  created_at timestamptz default now()
);

create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  from_status text,
  to_status text not null,
  note text,
  changed_by uuid references auth.users(id) on delete set null,
  changed_by_name text,
  created_at timestamptz default now()
);

create table if not exists public.seasonal_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  theme text,
  is_active boolean default false,
  start_date date,
  end_date date,
  hero_title text,
  hero_subtitle text,
  offer_label text,
  featured_category_slugs text[] default '{}',
  config jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.admin_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text default 'admin' check (role in ('owner', 'admin')),
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.admin_profiles drop constraint if exists admin_profiles_role_check;
alter table public.admin_profiles add constraint admin_profiles_role_check check (role in ('owner', 'admin'));

alter table public.products drop constraint if exists products_stock_status_check;
alter table public.products add constraint products_stock_status_check check (stock_status in ('in_stock', 'low_stock', 'out_of_stock', 'made_to_order', 'preorder'));

drop trigger if exists set_categories_updated_at on public.categories;
create trigger set_categories_updated_at before update on public.categories for each row execute function public.set_updated_at();

drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at before update on public.products for each row execute function public.set_updated_at();

drop trigger if exists set_customers_updated_at on public.customers;
create trigger set_customers_updated_at before update on public.customers for each row execute function public.set_updated_at();

drop trigger if exists set_orders_updated_at on public.orders;
create trigger set_orders_updated_at before update on public.orders for each row execute function public.set_updated_at();

drop trigger if exists set_seasonal_campaigns_updated_at on public.seasonal_campaigns;
create trigger set_seasonal_campaigns_updated_at before update on public.seasonal_campaigns for each row execute function public.set_updated_at();

drop trigger if exists set_admin_profiles_updated_at on public.admin_profiles;
create trigger set_admin_profiles_updated_at before update on public.admin_profiles for each row execute function public.set_updated_at();

create index if not exists idx_categories_slug on public.categories(slug);
create index if not exists idx_categories_active_featured on public.categories(is_active, featured);
create index if not exists idx_categories_sort_order on public.categories(sort_order);

create index if not exists idx_products_slug on public.products(slug);
create index if not exists idx_products_category_slug on public.products(category_slug);
create index if not exists idx_products_active_featured on public.products(is_active, is_featured);
create index if not exists idx_products_sort_order on public.products(sort_order);

create index if not exists idx_product_images_product_id on public.product_images(product_id);
create index if not exists idx_product_images_sort_order on public.product_images(sort_order);

create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_created_at on public.orders(created_at desc);
create index if not exists idx_order_items_order_id on public.order_items(order_id);
create index if not exists idx_order_status_history_order_id on public.order_status_history(order_id);
create index if not exists idx_order_status_history_created_at on public.order_status_history(created_at desc);

create index if not exists idx_seasonal_campaigns_slug on public.seasonal_campaigns(slug);
create index if not exists idx_seasonal_campaigns_active_dates on public.seasonal_campaigns(is_active, start_date, end_date);

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;
alter table public.seasonal_campaigns enable row level security;
alter table public.admin_profiles enable row level security;

-- Public storefront reads are allowed only for active catalog/campaign records.
-- Customer, order, order_items, order_status_history and admin_profiles data intentionally have no public read policy.
-- Future order creation should happen through a server-side API/function using the service role key.

drop policy if exists "Public can read active categories" on public.categories;
create policy "Public can read active categories"
on public.categories for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Public can read active products" on public.products;
create policy "Public can read active products"
on public.products for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Public can read images for active products" on public.product_images;
create policy "Public can read images for active products"
on public.product_images for select
to anon, authenticated
using (
  exists (
    select 1
    from public.products
    where products.id = product_images.product_id
      and products.is_active = true
  )
);

drop policy if exists "Public can read active seasonal campaigns" on public.seasonal_campaigns;
create policy "Public can read active seasonal campaigns"
on public.seasonal_campaigns for select
to anon, authenticated
using (
  is_active = true
  and (start_date is null or start_date <= current_date)
  and (end_date is null or end_date >= current_date)
);
