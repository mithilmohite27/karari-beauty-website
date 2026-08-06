import "server-only";

import crypto from "crypto";

export class RazorpayConfigError extends Error {
  constructor(message = "RAZORPAY_NOT_CONFIGURED") {
    super(message);
    this.name = "RazorpayConfigError";
    this.status = 503;
  }
}

export function getRazorpayConfig() {
  return {
    publicKeyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "",
    keyId: process.env.RAZORPAY_KEY_ID || "",
    keySecret: process.env.RAZORPAY_KEY_SECRET || "",
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || ""
  };
}

export function getRazorpayStatus() {
  const config = getRazorpayConfig();
  const hasPublicKey = Boolean(config.publicKeyId);
  const hasServerKey = Boolean(config.keyId);
  const hasServerSecret = Boolean(config.keySecret);
  const keyCandidates = [config.publicKeyId, config.keyId].filter(Boolean);
  const keyMode = keyCandidates.length && keyCandidates.every((key) => key.startsWith("rzp_test"))
    ? "test"
    : keyCandidates.length && keyCandidates.every((key) => key.startsWith("rzp_live"))
      ? "live"
      : "unknown";

  // Booleans only - never the key values themselves.
  return {
    configured: hasPublicKey && hasServerKey && hasServerSecret,
    hasPublicKey,
    hasServerKey,
    hasServerSecret,
    // Without this the webhook rejects every delivery, so payments captured
    // after the browser closes would never reach the order. Surfaced so it can
    // be checked before go-live rather than discovered from a missed order.
    hasWebhookSecret: Boolean(config.webhookSecret),
    keyMode,
    // Mixed test/live keys silently break checkout; "unknown" means the three
    // key values do not agree on a mode.
    keyModeConsistent: keyMode !== "unknown"
  };
}

export function assertRazorpayConfigured() {
  const config = getRazorpayConfig();
  if (!config.publicKeyId || !config.keyId || !config.keySecret) throw new RazorpayConfigError();
  return config;
}

export async function createRazorpayOrder({ amount, currency = "INR", receipt, notes = {} }) {
  const config = assertRazorpayConfigured();
  const auth = Buffer.from(`${config.keyId}:${config.keySecret}`).toString("base64");

  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      amount,
      currency,
      receipt,
      notes
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.description || "Unable to create Razorpay order.");
  }

  return {
    ...data,
    keyId: config.publicKeyId
  };
}

export function verifyRazorpayPaymentSignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
  const config = assertRazorpayConfigured();
  const expected = crypto
    .createHmac("sha256", config.keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  const received = String(razorpaySignature || "");
  return received.length === expected.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}

export function verifyRazorpayWebhookSignature({ body, signature }) {
  const { webhookSecret } = getRazorpayConfig();
  if (!webhookSecret) throw new RazorpayConfigError("Razorpay webhook secret is not configured.");

  const expected = crypto.createHmac("sha256", webhookSecret).update(body).digest("hex");
  const received = String(signature || "");
  return received.length === expected.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}
