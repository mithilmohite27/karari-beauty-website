import { NextResponse } from "next/server";
import { adminErrorResponse, verifyAdminMutationRequest, verifyAdminRequest } from "@/lib/admin/api";
import { CampaignAdminError, deactivateAdminCampaign, getAdminCampaignById, updateAdminCampaign } from "@/lib/data/seasonalCampaigns";

function campaignErrorResponse(error, fallbackMessage) {
  if (error instanceof CampaignAdminError) {
    return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
  }

  console.error("[admin-campaign-api] Campaign route failed", error);
  return adminErrorResponse(fallbackMessage);
}

export async function GET(request, context) {
  const { response } = await verifyAdminRequest(request);
  if (response) return response;

  try {
    const { id } = await context.params;
    const campaign = await getAdminCampaignById(id);
    return NextResponse.json({
      ok: true,
      data: campaign,
      meta: {
        total: 1,
        mode: "supabase"
      }
    });
  } catch (error) {
    return campaignErrorResponse(error, "Unable to load campaign.");
  }
}

export async function PATCH(request, context) {
  const { response } = await verifyAdminMutationRequest(request);
  if (response) return response;

  try {
    const { id } = await context.params;
    const body = await request.json();
    const campaign = await updateAdminCampaign(id, body);
    return NextResponse.json({
      ok: true,
      data: campaign,
      message: "Campaign updated"
    });
  } catch (error) {
    return campaignErrorResponse(error, "Unable to update campaign.");
  }
}

export async function DELETE(request, context) {
  const { response } = await verifyAdminMutationRequest(request);
  if (response) return response;

  try {
    const { id } = await context.params;
    const result = await deactivateAdminCampaign(id);
    return NextResponse.json(result);
  } catch (error) {
    return campaignErrorResponse(error, "Unable to deactivate campaign.");
  }
}
