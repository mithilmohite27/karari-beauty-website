# Karari Beauty Launch and Client Handover

## Client Links

- Website: https://kararibeauty.com
- Admin login: https://kararibeauty.com/admin/login
- Admin login email: `[CLIENT_ADMIN_EMAIL]`
- Admin password: share privately with the client; never store it in this repository.

## Client Admin Guide

### Add or Edit a Product

1. Sign in at `/admin/login` and open **Products**.
2. Select **Add Product**, or open an existing product and choose **Edit**.
3. Enter the product name, category, selling price, stock status, descriptions and visibility.
4. Upload the main image. Add gallery images after the product has been saved.
5. Use **Set main** on the preferred gallery image when required.
6. Save and refresh the public product page to confirm the change.

### Upload and Manage Images

1. Open **Media** in the admin sidebar.
2. Upload JPG, PNG or WebP images up to 5 MB.
3. Use **Copy image link** when an image URL is needed in another admin form.
4. Do not delete an image that is currently used by a product, category or campaign.

### Edit a Category

1. Open **Categories**.
2. Add or edit the category name, image, description, featured status and visibility.
3. Save, then refresh the homepage or collection page.
4. Deactivating a category hides it from public category lists without deleting its products.

### Manage Orders and Verify Payment

1. Open **Orders** and select an order.
2. Review customer, delivery, item and payment details.
3. For online orders, confirm the payment status and Razorpay payment reference before fulfilment.
4. Update the order status as it moves through confirmed, processing, packed, shipped and delivered.
5. Add internal notes when useful. Do not place passwords or payment secrets in notes.

### Activate or Deactivate a Campaign

1. Open **Campaigns**.
2. Edit campaign dates, hero content, offer label and featured categories.
3. Activate only the campaign that should appear publicly.
4. Refresh the homepage to confirm the campaign content.

### Update Business Settings

1. Open **Settings**.
2. Update business information, contact links, delivery copy and SEO fields.
3. Save and refresh the storefront.
4. Review the homepage, footer and browser metadata after major settings changes.

## Production Environment Variables

Configure these in Vercel for **Production**, and for Preview only when a preview deployment needs live integrations:

```env
NEXT_PUBLIC_SITE_URL=https://kararibeauty.com
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_RAZORPAY_KEY_ID=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
```

Rules:

- Never commit real values to Git.
- `SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` are server-only.
- The public and server Razorpay key IDs must use the same mode: both test or both live.
- Redeploy after changing environment variables.

## Supabase Production Setup

1. Run `supabase/schema.sql` in the Supabase SQL editor after schema changes.
2. Run `supabase/storage.sql` after storage bucket or storage policy changes.
3. Confirm the first owner/admin user exists in `admin_profiles` and has `is_active = true`.
4. Confirm the `product-images` storage bucket and its policies are present.
5. Never expose the service role key to client code or the client handover credentials.

The current schema includes categories, products, product images, customers, orders, order items, order history, campaigns, admin profiles and site settings, including Razorpay and COD fields.

## Vercel Domain Connection

Primary domain: `https://kararibeauty.com`

1. Import or open the Karari Beauty project in Vercel.
2. Add `kararibeauty.com` and `www.kararibeauty.com` under **Settings > Domains**.
3. At the domain registrar, add exactly the DNS records Vercel displays for each domain.
4. Set `kararibeauty.com` as the primary production domain.
5. Redirect `www.kararibeauty.com` to `kararibeauty.com` in Vercel.
6. Wait for Vercel to show valid configuration and issue the SSL certificate.
7. Set `NEXT_PUBLIC_SITE_URL=https://kararibeauty.com` and redeploy.
8. Verify HTTPS, the www redirect, canonical URLs, sitemap and social previews.

Do not remove existing mail-related DNS records while updating website DNS.

## Razorpay Launch Checklist

Keep Razorpay in Test Mode until every test below passes. Switch all three Razorpay keys to Live Mode together after account approval and client sign-off.

1. Open `/api/payments/razorpay/status` and confirm `configured: true` with the expected `keyMode`.
2. Complete a successful test payment and confirm the order becomes paid/confirmed.
3. Cancel or fail a test payment and confirm the cart remains available.
4. Submit **Pay after confirmation** and confirm `payment_status = pending_confirmation`.
5. Test COD below and above the quantity threshold with eligible and ineligible products.
6. Confirm payment details appear in the admin order drawer.
7. Configure the Razorpay webhook URL as `https://kararibeauty.com/api/webhooks/razorpay`.
8. Confirm webhook signature verification using the production webhook secret.

## Final Production Smoke Test

Public pages:

- `/`
- `/collections/rakhi`
- `/collections/jewellery`
- `/collections/handbags`
- One active `/products/{slug}` page with gallery images
- `/cart`
- `/checkout`
- `/sign-in`
- `/account`
- A deliberately invalid URL for the 404 page
- `/sitemap.xml`
- `/robots.txt`

Admin pages:

- `/admin/login`
- `/admin`
- `/admin/products`
- `/admin/categories`
- `/admin/orders`
- `/admin/customers`
- `/admin/campaigns`
- `/admin/media`
- `/admin/settings`

Confirm desktop and mobile layouts, no browser console-breaking errors, working WhatsApp links, current business information, correct campaign state, image loading, cart persistence and successful admin access.

## Go-Live Sign-off

Launch only after all of these are complete:

- Production environment variables configured.
- Latest `schema.sql` and `storage.sql` applied where required.
- Active owner/admin login verified.
- Domain and SSL verified.
- Successful and failed Razorpay tests verified.
- Manual order-request and COD paths verified.
- Storefront and admin smoke tests completed on the production domain.
- Client has received the admin URL and credentials through a private channel.
