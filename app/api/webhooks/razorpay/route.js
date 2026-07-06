import { NextResponse } from "next/server";
import { updateOrderPaymentByRazorpayOrderId } from "@/lib/data/orders";
import { RazorpayConfigError, verifyRazorpayWebhookSignature } from "@/lib/razorpay";

export async function POST(request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature") || "";

    if (!verifyRazorpayWebhookSignature({ body: rawBody, signature })) {
      return NextResponse.json({ ok: false, error: "Invalid webhook signature." }, { status: 400 });
    }

    const event = JSON.parse(rawBody);
    const payment = event?.payload?.payment?.entity;
    const order = event?.payload?.order?.entity;
    const razorpayOrderId = payment?.order_id || order?.id || "";

    if (!razorpayOrderId) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    if (event.event === "payment.captured" || event.event === "order.paid") {
      await updateOrderPaymentByRazorpayOrderId(razorpayOrderId, {
        paymentStatus: "paid",
        razorpayPaymentId: payment?.id || "",
        razorpaySignatureVerified: true,
        paymentVerifiedAt: new Date().toISOString()
      });
    }

    if (event.event === "payment.failed") {
      await updateOrderPaymentByRazorpayOrderId(razorpayOrderId, {
        paymentStatus: "failed",
        razorpayPaymentId: payment?.id || "",
        razorpaySignatureVerified: false,
        paymentFailureReason: payment?.error_description || payment?.error_reason || "Razorpay payment failed."
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof RazorpayConfigError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status || 503 });
    }
    console.error("[razorpay-webhook]", error);
    return NextResponse.json({ ok: false, error: "Unable to process webhook." }, { status: 500 });
  }
}
