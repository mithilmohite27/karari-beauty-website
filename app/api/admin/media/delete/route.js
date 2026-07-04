import { NextResponse } from "next/server";
import { verifyAdminMutationRequest } from "@/lib/admin/api";
import { deleteAdminMedia, MediaAdminError } from "@/lib/data/media";

export async function DELETE(request) {
  const { response } = await verifyAdminMutationRequest(request);
  if (response) return response;

  try {
    const body = await request.json();
    const result = await deleteAdminMedia(body.storagePath || body.path);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof MediaAdminError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }

    console.error("[admin-media-delete-api] Failed to delete image", error);
    return NextResponse.json({ ok: false, error: "Unable to delete image." }, { status: 500 });
  }
}
