import { getActiveCategories } from "@/lib/data/categories";
import { getProducts } from "@/lib/data/products";
import { absoluteUrl } from "@/lib/seo";

export default async function sitemap() {
  const now = new Date();
  const [categories, products] = await Promise.all([getActiveCategories(), getProducts()]);

  return [
    {
      url: absoluteUrl("/"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1
    },
    ...categories.map((category) => ({
      url: absoluteUrl(category.href),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8
    })),
    ...products.map((product) => ({
      url: absoluteUrl(`/products/${product.slug}`),
      lastModified: product.createdAt ? new Date(product.createdAt) : now,
      changeFrequency: "monthly",
      priority: 0.7
    }))
  ];
}
