import { NextResponse } from "next/server";
import { verifyAdminMutationRequest } from "@/lib/admin/api";
import { bulkDeactivateAdminProducts, bulkHardDeleteAdminProducts, ProductAdminError } from "@/lib/data/products";

function productErrorResponse(error) {
  if (error instanceof ProductAdminError) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
        details: error.details || {}
      },
      { status: error.status }
    );
  }

  console.error("[admin-products-bulk-api] Bulk product action failed", error);
  return NextResponse.json({ ok: false, error: "Unable to manage selected products." }, { status: 500 });
}

export async function POST(request) {
  const { currentAdmin, response } = await verifyAdminMutationRequest(request);
  if (response) return response;

  try {
    const body = await request.json();
    const action = body?.action;
    const productIds = body?.productIds;

    if (action === "deactivate") {
      const result = await bulkDeactivateAdminProducts(productIds, currentAdmin.admin);
      return NextResponse.json(result);
    }

    if (action === "delete") {
      const result = await bulkHardDeleteAdminProducts(productIds, currentAdmin.admin);
      return NextResponse.json(result);
    }

    throw new ProductAdminError("Bulk product action is not valid.");
  } catch (error) {
    return productErrorResponse(error);
  }
}
