import { absoluteUrl, getSiteUrl } from "@/lib/seo";

export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/collections/", "/products/"],
      disallow: ["/account", "/admin/", "/api/", "/cart", "/checkout", "/sign-in"]
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: getSiteUrl()
  };
}
