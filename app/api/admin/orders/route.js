import { adminErrorResponse, verifyAdminRequest } from "@/lib/admin/api";
import { NextResponse } from "next/server";
import { getAdminOrders, OrderAdminError } from "@/lib/data/orders";

export async function GET(request) {
  const { response } = await verifyAdminRequest(request);
  if (response) return response;

  try {
    const { searchParams } = new URL(request.url);
    const result = await getAdminOrders({
      search: searchParams.get("search") || "",
      status: searchParams.get("status") || "",
      sort: searchParams.get("sort") || "newest",
      page: searchParams.get("page"),
      pageSize: searchParams.get("pageSize")
    });

    return NextResponse.json({
      ok: true,
      data: result.data,
      meta: {
        total: result.total,
        mode: result.mode,
        page: result.page,
        pageSize: result.pageSize,
        hasMore: result.hasMore
      }
    });
  } catch (error) {
    if (error instanceof OrderAdminError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }

    console.error("[admin-orders-api] Failed to load orders", error);
    return adminErrorResponse("Unable to load orders.");
  }
}
