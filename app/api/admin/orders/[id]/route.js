import { NextResponse } from "next/server";
import { verifyAdminMutationRequest, verifyAdminRequest } from "@/lib/admin/api";
import { getAdminOrderById, OrderAdminError, updateAdminOrderNotes, updateAdminOrderStatus } from "@/lib/data/orders";

function orderErrorResponse(error, fallback = "Unable to manage order.") {
  if (error instanceof OrderAdminError) {
    return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
  }

  console.error("[admin-order-api]", error);
  return NextResponse.json({ ok: false, error: fallback }, { status: 500 });
}

export async function GET(request, { params }) {
  const { response } = await verifyAdminRequest(request);
  if (response) return response;

  try {
    const { id } = await params;
    const order = await getAdminOrderById(id);
    return NextResponse.json({ ok: true, data: order });
  } catch (error) {
    return orderErrorResponse(error, "Unable to load order.");
  }
}

export async function PATCH(request, { params }) {
  const { response, currentAdmin } = await verifyAdminMutationRequest(request);
  if (response) return response;

  try {
    const { id } = await params;
    const payload = await request.json();
    const hasStatus = Object.prototype.hasOwnProperty.call(payload, "status") && payload.status;
    const hasPaymentStatus = Object.prototype.hasOwnProperty.call(payload, "paymentStatus") && payload.paymentStatus;
    const order = hasStatus || hasPaymentStatus
      ? await updateAdminOrderStatus(id, payload, currentAdmin)
      : await updateAdminOrderNotes(id, payload, currentAdmin);

    return NextResponse.json({
      ok: true,
      data: order,
      message: "Order updated"
    });
  } catch (error) {
    return orderErrorResponse(error, "Unable to update order.");
  }
}
