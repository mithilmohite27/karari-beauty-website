# Karari Beauty Website

Premium Karari Beauty ecommerce website with storefront collections, product pages, checkout/order requests and a Supabase-backed admin CMS.

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
- `data/seasonalCampaign.js` - Local fallback Raksha Bandhan campaign settings when Supabase is not configured.
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

For the live website, manage seasonal campaigns from `/admin/campaigns`.

- Activate one campaign to show the seasonal homepage state.
- Deactivate the active campaign to return to the normal Karari Beauty homepage.
- A refresh is enough after admin changes; a code redeploy should not be required.

`data/seasonalCampaign.js` is only a local fallback when Supabase is not configured or a Supabase read fails.

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
- `order_status_history`
- `seasonal_campaigns`
- `admin_profiles`
- `site_settings`

The schema includes updated-at triggers, indexes, basic check constraints and Row Level Security.

Security notes:

- Public reads are allowed only for active categories, products, product images for active products, and active seasonal campaigns.
- Customers, orders, order items, order status history, admin profiles and site settings are not publicly readable.
- Site settings are read through the server service layer using the server-only service role key.
- Future order creation should happen through a server-side API or function using the service role key.
- Run `supabase/schema.sql` after database schema changes.
- Run `supabase/storage.sql` after storage bucket or storage policy changes.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` in browser/client code or public repositories.

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

Live CMS behavior:

- Homepage, collection pages and product detail pages are rendered dynamically so admin product/category/campaign changes can appear after refresh.
- If Supabase is configured and no active in-date campaign exists, the homepage shows the normal non-seasonal storefront.
- If admin changes do not reflect on Vercel, verify these environment variables are set and redeploy after changing env vars:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`

### Order API

Cash on Delivery checkout posts order requests to:

```bash
POST /api/orders
```

Online payments use Razorpay Standard Checkout:

```bash
POST /api/payments/razorpay/create-order
POST /api/payments/razorpay/verify
POST /api/webhooks/razorpay
```

Checkout behavior:

- Product cards, quick view and product detail pages can send a single item to checkout with Buy Now.
- Buy Now uses temporary session checkout storage and does not overwrite the customer cart.
- Checkout requires a signed-in Supabase customer session.
- Online payment creates a Razorpay order server-side and verifies the Razorpay signature before clearing the cart.
- Successful Razorpay payment saves `payment_status = paid` and confirms the order.
- Failed/cancelled Razorpay payment keeps the cart available for retry.
- Cash on Delivery is available only when total quantity is 10 or more and every selected product has COD enabled.
- COD orders save `payment_status = cod_pending`.
- No gateway charge is shown separately to customers.

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
  "paymentMethod": "cod",
  "paymentPreference": "Cash on Delivery",
  "orderType": "Domestic Order",
  "items": [
    {
      "productId": "rakhi-om-blue",
      "slug": "divine-spiritual-om-rakhi",
      "name": "Divine Spiritual Om Rakhi",
      "price": 449,
      "quantity": 10,
      "image": "/hero/raksha-bandhan-2026.png",
      "categorySlug": "rakhi"
    }
  ]
}
```

Expected COD response:

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

Razorpay setup:

1. Create a Razorpay account and complete required onboarding/KYC.
2. Use Test Mode first.
3. Add these env variables locally and in Vercel:
   - `NEXT_PUBLIC_RAZORPAY_KEY_ID`
   - `RAZORPAY_KEY_ID`
   - `RAZORPAY_KEY_SECRET`
   - `RAZORPAY_WEBHOOK_SECRET`
4. Set Razorpay webhook URL to `/api/webhooks/razorpay`.
5. Test online payment, failed/cancelled payment, COD disabled below 10 quantity and COD enabled only for eligible products.
6. Switch to Live Mode only after Razorpay approval.

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

## Product Delete and Bulk Management

The admin products screen supports safe product cleanup from `/admin/products`.

Available actions:

- Select one or more visible products.
- Hide selected products from the website.
- Delete selected products permanently.
- Edit, hide or permanently delete a single product from its row actions.

Safety behavior:

- Hide from website sets products inactive and keeps them saved in admin.
- Permanent delete removes dummy or test products from the database.
- Permanent delete is owner-only.
- Admin users can create, edit and hide products, but cannot permanently delete them.
- Products linked to `order_items` cannot be permanently deleted. Hide them from the website instead.
- Product image database rows are removed by cascade when supported by the schema.
- Storage files are not directly deleted in this phase.

Product admin API routes:

- `DELETE /api/admin/products/[id]` hides a product by default.
- `DELETE /api/admin/products/[id]?mode=hard` permanently deletes one product when allowed.
- `POST /api/admin/products/bulk` handles bulk hide and owner-only bulk permanent delete.

No manual SQL is needed to remove dummy/test products after this phase.

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

## Admin Category CRUD Phase 6A

The admin categories section now supports category management:

- Add category from `/admin/categories`.
- Edit category details.
- Deactivate categories instead of hard deleting them.
- Use an image URL or existing local asset path for category images.

Category admin API routes:

- `POST /api/admin/categories`
- `GET /api/admin/categories/[id]`
- `PATCH /api/admin/categories/[id]`
- `DELETE /api/admin/categories/[id]`

Security and behavior:

- Mutation routes verify a signed-in active admin server-side.
- Only `owner` and `admin` roles can mutate categories.
- `SUPABASE_SERVICE_ROLE_KEY` remains server-only.
- Missing Supabase setup returns `Supabase setup required` for category mutations.
- Delete is a safe soft deactivate: categories are marked inactive and hidden from public active category lists.
- Existing products are not deleted or reassigned when a category is deactivated.

Category fields:

- Name
- Slug
- Description
- Product count label
- Image URL
- Featured
- Active
- Sort order

Next admin phase:

- Seasonal campaign manager.

## Admin Seasonal Campaign Manager Phase 6B

The admin campaigns section now supports seasonal campaign management:

- Add campaign from `/admin/campaigns`.
- Edit campaign details.
- Activate a campaign.
- Deactivate a campaign instead of hard deleting it.
- Manage featured category slugs through category checkboxes.
- Keep advanced visual settings as collapsed JSON.

Campaign admin API routes:

- `POST /api/admin/campaigns`
- `GET /api/admin/campaigns/[id]`
- `PATCH /api/admin/campaigns/[id]`
- `DELETE /api/admin/campaigns/[id]`
- `POST /api/admin/campaigns/[id]/activate`

Security and behavior:

- Mutation routes verify a signed-in active admin server-side.
- Only `owner` and `admin` roles can mutate campaigns.
- `SUPABASE_SERVICE_ROLE_KEY` remains server-only.
- Missing Supabase setup returns `Supabase setup required` for campaign mutations.
- Delete is a safe soft deactivate.
- Only one campaign can be active at a time; activating one campaign deactivates the others server-side.

Campaign fields:

- Name
- Slug
- Theme
- Active
- Start date
- End date
- Hero title
- Hero subtitle
- Offer label
- Featured category slugs
- Config JSON

Storefront behavior:

- Public seasonal homepage continues to use the existing active campaign service.
- If no active in-date campaign exists, the storefront falls back safely.
- This phase does not redesign campaign visuals.

Next admin phase:

- Orders dashboard and status workflow.

## Admin Orders Dashboard Phase 7

The admin orders section now supports professional order management:

- View live customer orders from `/admin/orders`.
- Search by order number, customer name, phone or email.
- Filter by order status.
- Sort by newest, oldest, total high to low, or total low to high.
- Open an order management drawer.
- Review customer details, delivery details, ordered items and payment preference.
- Update order status.
- Add internal admin notes.
- Track order timeline/history.

Order admin API routes:

- `GET /api/admin/orders`
- `GET /api/admin/orders/[id]`
- `PATCH /api/admin/orders/[id]`

Order statuses:

- New Order
- Confirmed
- Processing
- Packed
- Shipped
- Delivered
- Cancelled

New SQL table:

- `order_status_history`

The timeline table stores:

- order id
- previous status
- new status
- internal note
- admin user id
- admin display name
- created date

Security and behavior:

- Order admin routes require signed-in active admin access.
- Order mutations require `owner` or `admin` role.
- `SUPABASE_SERVICE_ROLE_KEY` remains server-only.
- No public read policy is added for `order_status_history`.
- Orders are not hard deleted in this phase.
- Public storefront pages are not redesigned.
- Payment gateway, shipping API, WhatsApp automation and AI are not included.

Important Supabase step:

After deploying this phase, run updated `supabase/schema.sql` or the new `order_status_history` migration in Supabase SQL editor before testing live admin timeline.

Testing:

- Run `npm run lint`.
- Run `npm run build`.
- Open `/admin/orders`.
- Open an order detail drawer.
- Update status with an internal note.
- Confirm a row is created in `order_status_history`.

## Admin Customers Phase 8

The admin customers section now supports customer management and manual communication helpers:

- View customers from `/admin/customers`.
- Search by customer name, phone, email, city or country.
- Sort by newest, oldest, most orders, highest spent or recently ordered.
- Open a customer detail drawer.
- Review customer contact details, location, order history and customer stats.
- Generate manual WhatsApp message text.
- Copy generated message.
- Open a `wa.me` link when a phone number is available.

Customer admin API routes:

- `GET /api/admin/customers`
- `GET /api/admin/customers/[id]`

Notification helper behavior:

- Messages are generated from admin-selected templates.
- Messages are not sent automatically.
- Admin can copy the message manually.
- Admin can open WhatsApp manually if the customer has a phone number.
- Indian 10-digit numbers are normalized with `91`.
- Existing international numbers keep their detected country code digits.

Customer message templates:

- Order Received
- Order Confirmed
- Packed
- Shipped
- Delivered
- Custom Follow-up

Security and behavior:

- Customer routes require signed-in active admin access.
- Customer data is never exposed through public routes.
- `SUPABASE_SERVICE_ROLE_KEY` remains server-only.
- No public read policy is added for customers.
- No fake customers are shown in fallback mode.
- WhatsApp API automation, payment gateway, shipping API and AI are not included.

Supabase SQL:

- No new SQL is needed for Phase 8.
- Phase 8 uses the existing `customers` table and linked `orders` rows.

## Admin Media Library Phase 8A

The admin media library is available at:

- `/admin/media`

Media admin API routes:

- `GET /api/admin/media`
- `POST /api/admin/media`
- `DELETE /api/admin/media/delete`

Storage setup:

- Bucket name: `product-images`
- Setup file: `supabase/storage.sql`
- Supported upload types: JPG, PNG and WebP.
- Maximum upload size: 5MB.

Security and behavior:

- Media list, upload and delete routes require a signed-in active admin.
- Upload and delete operations run only through protected server API routes.
- `SUPABASE_SERVICE_ROLE_KEY` remains server-side only and is never sent to browser code.
- Public image URLs are returned so storefront images can display normally.
- If Supabase env vars are missing, the media page and APIs show setup-required behavior safely.
- Delete removes the stored image file only. Admins should avoid deleting images currently used by products, categories or campaigns.

Testing:

- Open `/admin/media`.
- Upload a JPG, PNG or WebP image smaller than 5MB.
- Confirm the image appears in the media grid.
- Copy the image link.
- Open the image link in a new tab.
- Delete the image after confirmation.
- Confirm existing product image upload still works from `/admin/products`.

## Admin Settings Phase 8B

The admin settings page is available at:

- `/admin/settings`

Settings admin API routes:

- `GET /api/admin/settings`
- `PATCH /api/admin/settings`

Managed settings:

- Business profile: business name, tagline, short description, logo URL and favicon URL.
- Contact details: WhatsApp number, phone number, email, address, city, state, country, Google Maps URL and timings.
- Social links: Instagram, Facebook and optional YouTube.
- Website defaults: default country, default currency, announcement line and international inquiry message.
- Ordering settings: checkout/order request toggle, WhatsApp support toggle and UPI/GPay display text for Razorpay-focused checkout copy.
- SEO basics: site title, meta description and Open Graph image URL.

Supabase table:

```sql
create table if not exists public.site_settings (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  value jsonb not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

Run the updated `supabase/schema.sql` in Supabase SQL editor before live settings testing.

Security and behavior:

- Settings routes require a signed-in active admin.
- Owners and admins can save settings.
- Storefront reads safe business settings through the server service layer.
- `SUPABASE_SERVICE_ROLE_KEY` remains server-side only.
- If Supabase is missing, unreachable or the settings row does not exist, the website uses local fallback business settings.
- No payment gateway, WhatsApp automation, AI or CMS extension is included in this phase.

Storefront connections:

- Homepage header business name, tagline, logo and announcement line.
- Footer brand, contact details, social links, Google Maps link and timings.
- Floating WhatsApp support link and business name.
- Homepage Store JSON-LD business/contact basics.

Testing:

- Open `/admin/settings`.
- Confirm unauthenticated `/api/admin/settings` returns auth-required.
- Sign in as admin or owner and save settings.
- Refresh the homepage and confirm connected header/footer/WhatsApp fields update.
- Confirm public pages still load if the settings row is missing.

## Admin + Storefront Integration Audit

Key audit fixes:

- Campaign admin copy now reflects active CRUD and activation features.
- Homepage campaign reads no longer fall back to the local Raksha campaign when Supabase is configured and no active in-date campaign exists.
- Homepage, collection pages and product pages are dynamic so CMS changes can appear after refresh without code redeploy.
- Collection routes allow newly created active category slugs to resolve without redeploy.
- Admin source labels use client-friendly wording such as `Live database` and `Local fallback`.
- Completed admin dashboard modules link to their management pages instead of showing coming-soon copy.

Expected live behavior:

- Active in-date Supabase campaign shows the seasonal homepage.
- No active in-date Supabase campaign shows the normal Karari Beauty homepage.
- Product and category admin changes reflect on public pages after refresh.
- A refresh may be required after admin updates, but a code redeploy should not be required.
