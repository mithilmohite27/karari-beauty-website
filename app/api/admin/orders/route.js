import { adminDataResponse, adminErrorResponse, verifyAdminRequest } from "@/lib/admin/api";
import { getAdminOrders } from "@/lib/data/orders";

export async function GET(request) {
  const { response } = await verifyAdminRequest(request);
  if (response) return response;

  try {
    const result = await getAdminOrders();
    return adminDataResponse(result.data, result.mode);
  } catch (error) {
    console.error("[admin-orders-api] Failed to load orders", error);
    return adminErrorResponse("Unable to load orders.");
  }
}
