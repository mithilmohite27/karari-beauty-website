import { adminDataResponse, adminErrorResponse, verifyAdminRequest } from "@/lib/admin/api";
import { getAdminCampaigns } from "@/lib/data/seasonalCampaigns";

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
