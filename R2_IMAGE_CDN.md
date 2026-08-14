# Image CDN on Cloudflare R2

Product images are served as pre-generated WebP variants from Cloudflare R2
instead of being resized on demand. This document covers what the code does,
what is still manual, and how to turn it on and off.

## Why this exists

The site previously ran with `images.unoptimized: true`. That was a deliberate
fix: every trip through `/_next/image` consumes one of Vercel's metered image
transformations, and once the allowance ran out the optimizer returned HTTP 402
and product images rendered blank.

Turning optimization off stopped the outages but cost the responsive `srcset`.
A phone downloading a product grid was pulling the same 1600px WebP the desktop
gets, roughly four times the pixels it can display.

A custom `next/image` loader recovers the responsive behaviour without the
meter. Next.js still builds a full `srcset` and still picks the right width per
viewport, but each URL resolves to an object that was already resized at upload
time. No `/_next/image` request is made, so no transformation is consumed, and
an exhausted quota can never blank out the catalogue again.

## How an image is addressed

Each processed image is stored as one object per width:

```
products/rose-gold-bangle/rose-gold-bangle-main-400.webp
products/rose-gold-bangle/rose-gold-bangle-main-800.webp
products/rose-gold-bangle/rose-gold-bangle-main-1600.webp
```

The database stores only the shared prefix and the list of widths, in
`products.image_variants` and `product_images.variants`:

```json
{
  "base": "products/rose-gold-bangle/rose-gold-bangle-main",
  "widths": [400, 800, 1600],
  "blur": "data:image/webp;base64,...",
  "generatedAt": "2026-08-14T00:00:00.000Z"
}
```

Every URL is reconstructed from `base` and the requested width, so adding a
fourth width later needs no schema change.

`products.image_url` and `product_images.image_url` are unchanged and still hold
the original Supabase URLs. They remain the fallback for anything not yet
migrated, and the rollback path if the CDN is ever switched off.

### Two key namespaces, deliberately disjoint

`products.image_url` uses the reserved suffix `-main`. `product_images` rows use
their `sort_order` (`-0`, `-1`, ...). A gallery image at `sort_order 0` would
otherwise collide with its own product's main image, and whichever upload ran
second would overwrite the other's objects while both rows kept pointing at the
same base.

## Chosen widths

`400 / 800 / 1600`, defined once in `CDN_WIDTHS` (`lib/imageVariants.mjs`) and
mirrored in `next.config.mjs` as `deviceSizes`.

They come from the `sizes` attributes the storefront actually declares:

| Surface        | `sizes`            | CSS px    | Covered by |
| -------------- | ------------------ | --------- | ---------- |
| Product grid   | `25vw` at ≥1024    | 320 – 384 | 800 (2x)   |
| Product page   | `50vw` at ≥1024    | up to 768 | 1600 (2x)  |
| Mobile, any    | `100vw`            | up to 430 | 800 (2x)   |
| Thumbnails     | `3rem` / `4rem`    | 48 – 64   | 400        |

These values are baked into stored object keys. Adding a width is additive and
requires a backfill re-run; removing one breaks every page still requesting it.

The blur placeholder is generated at 24px, roughly 300 bytes of base64. It is
inlined into the HTML of every page that renders the image, so the width
matters: at 100px the same placeholder is about 4KB per image, which on a
24-product grid is ~96KB of blocking HTML.

## The on/off switch

`NEXT_PUBLIC_CDN_BASE` controls the entire pipeline.

- **Unset** — `images.unoptimized` stays `true`, no loader is registered, and
  images are served straight from Supabase Storage exactly as before. This is
  the current production behaviour and the code is safe to deploy in this state.
- **Set** — the custom loader in `lib/cdn-loader.js` is registered and any image
  whose row has variants is served from R2.

Deploying the code and enabling the CDN are therefore separate, independently
reversible steps. Unsetting the variable is a complete rollback.

Rows without variants — including the 12 products still showing Unsplash stock
photos — keep rendering from their original URLs either way.

## What is still manual

These three steps need a Cloudflare dashboard login and cannot be scripted from
here.

1. **Create the bucket.** R2 → Create bucket → `karari-media`, location hint
   APAC.
2. **Bind the custom domain.** Bucket → Settings → Public access → Connect
   custom domain → `cdn.kararibeauty.com`. Verify by uploading any test file
   through the dashboard and opening
   `https://cdn.kararibeauty.com/<filename>` in a browser. A 404 or an SSL
   error means the domain is not bound; fix it before going further, because
   every later step assumes this URL resolves.
3. **Create an API token.** R2 → Manage API Tokens → Object Read & Write,
   scoped to `karari-media` only.

Then fill in `.env.local` (see `.env.example`) and add the same values to the
Vercel project. Only `NEXT_PUBLIC_CDN_BASE` is public; the other four are
server-side secrets.

## Running the backfill

Run it locally, not on Vercel. Each image is downloaded, decoded and re-encoded
four times; doing that for ~107 images inside a serverless function hits the
memory ceiling and the execution timeout.

```bash
npm run images:r2
```

Dry run — reports what would happen and writes nothing. It works before the
Cloudflare side exists, so the plan can be reviewed early.

```bash
npm run images:r2:write
```

Expected result: **93 migrated, 26 skipped, 0 failed.**

The script is idempotent — it selects only rows whose variants column is still
`{}`, which is what the `idx_products_unmigrated` and
`idx_product_images_unmigrated` partial indexes cover. A run that dies halfway
leaves completed rows done and picks up the rest. A single failed row is logged
and skipped, never fatal.

Confirm afterwards:

```sql
select count(*) from products where image_variants = '{}'::jsonb;        -- expect 14
select count(*) from product_images where variants = '{}'::jsonb;        -- expect 12
```

### What gets skipped, and why

Two separate checks, because placeholders arrive in two forms.

**Stock photography by hostname.** 12 products point at `images.unsplash.com`.
Copying a stock photo into our own CDN does not make it a picture of our
product, and a generic stock image on a jewellery product page hurts conversion
and gives Google nothing distinctive to index.

**Stock photography that was re-hosted.** A hostname check is not enough. Some
stock images were downloaded, re-encoded and uploaded into our own Supabase
bucket, so they carry a `supabase.co` URL and pass every host check while still
being stock imagery.

The signal that survives re-hosting is sharing: one image file standing in for
several distinct products at several different prices is a placeholder wherever
it is served from. Real product photography is used once. The script builds an
index of image URL to distinct product slugs and skips anything used more than
once.

In this catalogue two re-hosted files are each doing duty for six products:

| File | Products |
| --- | --- |
| `p-1786663190868-87pnoj.webp` | antique-pendant-jewellery-set, crystal-stud-combo, gold-tone-bracelet, meenakari-choker-set, pearl-glow-jewellery-set, rose-pearl-earrings |
| `p-1786663191845-0h55ux.webp` | antique-gold-bangle-pair, daily-wear-bangle-pair, kundan-bridal-bangles, pearl-accent-bangles, rose-gold-bangle-stack, traditional-red-chooda-set |

That makes **14 products** displaying placeholder imagery, not 12.
`crystal-stud-combo` and `traditional-red-chooda-set` carry a re-hosted stock
file as their main image and are invisible to a hostname check.

This is worth fixing on its own terms, independently of the CDN. Five bangle
products priced from ₹699 to ₹2,299 currently show the identical photograph. A
customer comparing them sees one picture at five prices, and what arrives will
not match what they chose.

All of it resolves the same way: real photography per product. A re-run picks
them up automatically once each has its own image.

## New uploads

`lib/data/media.js` generates variants from the same buffer it stores in
Supabase. Supabase is written first and remains the source of truth; if R2 is
unconfigured or the processing fails, the upload still succeeds and the image
renders from its Supabase URL. The backfill catches it later.

Any write that changes an `image_url` without supplying matching variants clears
them, because stored variants describe the previous picture. The row then falls
back to its original URL and is picked up by the next backfill run.

## Cutover checklist

1. Deploy to a preview URL with `NEXT_PUBLIC_CDN_BASE` set, not production.
2. DevTools → Network → filter `_next/image` — must be empty.
3. Confirm a product image request returns `cf-cache-status: HIT` on reload.
4. Check a product page on a mobile viewport and confirm the 400 or 800 variant
   is fetched, not the 1600.
5. Promote to production.

Keep the Supabase Storage originals for at least 30 days — they are the rollback
path. Do not drop `image_url` from either table.
