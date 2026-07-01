import { absoluteUrl, getSiteUrl } from "@/lib/seo";

export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/collections/", "/products/"],
      disallow: ["/cart", "/checkout", "/admin-preview", "/admin"]
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: getSiteUrl()
  };
}
