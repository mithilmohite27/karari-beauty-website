import { NextResponse } from "next/server";
import { verifyAdminMutationRequest, verifyAdminRequest } from "@/lib/admin/api";
import { addProductImage, getProductImages, ProductAdminError } from "@/lib/data/products";

function imageErrorResponse(error, fallbackMessage) {
  if (error instanceof ProductAdminError) {
    return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
  }

  console.error("[admin-product-images-api] Gallery route failed", error);
  return NextResponse.json({ ok: false, error: fallbackMessage }, { status: 500 });
}

export async function GET(request, context) {
  const { response } = await verifyAdminRequest(request);
  if (response) return response;

  try {
    const { id } = await context.params;
    const images = await getProductImages(id);
    return NextResponse.json({
      ok: true,
      data: images,
      meta: {
        total: images.length,
        mode: "supabase"
      }
    });
  } catch (error) {
    return imageErrorResponse(error, "Unable to load product images.");
  }
}

export async function POST(request, context) {
  const { response } = await verifyAdminMutationRequest(request);
  if (response) return response;

  try {
    const { id } = await context.params;
    const body = await request.json();
    const image = await addProductImage(id, body);
    return NextResponse.json(
      {
        ok: true,
        data: image,
        message: "Product image added"
      },
      { status: 201 }
    );
  } catch (error) {
    return imageErrorResponse(error, "Unable to add product image.");
  }
}
