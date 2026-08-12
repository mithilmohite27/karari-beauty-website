"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";

/**
 * Google Analytics 4.
 *
 * The measurement ID lives here only - everything else reads it from this
 * component or from NEXT_PUBLIC_GA_MEASUREMENT_ID, so there is a single source
 * of truth. The literal is kept as a fallback so analytics keeps working if the
 * environment variable is missing on a deployment, matching how
 * NEXT_PUBLIC_SITE_URL is handled elsewhere in this codebase.
 *
 * Page views - including App Router client-side navigations, which use the
 * History API - are measured by GA4's own Enhanced Measurement. No manual
 * page_view is sent from here on route change: doing that as well would
 * double-count every navigation.
 *
 * The tag is deliberately not loaded on /admin. Staff activity in the CMS is
 * not customer behaviour and should not enter the property.
 */
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-GJPVZ3WGN3";

export default function GoogleAnalytics() {
  const pathname = usePathname();

  if (!GA_MEASUREMENT_ID) return null;
  if (pathname && pathname.startsWith("/admin")) return null;

  return (
    <>
      <Script
        id="ga4-script"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}');`}
      </Script>
    </>
  );
}
