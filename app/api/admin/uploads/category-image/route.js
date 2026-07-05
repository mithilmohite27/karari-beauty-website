import { NextResponse } from "next/server";
import { verifyAdminMutationRequest } from "@/lib/admin/api";
import { createSafeMediaFileName, MEDIA_BUCKET, MediaAdminError, uploadMediaFile } from "@/lib/data/media";

export async function POST(request) {
  const { response } = await verifyAdminMutationRequest(request);
  if (response) return response;

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const storagePath = `karari-categories/${Date.now()}-${createSafeMediaFileName(file?.name, "category-image")}`;
    const media = await uploadMediaFile({ file, storagePath, errorMessage: "Image upload requires storage setup." });

    return NextResponse.json({
      ok: true,
      url: media.publicUrl,
      path: `${MEDIA_BUCKET}/${media.storagePath}`
    });
  } catch (error) {
    if (error instanceof MediaAdminError) {
      return NextResponse.json({ ok: false, error: error.status === 503 ? "Image upload requires storage setup." : error.message }, { status: error.status });
    }

    console.error("[admin-category-upload] Category image upload failed", error);
    return NextResponse.json({ ok: false, error: "Image upload requires storage setup." }, { status: 500 });
  }
}
