import { NextResponse } from "next/server";
import { verifyAdminMutationRequest } from "@/lib/admin/api";
import { deleteProductImage, ProductAdminError, updateProductImage } from "@/lib/data/products";

function imageErrorResponse(error, fallbackMessage) {
  if (error instanceof ProductAdminError) {
    return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
  }

  console.error("[admin-product-image-api] Gallery item route failed", error);
  return NextResponse.json({ ok: false, error: fallbackMessage }, { status: 500 });
}

export async function PATCH(request, context) {
  const { response } = await verifyAdminMutationRequest(request);
  if (response) return response;

  try {
    const { id, imageId } = await context.params;
    const body = await request.json();
    const image = await updateProductImage(id, imageId, body);
    return NextResponse.json({
      ok: true,
      data: image,
      message: "Product image updated"
    });
  } catch (error) {
    return imageErrorResponse(error, "Unable to update product image.");
  }
}

export async function DELETE(request, context) {
  const { response } = await verifyAdminMutationRequest(request);
  if (response) return response;

  try {
    const { id, imageId } = await context.params;
    const result = await deleteProductImage(id, imageId);
    return NextResponse.json(result);
  } catch (error) {
    return imageErrorResponse(error, "Unable to remove product image.");
  }
}
