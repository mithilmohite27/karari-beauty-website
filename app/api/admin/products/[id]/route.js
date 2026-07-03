import { NextResponse } from "next/server";
import { adminErrorResponse, verifyAdminMutationRequest, verifyAdminRequest } from "@/lib/admin/api";
import { deactivateAdminProduct, getAdminProductById, ProductAdminError, updateAdminProduct } from "@/lib/data/products";

function productErrorResponse(error, fallbackMessage) {
  if (error instanceof ProductAdminError) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message
      },
      { status: error.status }
    );
  }

  console.error("[admin-product-api] Product route failed", error);
  return adminErrorResponse(fallbackMessage);
}

export async function GET(request, context) {
  const { response } = await verifyAdminRequest(request);
  if (response) return response;

  try {
    const { id } = await context.params;
    const product = await getAdminProductById(id);
    return NextResponse.json({
      ok: true,
      data: product,
      meta: {
        total: 1,
        mode: "supabase"
      }
    });
  } catch (error) {
    return productErrorResponse(error, "Unable to load product.");
  }
}

export async function PATCH(request, context) {
  const { response } = await verifyAdminMutationRequest(request);
  if (response) return response;

  try {
    const { id } = await context.params;
    const body = await request.json();
    const product = await updateAdminProduct(id, body);
    return NextResponse.json({
      ok: true,
      data: product,
      message: "Product updated"
    });
  } catch (error) {
    return productErrorResponse(error, "Unable to update product.");
  }
}

export async function DELETE(request, context) {
  const { response } = await verifyAdminMutationRequest(request);
  if (response) return response;

  try {
    const { id } = await context.params;
    const result = await deactivateAdminProduct(id);
    return NextResponse.json(result);
  } catch (error) {
    return productErrorResponse(error, "Unable to deactivate product.");
  }
}
