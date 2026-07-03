import { adminDataResponse, adminErrorResponse, verifyAdminRequest } from "@/lib/admin/api";
import { getAdminCategories } from "@/lib/data/categories";
import { getAdminProducts } from "@/lib/data/products";

export async function GET(request) {
  const { response } = await verifyAdminRequest(request);
  if (response) return response;

  try {
    const [categoriesResult, productsResult] = await Promise.all([getAdminCategories(), getAdminProducts()]);
    const products = productsResult.data;
    const categories = categoriesResult.data.map((category) => ({
      ...category,
      productCount: products.filter((product) => product.categorySlug === category.slug).length
    }));

    return adminDataResponse(categories, categoriesResult.mode);
  } catch (error) {
    console.error("[admin-categories-api] Failed to load categories", error);
    return adminErrorResponse("Unable to load categories.");
  }
}
