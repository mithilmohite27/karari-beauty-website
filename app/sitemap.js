import { getActiveCategories } from "@/lib/data/categories";
import { getProducts } from "@/lib/data/products";
import { policyLastUpdatedIso } from "@/data/policies";
import { absoluteUrl } from "@/lib/seo";

const staticRoutes = [
  { path: "/" },
  { path: "/terms-and-conditions", lastModified: policyLastUpdatedIso },
  { path: "/privacy-policy", lastModified: policyLastUpdatedIso },
  { path: "/shipping-policy", lastModified: policyLastUpdatedIso },
  { path: "/return-refund-policy", lastModified: policyLastUpdatedIso },
  { path: "/cancellation-policy", lastModified: policyLastUpdatedIso },
  { path: "/contact-us", lastModified: policyLastUpdatedIso }
];

function validLastModified(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export default async function sitemap() {
  const [categories, products] = await Promise.all([getActiveCategories(), getProducts()]);

  return [
    ...staticRoutes.map(({ path, lastModified }) => ({
      url: absoluteUrl(path),
      ...(validLastModified(lastModified) ? { lastModified: validLastModified(lastModified) } : {})
    })),
    ...categories.map((category) => {
      const lastModified = validLastModified(category.updatedAt);
      return {
        url: absoluteUrl(category.href),
        ...(lastModified ? { lastModified } : {})
      };
    }),
    ...products.map((product) => {
      const lastModified = validLastModified(product.updatedAt);
      return {
        url: absoluteUrl(`/products/${product.slug}`),
        ...(lastModified ? { lastModified } : {})
      };
    })
  ];
}
