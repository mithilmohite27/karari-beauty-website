import { NextResponse } from "next/server";
import { BASE_CURRENCY, getCountryForIsoCode, getCurrencyForCountry } from "@/lib/currency";

// Reads per-request headers, so it can never be prerendered.
export const dynamic = "force-dynamic";

/**
 * Resolve the visitor's region from edge geolocation headers.
 *
 * This exists as its own endpoint rather than being read inside a page because
 * every storefront page is statically prerendered and served from the CDN.
 * Reading request headers in a page would opt it back into per-request
 * rendering and undo that. A one-off client fetch keeps the pages static.
 *
 * Returns no personal data: a country code and the currency implied by it,
 * never the IP address itself.
 */
export async function GET(request) {
  const headerCandidates = [
    "x-vercel-ip-country",       // Vercel
    "cf-ipcountry",              // Cloudflare, if ever proxied
    "x-country-code"
  ];

  let isoCode = "";
  for (const header of headerCandidates) {
    const value = request.headers.get(header);
    if (value) {
      isoCode = value;
      break;
    }
  }

  const country = getCountryForIsoCode(isoCode);

  return NextResponse.json(
    {
      // "" when the edge gave us nothing, or the country is one the store does
      // not ship to. The client then falls back to browser locale.
      country,
      currency: country ? getCurrencyForCountry(country) : BASE_CURRENCY,
      detected: Boolean(country),
      isoCode: isoCode ? String(isoCode).toUpperCase() : ""
    },
    {
      headers: {
        // Varies per visitor, and cheap to recompute. Caching it would serve
        // one visitor's country to another.
        "Cache-Control": "private, no-store"
      }
    }
  );
}
