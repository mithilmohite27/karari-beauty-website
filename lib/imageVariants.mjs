/**
 * Shared vocabulary for R2-hosted, pre-generated image variants.
 *
 * This module is imported by browser code, server code and standalone Node
 * scripts, so it deliberately has no dependencies and reads no secrets. The
 * only environment value it touches is NEXT_PUBLIC_CDN_BASE, which is public
 * by definition.
 *
 * HOW A VARIANT IS ADDRESSED
 * A processed image is stored in R2 as one object per width:
 *
 *   products/rose-gold-bangle/rose-gold-bangle-0-400.webp
 *   products/rose-gold-bangle/rose-gold-bangle-0-800.webp
 *   products/rose-gold-bangle/rose-gold-bangle-0-1600.webp
 *
 * The database stores only the shared prefix ("the base") plus the list of
 * widths that exist. Every URL is reconstructed from those two values, so
 * adding a fourth width later needs no schema change and no data rewrite.
 */

/**
 * Widths generated for every image.
 *
 * Chosen from the `sizes` attributes the storefront actually declares:
 *
 *   - Product grid  25vw at >=1024px  -> 320-384 CSS px -> 800 covers 2x
 *   - Product page  50vw at >=1024px  -> up to 768 CSS px -> 1600 covers 2x
 *   - Mobile        100vw             -> up to 430 CSS px -> 800 covers 2x
 *   - Thumbnails    4rem / 3rem       -> 400 is the floor and is plenty
 *
 * These values are baked into stored object keys. Changing the list is
 * additive-only: adding a width requires re-running the backfill, removing one
 * breaks every page still requesting it.
 */
export const CDN_WIDTHS = [400, 800, 1600];

/**
 * Marker prefix that tells the Next.js image loader "this is an R2 key, not a
 * file in /public".
 *
 * next/image rejects a `src` that is neither an absolute URL nor rooted at "/",
 * so a bare R2 key cannot be passed directly. Prefixing with /cdn/ satisfies
 * that validation and, more importantly, keeps R2 keys from colliding with real
 * files in /public - `products/...` is a plausible name in both namespaces,
 * `/cdn/products/...` is not.
 */
export const CDN_PATH_PREFIX = "/cdn/";

/** Public origin serving the R2 bucket. Empty until the CDN is switched on. */
export function cdnBase() {
  return process.env.NEXT_PUBLIC_CDN_BASE || "";
}

/** True once NEXT_PUBLIC_CDN_BASE is set, i.e. the R2 pipeline is live. */
export function cdnEnabled() {
  return Boolean(cdnBase());
}

/**
 * Is this variant record usable?
 *
 * Rows default to `{}` until the backfill processes them, and the 12 products
 * still showing Unsplash stock photos are never processed at all, so an empty
 * object is the normal, expected state for a meaningful share of the catalogue.
 */
export function hasVariants(variants) {
  return Boolean(variants && typeof variants === "object" && typeof variants.base === "string" && variants.base);
}

/**
 * Turn a variant record into a `src` for next/image, or null when the image has
 * not been migrated (callers then fall back to the original image_url).
 */
export function variantSrc(variants) {
  if (!cdnEnabled() || !hasVariants(variants)) return null;
  return `${CDN_PATH_PREFIX}${String(variants.base).replace(/^\/+/, "")}`;
}

/** Inline blur placeholder, or null when absent. */
export function variantBlur(variants) {
  if (!hasVariants(variants)) return null;
  return typeof variants.blur === "string" && variants.blur.startsWith("data:") ? variants.blur : null;
}

/** Does this `src` address the CDN rather than /public or a remote host? */
export function isCdnPath(src) {
  return typeof src === "string" && src.startsWith(CDN_PATH_PREFIX);
}

/**
 * Build the absolute URL for one width.
 *
 * Requests wider than the largest generated variant are clamped rather than
 * upscaled - serving a 1600px image to a 2000px slot is a minor quality
 * compromise, while a 404 is a blank product photo.
 */
export function cdnUrlForWidth(src, width) {
  const key = String(src).slice(CDN_PATH_PREFIX.length);
  const best = CDN_WIDTHS.find((candidate) => candidate >= width) ?? CDN_WIDTHS[CDN_WIDTHS.length - 1];
  return `${cdnBase()}/${key}-${best}.webp`;
}
