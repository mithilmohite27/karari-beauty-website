import { NextResponse } from "next/server";
import { adminErrorResponse, verifyAdminMutationRequest, verifyAdminRequest } from "@/lib/admin/api";
import { CategoryAdminError, deactivateAdminCategory, getAdminCategoryById, updateAdminCategory } from "@/lib/data/categories";

function categoryErrorResponse(error, fallbackMessage) {
  if (error instanceof CategoryAdminError) {
    return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
  }

  console.error("[admin-category-api] Category route failed", error);
  return adminErrorResponse(fallbackMessage);
}

export async function GET(request, context) {
  const { response } = await verifyAdminRequest(request);
  if (response) return response;

  try {
    const { id } = await context.params;
    const category = await getAdminCategoryById(id);
    return NextResponse.json({
      ok: true,
      data: category,
      meta: {
        total: 1,
        mode: "supabase"
      }
    });
  } catch (error) {
    return categoryErrorResponse(error, "Unable to load category.");
  }
}

export async function PATCH(request, context) {
  const { response } = await verifyAdminMutationRequest(request);
  if (response) return response;

  try {
    const { id } = await context.params;
    const body = await request.json();
    const category = await updateAdminCategory(id, body);
    return NextResponse.json({
      ok: true,
      data: category,
      message: "Category updated"
    });
  } catch (error) {
    return categoryErrorResponse(error, "Unable to update category.");
  }
}

export async function DELETE(request, context) {
  const { response } = await verifyAdminMutationRequest(request);
  if (response) return response;

  try {
    const { id } = await context.params;
    const result = await deactivateAdminCategory(id);
    return NextResponse.json(result);
  } catch (error) {
    return categoryErrorResponse(error, "Unable to deactivate category.");
  }
}
