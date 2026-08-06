import { NextResponse } from "next/server";
import { OrderAdminError, updateOrderPaymentByRazorpayOrderId } from "@/lib/data/orders";
import { RazorpayConfigError, verifyRazorpayWebhookSignature } from "@/lib/razorpay";

// Signature verification runs over the exact bytes Razorpay signed, so this
// route must never be statically evaluated or have its body pre-parsed.
export const dynamic = "force-dynamic";

const HANDLED_EVENTS = new Set(["payment.captured", "order.paid", "payment.failed"]);

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

    // Acknowledge anything we do not act on. Returning non-2xx would make
    // Razorpay retry an event we are never going to process.
    if (!razorpayOrderId || !HANDLED_EVENTS.has(event.event)) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    if (event.event === "payment.captured" || event.event === "order.paid") {
      await updateOrderPaymentByRazorpayOrderId(razorpayOrderId, {
        paymentStatus: "paid",
        razorpayPaymentId: payment?.id || "",
        razorpaySignatureVerified: true,
        paymentVerifiedAt: new Date().toISOString(),
        // Verified against the stored order total before the order is confirmed.
        amountPaise: payment?.amount ?? order?.amount_paid,
        currency: payment?.currency || order?.currency || "INR"
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

    // An unknown order or a flagged amount mismatch will not resolve by being
    // retried, so acknowledge it and rely on the logged record for follow-up.
    if (error instanceof OrderAdminError && (error.status === 404 || error.status === 409)) {
      console.error("[razorpay-webhook] Event acknowledged without applying.", error.message);
      return NextResponse.json({ ok: true, ignored: true, reason: error.message });
    }

    // Anything else may be transient (a Supabase blip). Fail loudly so Razorpay
    // redelivers rather than dropping a real payment.
    console.error("[razorpay-webhook]", error);
    return NextResponse.json({ ok: false, error: "Unable to process webhook." }, { status: 500 });
  }
}
