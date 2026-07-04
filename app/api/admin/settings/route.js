import { NextResponse } from "next/server";
import { verifyAdminMutationRequest, verifyAdminRequest } from "@/lib/admin/api";
import { getAdminSiteSettings, SiteSettingsAdminError, updateAdminSiteSettings } from "@/lib/data/siteSettings";

function settingsErrorResponse(error, fallback = "Unable to manage settings.") {
  if (error instanceof SiteSettingsAdminError) {
    return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
  }

  console.error("[admin-settings-api]", error);
  return NextResponse.json({ ok: false, error: fallback }, { status: 500 });
}

export async function GET(request) {
  const { response } = await verifyAdminRequest(request);
  if (response) return response;

  try {
    const result = await getAdminSiteSettings();
    return NextResponse.json({
      ok: true,
      data: result.data,
      meta: {
        total: 1,
        mode: result.mode
      }
    });
  } catch (error) {
    return settingsErrorResponse(error, "Unable to load settings.");
  }
}

export async function PATCH(request) {
  const { response } = await verifyAdminMutationRequest(request);
  if (response) return response;

  try {
    const body = await request.json();
    const result = await updateAdminSiteSettings(body);
    return NextResponse.json({
      ok: true,
      data: result.data,
      message: "Settings saved",
      meta: {
        total: 1,
        mode: result.mode
      }
    });
  } catch (error) {
    return settingsErrorResponse(error, "Unable to save settings.");
  }
}
