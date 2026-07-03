import { NextResponse } from "next/server";
import { adminDataResponse, adminErrorResponse, verifyAdminMutationRequest, verifyAdminRequest } from "@/lib/admin/api";
import { CampaignAdminError, createAdminCampaign, getAdminCampaigns } from "@/lib/data/seasonalCampaigns";

export async function GET(request) {
  const { response } = await verifyAdminRequest(request);
  if (response) return response;

  try {
    const result = await getAdminCampaigns();
    return adminDataResponse(result.data, result.mode);
  } catch (error) {
    console.error("[admin-campaigns-api] Failed to load campaigns", error);
    return adminErrorResponse("Unable to load campaigns.");
  }
}

export async function POST(request) {
  const { response } = await verifyAdminMutationRequest(request);
  if (response) return response;

  try {
    const body = await request.json();
    const campaign = await createAdminCampaign(body);
    return NextResponse.json(
      {
        ok: true,
        data: campaign,
        message: "Campaign created"
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof CampaignAdminError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }

    console.error("[admin-campaigns-api] Failed to create campaign", error);
    return adminErrorResponse("Unable to create campaign.");
  }
}
