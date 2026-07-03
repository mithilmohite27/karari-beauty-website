import { NextResponse } from "next/server";
import { adminDataResponse, adminErrorResponse, verifyAdminRequest } from "@/lib/admin/api";
import { CustomerAdminError, getAdminCustomers } from "@/lib/data/customers";

export async function GET(request) {
  const { response } = await verifyAdminRequest(request);
  if (response) return response;

  try {
    const { searchParams } = new URL(request.url);
    const result = await getAdminCustomers({
      search: searchParams.get("search") || "",
      sort: searchParams.get("sort") || "newest"
    });

    return adminDataResponse(result.data, result.mode);
  } catch (error) {
    if (error instanceof CustomerAdminError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }

    console.error("[admin-customers-api] Failed to load customers", error);
    return adminErrorResponse("Unable to load customers.");
  }
}
