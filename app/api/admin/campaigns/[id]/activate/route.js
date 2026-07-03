import { NextResponse } from "next/server";
import { adminErrorResponse, verifyAdminMutationRequest } from "@/lib/admin/api";
import { activateAdminCampaign, CampaignAdminError } from "@/lib/data/seasonalCampaigns";

export async function POST(request, context) {
  const { response } = await verifyAdminMutationRequest(request);
  if (response) return response;

  try {
    const { id } = await context.params;
    const campaign = await activateAdminCampaign(id);
    return NextResponse.json({
      ok: true,
      data: campaign,
      message: "Campaign activated"
    });
  } catch (error) {
    if (error instanceof CampaignAdminError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }

    console.error("[admin-campaign-activate-api] Campaign activation failed", error);
    return adminErrorResponse("Unable to activate campaign.");
  }
}
