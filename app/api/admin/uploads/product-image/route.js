import { NextResponse } from "next/server";
import { verifyAdminMutationRequest } from "@/lib/admin/api";
import { createSafeMediaFileName, MEDIA_BUCKET, MediaAdminError, uploadMediaFile } from "@/lib/data/media";

function safeFolderName(value) {
  return String(value || "temp")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "temp";
}

export async function POST(request) {
  const { response } = await verifyAdminMutationRequest(request);
  if (response) return response;

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const productId = formData.get("productId");
    const purpose = formData.get("purpose") || "main";

    const folder = safeFolderName(productId || "temp");
    const safeName = createSafeMediaFileName(file.name, "product-image");
    const timestamp = Date.now();
    const storagePath = `${folder}/${purpose === "gallery" ? "gallery" : "main"}/${timestamp}-${safeName}`;
    const media = await uploadMediaFile({ file, storagePath, errorMessage: "Unable to upload product image." });

    return NextResponse.json({
      ok: true,
      url: media.publicUrl,
      path: `${MEDIA_BUCKET}/${media.storagePath}`
    });
  } catch (error) {
    if (error instanceof MediaAdminError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }

    console.error("[admin-upload] Product image upload failed", error);
    return NextResponse.json({ ok: false, error: "Unable to upload product image." }, { status: 500 });
  }
}
