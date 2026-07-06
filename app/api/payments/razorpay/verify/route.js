import { NextResponse } from "next/server";
import { CustomerAuthError, verifyCustomerRequest } from "@/lib/customerAuth";
import { updateOrderPaymentByRazorpayOrderId } from "@/lib/data/orders";
import { RazorpayConfigError, verifyRazorpayPaymentSignature } from "@/lib/razorpay";

function cleanString(value) {
  return String(value || "").trim();
}

export async function POST(request) {
  try {
    await verifyCustomerRequest(request);
    const body = await request.json();
    const razorpayOrderId = cleanString(body.razorpay_order_id);
    const razorpayPaymentId = cleanString(body.razorpay_payment_id);
    const razorpaySignature = cleanString(body.razorpay_signature);

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return NextResponse.json({ ok: false, error: "Payment verification details are missing." }, { status: 400 });
    }

    const verified = verifyRazorpayPaymentSignature({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    });

    if (!verified) {
      await updateOrderPaymentByRazorpayOrderId(razorpayOrderId, {
        paymentStatus: "failed",
        razorpayPaymentId,
        razorpaySignatureVerified: false,
        paymentFailureReason: "Razorpay signature verification failed."
      });
      return NextResponse.json({ ok: false, error: "Payment verification failed. Please retry payment." }, { status: 400 });
    }

    const order = await updateOrderPaymentByRazorpayOrderId(razorpayOrderId, {
      paymentStatus: "paid",
      razorpayPaymentId,
      razorpaySignatureVerified: true,
      paymentVerifiedAt: new Date().toISOString()
    });

    return NextResponse.json({
      ok: true,
      order: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        paymentStatus: order.paymentStatus,
        mode: "supabase"
      }
    });
  } catch (error) {
    if (error instanceof CustomerAuthError || error instanceof RazorpayConfigError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status || 503 });
    }
    console.error("[razorpay-verify]", error);
    return NextResponse.json({ ok: false, error: "Unable to verify payment." }, { status: 500 });
  }
}
