export const defaultSeo = {
  title: "Jewellery, Gifts, Cosmetics & Rakhi | Karari Beauty",
  description:
    "Shop jewellery, bangles, cosmetics, handbags, watches, rakhi and gift items online from Karari Beauty in Vansda, with delivery across India.",
  keywords: [
    "Karari Beauty",
    "jewellery",
    "bangles",
    "handbags",
    "watches",
    "cosmetics",
    "gift items",
    "wedding baskets",
    "Rakhi",
    "Raksha Bandhan gifts",
    "boutique gifts",
    "Vansda"
  ],
  ogImage: "/hero/all-occasion-gifting.png"
};

export function getSiteUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.kararibeauty.com";

  return configuredUrl.replace(/\/$/, "");
}

export function absoluteUrl(path = "/") {
  if (/^https?:\/\//i.test(path)) return path;

  return `${getSiteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

export function getDefaultOgImage() {
  return absoluteUrl(defaultSeo.ogImage);
}

export function cleanSeoText(value = "") {
  return String(value)
    .replace(/[\p{Extended_Pictographic}\uFE0F]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function truncateSeoText(value, maxLength) {
  const text = cleanSeoText(value);
  if (!maxLength || text.length <= maxLength) return text;

  const targetLength = Math.max(1, maxLength - 1);
  const candidate = text.slice(0, targetLength + 1);
  const wordBoundary = candidate.lastIndexOf(" ");
  const truncated = wordBoundary >= Math.floor(targetLength * 0.7)
    ? candidate.slice(0, wordBoundary)
    : text.slice(0, targetLength);

  return `${truncated.replace(/[\s,.;:!?-]+$/g, "")}…`;
}

export function createMetaDescription(primary, fallback = defaultSeo.description) {
  const base = cleanSeoText(primary || fallback);
  let expanded = base;

  if (expanded.length < 120) {
    expanded = `${expanded.replace(/[.!?]+$/g, "")}. Shop online from Karari Beauty with delivery across India.`;
  }

  if (expanded.length < 120) {
    expanded = `${expanded.replace(/[.!?]+$/g, "")}. Discover boutique picks for gifting, celebrations and everyday style.`;
  }

  return truncateSeoText(expanded, 160);
}

export function createProductSeoTitle(product = {}) {
  const suffix = " | Karari Beauty";
  const maxProductLength = 60 - suffix.length;
  let productName = cleanSeoText(product.name || "Boutique Product");

  if (`${productName}${suffix}`.length < 30 && product.sku) {
    productName = `${productName} ${cleanSeoText(product.sku)}`;
  }

  return `${truncateSeoText(productName, maxProductLength)}${suffix}`;
}

export function createProductMetaDescription(product = {}) {
  const productName = cleanSeoText(product.name || "this boutique product");
  const source = cleanSeoText(product.shortDescription || product.description);
  const lead = source.toLowerCase().includes(productName.toLowerCase())
    ? source
    : `Shop ${productName}. ${source}`;

  return lead;
}

export function createPageMetadata({
  title,
  description,
  path = "/",
  image = getDefaultOgImage(),
  imageAlt,
  type = "website",
  brandName = "Karari Beauty"
}) {
  const cleanTitle = cleanSeoText(title || defaultSeo.title);
  const suffix = ` | ${brandName}`;
  const brandedTitle = cleanTitle.toLowerCase().includes(brandName.toLowerCase())
    ? truncateSeoText(cleanTitle, 60)
    : `${truncateSeoText(cleanTitle, 60 - suffix.length)}${suffix}`;
  const cleanDescription = createMetaDescription(description);
  const url = absoluteUrl(path);
  const imageUrl = absoluteUrl(image);
  const resolvedImageAlt = cleanSeoText(imageAlt || `${brandName} boutique collection`);

  return {
    title: { absolute: brandedTitle },
    description: cleanDescription,
    alternates: { canonical: url },
    openGraph: {
      title: brandedTitle,
      description: cleanDescription,
      url,
      siteName: brandName,
      type,
      images: [{ url: imageUrl, alt: resolvedImageAlt }]
    },
    twitter: {
      card: "summary_large_image",
      title: brandedTitle,
      description: cleanDescription,
      images: [imageUrl]
    }
  };
}
