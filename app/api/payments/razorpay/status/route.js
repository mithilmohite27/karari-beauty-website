import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/admin/api";
import { getRazorpayStatus, probeRazorpayCredentials } from "@/lib/razorpay";
import { BASE_CURRENCY, COUNTRY_CURRENCY, resolveChargeCurrency } from "@/lib/currency";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const status = getRazorpayStatus();
  const { searchParams } = new URL(request.url);

  const international = resolveChargeCurrency("USD");
  const payload = {
    ...status,
    baseCurrency: BASE_CURRENCY,
    supportedCountries: Object.keys(COUNTRY_CURRENCY),
    // When false, every order is charged in INR regardless of the customer's
    // country. Set RAZORPAY_INTERNATIONAL_ENABLED=true only after Razorpay has
    // enabled international payments on the account.
    internationalChargingEnabled: !international.fellBack
  };

  // ?probe=1 additionally verifies the key/secret pair against Razorpay's API.
  // Admin-only: on a live store this reports whether payment authentication is
  // healthy, which is useful to an operator and useful to an attacker deciding
  // when to probe. The unauthenticated fields above stay public because the
  // launch checklist relies on them.
  if (searchParams.get("probe") === "1") {
    const { response } = await verifyAdminRequest(request);
    if (response) return response;

    payload.credentialProbe = await probeRazorpayCredentials();
  }

  return NextResponse.json(payload);
}
