import { NextResponse } from "next/server";
import { adminDataResponse, adminErrorResponse, verifyAdminMutationRequest, verifyAdminRequest } from "@/lib/admin/api";
import { getAdminMedia, MediaAdminError, uploadAdminMedia } from "@/lib/data/media";

function mediaErrorResponse(error, fallback = "Unable to manage media.") {
  if (error instanceof MediaAdminError) {
    return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
  }

  console.error("[admin-media-api]", error);
  return adminErrorResponse(fallback);
}

export async function GET(request) {
  const { response } = await verifyAdminRequest(request);
  if (response) return response;

  try {
    const { searchParams } = new URL(request.url);
    const result = await getAdminMedia({
      search: searchParams.get("search") || "",
      sort: searchParams.get("sort") || "newest"
    });

    return adminDataResponse(result.data, result.mode);
  } catch (error) {
    return mediaErrorResponse(error, "Unable to load media library.");
  }
}

export async function POST(request) {
  const { response } = await verifyAdminMutationRequest(request);
  if (response) return response;

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const media = await uploadAdminMedia(file);
    return NextResponse.json({ ok: true, data: media, message: "Image uploaded" }, { status: 201 });
  } catch (error) {
    return mediaErrorResponse(error, "Unable to upload image.");
  }
}
