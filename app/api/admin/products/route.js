import { NextResponse } from "next/server";
import { adminDataResponse, adminErrorResponse, verifyAdminMutationRequest, verifyAdminRequest } from "@/lib/admin/api";
import { createAdminProduct, getAdminProducts, ProductAdminError } from "@/lib/data/products";

export async function GET(request) {
  const { response } = await verifyAdminRequest(request);
  if (response) return response;

  try {
    const result = await getAdminProducts();
    return adminDataResponse(result.data, result.mode);
  } catch (error) {
    console.error("[admin-products-api] Failed to load products", error);
    return adminErrorResponse("Unable to load products.");
  }
}

export async function POST(request) {
  const { response } = await verifyAdminMutationRequest(request);
  if (response) return response;

  try {
    const body = await request.json();
    const product = await createAdminProduct(body);
    return NextResponse.json(
      {
        ok: true,
        data: product,
        message: "Product created"
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ProductAdminError) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message
        },
        { status: error.status }
      );
    }

    console.error("[admin-products-api] Failed to create product", error);
    return adminErrorResponse("Unable to create product.");
  }
}
