# Karari Beauty Website

Premium Phase 1 website for Karari Beauty with a normal boutique product showcase and a configurable Raksha Bandhan 2026 seasonal homepage.

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Project Structure

- `app/` - Next.js app routes, metadata and global styles.
- `components/HomeExperience.jsx` - Homepage, seasonal campaign UI, product cards, quick view, WhatsApp widget and sections.
- `data/businessSettings.js` - Business name, WhatsApp number, social handles, UPI placeholder and international messaging.
- `data/categories.js` - Main category showcase data.
- `data/products.js` - Local dummy product catalog.
- `data/seasonalCampaign.js` - Campaign activation and Raksha Bandhan 2026 settings.
- `data/giftCombos.js` - Gift combo and hamper data.
- `data/frequentlyBoughtTogether.js` - Frequently bought together product groups.
- `lib/whatsapp.js` - WhatsApp inquiry URL generator and currency formatter.
- `public/logo.png` - Karari Beauty logo asset.

## Dummy Products

Products are stored in `data/products.js`. Replace the placeholder names, prices, descriptions, SKUs and image URLs when the client shares real product details.

## Change WhatsApp Number

Update `whatsappNumber` in `data/businessSettings.js`.

Use the full country-code number without `+`, spaces or dashes:

```js
whatsappNumber: "919999999999"
```

## Turn Seasonal Campaign On or Off

Update `active` in `data/seasonalCampaign.js`.

```js
active: true
```

Set it to `false` to show the normal Karari Beauty homepage.

## Phase 1 Scope

Included:

- Premium responsive homepage.
- Normal product showcase categories.
- Raksha Bandhan 2026 seasonal homepage.
- Countdown to 28 August 2026.
- Soft Rakhi thread animation.
- Featured Rakhi products.
- Gift combos and premium hampers.
- Price collection chips.
- Frequently bought together UI.
- Product quick-view modal.
- WhatsApp inquiry URL flow.
- Floating WhatsApp chat widget.
- UPI/GPay placeholder messaging.
- International inquiry messaging.

Not included yet:

- Payment gateway.
- Real AI assistant.
- CMS/admin panel.
- Customer login.
- Ecommerce cart and checkout.

## Phase 2 Suggestions

- Add admin panel or CMS for products, prices, inventory and campaign scheduling.
- Add real product photography and optimized local image assets.
- Add enquiry tracking for WhatsApp leads.
- Add campaign auto-activation by date range.
- Add SEO collection pages for every category.
- Add analytics events for product view and inquiry clicks.
- Add payment collection only after the business workflow is finalized.

## Backend + Database Phase 1

This project now includes a Supabase foundation for future product, category, order, campaign, image and admin workflows. The current frontend still works without Supabase environment variables and continues to use local dummy data as a fallback.

### Environment Variables

Copy `.env.example` to `.env.local` for local development when Supabase is ready:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are public-safe Supabase client values.
- `SUPABASE_SERVICE_ROLE_KEY` is server-side only. Never expose it in client components, browser code, screenshots or public repositories.

### Create Supabase Project

1. Create a new Supabase project.
2. Open Project Settings > API.
3. Copy the project URL into `NEXT_PUBLIC_SUPABASE_URL`.
4. Copy the anon public key into `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
5. Copy the service role key into `SUPABASE_SERVICE_ROLE_KEY` only in server-side environments such as `.env.local` or Vercel project secrets.

### Database Schema

Run `supabase/schema.sql` in the Supabase SQL editor.

Tables created:

- `categories`
- `products`
- `product_images`
- `customers`
- `orders`
- `order_items`
- `seasonal_campaigns`
- `admin_profiles`

The schema includes updated-at triggers, indexes, basic check constraints and Row Level Security.

Security notes:

- Public reads are allowed only for active categories, products, product images for active products, and active seasonal campaigns.
- Customers, orders, order items and admin profiles are not publicly readable.
- Future order creation should happen through a server-side API or function using the service role key.

### Seed Data

Seed SQL is generated from the existing local data files:

```bash
npm run supabase:seed
```

Then run `supabase/seed.sql` in the Supabase SQL editor.

The current seed includes:

- All 12 Karari Beauty categories.
- Current local product catalog.
- Product image rows.
- Raksha Bandhan 2026 seasonal campaign.

### Service Layer

Server-safe data services live in:

- `lib/data/categories.js`
- `lib/data/products.js`
- `lib/data/orders.js`
- `lib/data/seasonalCampaigns.js`

Behavior:

- If Supabase env vars are configured, services attempt Supabase reads/writes.
- If Supabase env vars are missing, services fall back to local data.
- If a Supabase read fails, services log a safe server-side warning and fall back to local data.
- `createOrder()` returns a controlled mock response when Supabase is not configured.

Health check:

```bash
/api/health/db
```

Returns:

```json
{
  "configured": false,
  "ok": false
}
```

No secrets or env values are exposed.

### Next Phases

1. Connect storefront pages to the service layer.
2. Add secure server-side order creation from checkout.
3. Build the admin panel for products, categories, campaigns, orders and images.

## Backend + Storefront Phase 2

The storefront now reads data through the server-safe service layer instead of page-level direct local catalog imports.

Connected areas:

- Homepage fetches categories, products and active seasonal campaign through `lib/data/*`.
- Collection pages fetch category metadata, product lists and related categories through `lib/data/*`.
- Product detail pages fetch product data and related products through `lib/data/*`.
- Cart and checkout receive the service-layer product catalog for recently viewed and quick-view lookups.
- `sitemap.xml` is generated from the service layer.

Fallback behavior remains:

- If Supabase env vars are missing, service functions return local data from `data/products.js`, `data/categories.js` and `data/seasonalCampaign.js`.
- If a Supabase read fails, the service logs a safe server-side warning and returns local fallback data.
- Current cart, wishlist and recently viewed state still use localStorage.

### Order API

Checkout now posts order requests to:

```bash
POST /api/orders
```

The route validates customer details, delivery details and cart items, recalculates totals server-side, then calls `createOrder()` from `lib/data/orders.js`.

If Supabase service credentials are not configured, the API returns a controlled mock order response and the checkout flow still works.

Test payload:

```json
{
  "customer": {
    "fullName": "Demo Customer",
    "mobile": "9876543210",
    "email": "demo@example.com"
  },
  "delivery": {
    "country": "India",
    "city": "Vansda",
    "address": "Main Bazar"
  },
  "paymentPreference": "GPay / UPI",
  "orderType": "Domestic Order",
  "items": [
    {
      "productId": "rakhi-om-blue",
      "slug": "divine-spiritual-om-rakhi",
      "name": "Divine Spiritual Om Rakhi",
      "price": 449,
      "quantity": 1,
      "image": "/hero/raksha-bandhan-2026.png",
      "categorySlug": "rakhi"
    }
  ]
}
```

Expected fallback response without Supabase env vars:

```json
{
  "ok": true,
  "order": {
    "orderNumber": "KB-...",
    "mode": "mock",
    "orderId": "KB-..."
  }
}
```

Next phase:

- Admin auth and admin panel foundation.
- Admin product/category/campaign/order management.
- Secure image upload workflow through Supabase Storage.

## Admin Auth + Panel Phase 3

Admin foundation routes:

- `/admin/login` - Supabase email/password admin login.
- `/admin` - protected admin dashboard shell.

Required Supabase env vars:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Behavior:

- Public storefront routes continue to work without Supabase env vars.
- If Supabase is not configured, `/admin/login` and `/admin` show a setup-required message instead of crashing.
- Admin login uses Supabase Auth email/password.
- Admin access requires a matching active row in `admin_profiles`.
- The service role key is used only by server-side admin helpers and must never be exposed to browser/client code.

### Create First Admin User

1. In Supabase, create a user under Authentication.
2. Copy the Auth user id.
3. Run this SQL in the Supabase SQL editor:

```sql
insert into admin_profiles (id, full_name, role, is_active)
values ('AUTH_USER_ID_HERE', 'Karari Admin', 'owner', true);
```

Allowed admin roles:

- `owner`
- `admin`

The admin account must have `is_active = true`.

Current admin scope:

- Dashboard shell.
- Sidebar/topbar.
- Logout.
- Stats cards from the service layer.
- Coming-soon cards for products, categories, orders and campaigns.

Not included yet:

- Product CRUD.
- Category CRUD.
- Order management screens.
- Campaign manager.
- Media upload.

## Admin Management Phase 4

The admin panel now includes protected read-only management screens:

- `/admin/products`
- `/admin/categories`
- `/admin/orders`
- `/admin/campaigns`

Admin data APIs:

- `GET /api/admin/products`
- `GET /api/admin/categories`
- `GET /api/admin/orders`
- `GET /api/admin/campaigns`

Behavior:

- All admin management routes require Supabase admin setup and a signed-in active admin.
- If Supabase env vars are missing, admin pages show the setup-required screen instead of crashing.
- Product, category and campaign admin APIs can read from Supabase when configured and fall back to local catalog/campaign data where safe.
- Orders intentionally do not show fake customer data in fallback mode.
- The service role key remains server-only and is not exposed to client components.

Current admin management scope:

- Read-only tables.
- Search, filters and sorting.
- Compact details drawer.
- No create, edit, delete, media upload, payment handling or CMS features.

Next admin phase:

- Product create/edit/delete.
- Category and campaign editing.
- Secure image upload through Supabase Storage.
- Order status workflow.

## Admin Product CRUD Phase 5A

The admin products section now supports product management without image upload:

- Add product from `/admin/products`.
- Edit existing product details.
- Deactivate products instead of hard deleting them.
- Use `image_url` text input for pasted image URLs or existing local asset paths.

Product admin API routes:

- `POST /api/admin/products`
- `GET /api/admin/products/[id]`
- `PATCH /api/admin/products/[id]`
- `DELETE /api/admin/products/[id]`

Security and behavior:

- Mutation routes verify a signed-in active admin server-side.
- Only `owner` and `admin` roles can mutate products.
- `SUPABASE_SERVICE_ROLE_KEY` remains server-only.
- Missing Supabase setup returns `Supabase setup required` for product mutations.
- Delete is a safe soft delete: products are marked inactive and moved to `out_of_stock`.
- Public storefront product reads remain filtered to active products through the service layer.

Product validation:

- Name, slug and price are required.
- Slugs are normalized server-side.
- Duplicate slugs return a friendly error.
- Stock status is limited to `in_stock`, `low_stock`, `out_of_stock`, `made_to_order` or legacy `preorder`.
- Tags are stored as a text array.

Not included in Phase 5A:

- Image upload.
- Category CRUD.
- Campaign CRUD.
- Order status workflow.
- Payment gateway.

Next admin phase:

- Supabase Storage image upload and product image management.

## Admin Product Images Phase 5B

Product image upload and gallery management now work through secure admin APIs.

Storage setup:

- Bucket name: `product-images`
- Setup file: `supabase/storage.sql`
- Public read is enabled for product image URLs.
- Supported upload types: JPG, PNG and WebP.
- Maximum upload size: 5MB.

Admin image APIs:

- `POST /api/admin/uploads/product-image`
- `GET /api/admin/products/[id]/images`
- `POST /api/admin/products/[id]/images`
- `PATCH /api/admin/products/[id]/images/[imageId]`
- `DELETE /api/admin/products/[id]/images/[imageId]`

Behavior:

- Uploads go through the server API after active admin verification.
- Browser code never receives `SUPABASE_SERVICE_ROLE_KEY`.
- Main image upload updates the product form `image_url` value.
- Product gallery images are stored in `product_images`.
- Gallery images can be added by upload or URL after a product is saved.
- Gallery images can be set as the main product image.
- Removing a gallery image can also remove the stored file when `storage_path` is known.
- Products are never hard deleted.

Missing Supabase behavior:

- Admin products still load safely.
- Upload controls are disabled in fallback mode.
- Upload and gallery mutation APIs return setup-required safely.

Next admin phase:

- Category/campaign management or order workflow.
