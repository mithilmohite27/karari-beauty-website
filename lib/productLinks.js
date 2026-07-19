export const CANONICAL_SITE_ORIGIN = "https://kararibeauty.com";

function normalizePath(path) {
  if (!path || typeof path !== "string") return "";
  return path.startsWith("/") ? path : `/${path}`;
}

export function getCanonicalProductUrl(product, currentPath = "") {
  if (product?.slug) {
    return `${CANONICAL_SITE_ORIGIN}/products/${encodeURIComponent(product.slug)}`;
  }

  const normalizedPath = normalizePath(currentPath);
  if (normalizedPath.startsWith("/products/")) {
    return `${CANONICAL_SITE_ORIGIN}${normalizedPath.split("?")[0].split("#")[0]}`;
  }

  return CANONICAL_SITE_ORIGIN;
}
