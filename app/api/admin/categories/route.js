import { NextResponse } from "next/server";
import { adminDataResponse, adminErrorResponse, verifyAdminMutationRequest, verifyAdminRequest } from "@/lib/admin/api";
import { CategoryAdminError, createAdminCategory, getAdminCategories } from "@/lib/data/categories";
import { getAdminProducts } from "@/lib/data/products";

export async function GET(request) {
  const { response } = await verifyAdminRequest(request);
  if (response) return response;

  try {
    const [categoriesResult, productsResult] = await Promise.all([getAdminCategories(), getAdminProducts()]);
    const products = productsResult.data.filter((product) => product.isActive !== false);
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

export async function POST(request) {
  const { response } = await verifyAdminMutationRequest(request);
  if (response) return response;

  try {
    const body = await request.json();
    const category = await createAdminCategory(body);
    return NextResponse.json(
      {
        ok: true,
        data: category,
        message: "Category created"
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof CategoryAdminError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }

    console.error("[admin-categories-api] Failed to create category", error);
    return adminErrorResponse("Unable to create category.");
  }
}
