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
  // Branded 1200x630 share card built by scripts/build-og-image.mjs.
  // JPEG rather than WebP: this is fetched by social crawlers, whose WebP
  // support is still uneven, and a preview that fails to render is worse than
  // a slightly larger file.
  ogImage: "/og-image.jpg"
};

export function getSiteUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.kararibeauty.com";

  return configuredUrl.replace(/\/$/, "");
}

export function absoluteUrl(path = "/") {
  if (/^https?:\/\//i.test(path)) return path;

  return `${getSiteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

// Dimensions of the branded share card. Declaring them lets Facebook and
// LinkedIn lay out a large preview on the very first scrape; without them the
// crawler has to fetch and measure the file, and shows a small thumbnail on
// the first share of a URL - exactly the share that matters most.
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

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

export function createProductSeoTitle(product = {}, { includeSku = false } = {}) {
  const suffix = " | Karari Beauty";
  const maxProductLength = 60 - suffix.length;
  let productName = cleanSeoText(product.name || "Boutique Product");

  if (includeSku && product.sku) {
    productName = `${productName} ${cleanSeoText(product.sku)}`;
  }

  if (`${productName}${suffix}`.length < 30) {
    productName = `${productName} Online`;
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
  // Only the branded card has known dimensions. Product photos vary, and
  // declaring wrong ones is worse than declaring none - crawlers trust the tag
  // and lay out the preview around a size the image does not have.
  const isDefaultImage = imageUrl === getDefaultOgImage();
  const imageDimensions = isDefaultImage
    ? { width: OG_IMAGE_WIDTH, height: OG_IMAGE_HEIGHT }
    : {};

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
      images: [{ url: imageUrl, alt: resolvedImageAlt, ...imageDimensions }]
    },
    twitter: {
      card: "summary_large_image",
      title: brandedTitle,
      description: cleanDescription,
      images: [imageUrl]
    }
  };
}
