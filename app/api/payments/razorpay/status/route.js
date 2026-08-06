import { NextResponse } from "next/server";
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
  // Returns Razorpay's own error code and description only - never key values.
  if (searchParams.get("probe") === "1") {
    payload.credentialProbe = await probeRazorpayCredentials();
  }

  return NextResponse.json(payload);
}
