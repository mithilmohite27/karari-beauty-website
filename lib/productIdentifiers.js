export function generateSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const CATEGORY_SKU_CODES = {
  rakhi: "RAK",
  jewellery: "JWL",
  bangles: "BNG",
  handbags: "HBG",
  watches: "WAT",
  "fancy-items": "FNC",
  "wedding-baskets": "WED",
  "gift-items": "GFT",
  cosmetics: "COS",
  "ladies-wear": "LDW",
  crockery: "CRK",
  "imported-items": "IMP"
};

export function getCategorySkuCode(category = {}) {
  const slug = generateSlug(category.categorySlug || category.slug || category.name || category.categoryName);
  if (CATEGORY_SKU_CODES[slug]) return CATEGORY_SKU_CODES[slug];

  const name = String(category.categoryName || category.name || slug || "product").toUpperCase();
  const letters = name.replace(/[^A-Z]/g, "");
  return (letters.slice(0, 3) || "PRD").padEnd(3, "X");
}

export function generateSku({ categorySlug, categoryName, existingProducts = [], currentProductId = "" } = {}) {
  const categoryCode = getCategorySkuCode({ categorySlug, categoryName });
  const normalizedSlug = generateSlug(categorySlug || categoryName);
  const normalizedName = String(categoryName || "").trim().toLowerCase();

  const count = existingProducts.filter((product) => {
    if (currentProductId && product.id === currentProductId) return false;
    const productSlug = generateSlug(product.categorySlug || product.category_slug || "");
    const productName = String(product.category || product.category_name || "").trim().toLowerCase();
    return (normalizedSlug && productSlug === normalizedSlug) || (normalizedName && productName === normalizedName);
  }).length;

  const nextNumber = String(count + 1).padStart(3, "0");
  return `KB-${categoryCode}-${nextNumber}`;
}
