export const defaultSeo = {
  title: "Karari Beauty | Jewellery, Gifts, Cosmetics & Rakhi Collections",
  description:
    "Shop Karari Beauty's curated jewellery, bangles, handbags, watches, cosmetics, wedding baskets, imported fancy items, gift products and Raksha Bandhan collections.",
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
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://kararibeauty.com";

  return configuredUrl.replace(/\/$/, "");
}

export function absoluteUrl(path = "/") {
  if (/^https?:\/\//i.test(path)) return path;

  return `${getSiteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

export function getDefaultOgImage() {
  return absoluteUrl(defaultSeo.ogImage);
}
