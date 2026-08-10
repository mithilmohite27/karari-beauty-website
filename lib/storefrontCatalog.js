/**
 * Which categories may appear on the storefront.
 *
 * WHY THIS EXISTS
 * Categories were reappearing on the live site after being switched off. The
 * cause was not state management, dynamic rendering or CSS specificity - it was
 * the fallback. lib/data/categories.js reads Supabase and, whenever that read
 * fails, silently substitutes the bundled seed list in data/categories.js. That
 * seed list still contains Watches, Crockery, Cosmetics, Ladies' Wear and
 * Wedding Baskets. One transient Supabase error during an ISR revalidation was
 * therefore enough to bake the full 13-category list into a cached page for up
 * to an hour, with nothing in the database having changed.
 *
 * This list is the last word. It is applied to database results and to the
 * fallback alike, so no failure mode can surface a category that is not sold.
 *
 * RELATIONSHIP TO is_active
 * The database `is_active` flag still applies and is still the day-to-day
 * control - the client turns a category off in the admin panel and it
 * disappears. This whitelist is the floor beneath that: a category must be both
 * active AND listed here to be shown.
 *
 * ADDING A CATEGORY
 * Creating a category in the admin panel is no longer sufficient by itself - it
 * must also be added here and deployed. That is the deliberate cost of making
 * the list impossible to bypass. Remove a slug to retire a category.
 */
export const STOREFRONT_CATEGORY_SLUGS = Object.freeze([
  "rakhi",
  "jewellery",
  "bangles",
  "handbags",
  "umbrella",
  "fancy-items",
  "gift-items",
  "imported-items"
]);

const ALLOWED = new Set(STOREFRONT_CATEGORY_SLUGS);

export function isStorefrontCategory(slug) {
  return ALLOWED.has(String(slug || "").trim().toLowerCase());
}

/**
 * Filter a list of mapped categories down to the ones that may be sold.
 */
export function filterStorefrontCategories(categories = []) {
  return categories.filter((category) => isStorefrontCategory(category?.slug));
}

/**
 * Filter products to those belonging to a permitted category.
 *
 * Hiding a category is not enough on its own: the homepage grid renders every
 * active product when no category filter is applied, so a Watches product would
 * still be listed and purchasable with the category hidden from navigation.
 *
 * Products carrying no category at all are kept - they are not attributable to
 * a retired category, and dropping them would silently remove saleable stock.
 */
export function filterStorefrontProducts(products = []) {
  return products.filter((product) => {
    const slug = String(product?.categorySlug || "").trim();
    if (!slug) return true;
    return isStorefrontCategory(slug);
  });
}
