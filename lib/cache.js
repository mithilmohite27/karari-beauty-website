import "server-only";

import { revalidateTag, unstable_cache } from "next/cache";

/**
 * Cache tags for storefront reads.
 *
 * Storefront pages render from cached Supabase reads instead of querying on
 * every request. Admin writes purge the matching tag, so published changes are
 * visible immediately rather than after a timed window.
 */
export const CACHE_TAGS = {
  products: "storefront:products",
  categories: "storefront:categories",
  campaigns: "storefront:campaigns",
  siteSettings: "storefront:site-settings"
};

/**
 * Safety net only. Tag purges are the primary invalidation path; this bounds
 * how long a missed purge (for example a write that failed after committing)
 * can serve stale catalog data.
 */
export const STOREFRONT_REVALIDATE_SECONDS = 3600;

/**
 * Wrap a Supabase read so repeated requests reuse one result.
 *
 * `keyParts` must capture every argument the reader varies on, because
 * unstable_cache keys on it rather than on the call arguments.
 */
export function cachedStorefrontRead(readFn, keyParts, tags) {
  return unstable_cache(readFn, keyParts, {
    tags,
    revalidate: STOREFRONT_REVALIDATE_SECONDS
  });
}

/**
 * Purge storefront caches after an admin write.
 *
 * Never throws: a failed purge must not turn a successful save into a 500. The
 * revalidate window above still bounds the staleness.
 */
export function revalidateStorefront(...tags) {
  const targets = tags.flat().filter(Boolean);

  for (const tag of targets) {
    try {
      revalidateTag(tag);
    } catch (error) {
      console.warn(`[karari-cache] Unable to revalidate tag "${tag}".`, error?.message || error);
    }
  }
}
