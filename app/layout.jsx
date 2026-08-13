import FloatingActions from "@/components/FloatingActions";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import { getSiteSettings } from "@/lib/data/siteSettings";
import { absoluteUrl, defaultSeo, getDefaultOgImage, getSiteUrl } from "@/lib/seo";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

/**
 * Search Console ownership token.
 *
 * Safe to keep in the repository: this value is published in the page source
 * of every request by design, so it is not a secret. It proves ownership only
 * to whoever already controls the site or its DNS. Hardcoding the default means
 * verification survives without an environment variable being set correctly;
 * GOOGLE_SITE_VERIFICATION still overrides it if the property is ever moved.
 */
const DEFAULT_SITE_VERIFICATION = "tXODXQJ0EsW2wGxDDe0LB1vHRwu28LUuSW4moUDs1mI";

export async function generateMetadata() {
  const siteSettings = await getSiteSettings();
  const businessName = siteSettings.business.name || "Karari Beauty";
  const title = siteSettings.seo.siteTitle || defaultSeo.title;
  const description = siteSettings.seo.metaDescription || defaultSeo.description;
  const favicon = siteSettings.business.faviconUrl || "/favicon.png";
  const ogImage = siteSettings.seo.ogImageUrl ? absoluteUrl(siteSettings.seo.ogImageUrl) : getDefaultOgImage();
  // Search Console shows this token in two shapes: bare for the HTML-tag
  // method, and prefixed with "google-site-verification=" for the DNS TXT
  // record. Accept either and normalise, because pasting the DNS form into the
  // meta tag emits a value Google will not match, and the failure says nothing
  // about why. Trimmed too - a copied token frequently carries whitespace.
  const verificationToken = String(process.env.GOOGLE_SITE_VERIFICATION || DEFAULT_SITE_VERIFICATION)
    .trim()
    .replace(/^google-site-verification=/i, "")
    .trim();

  return {
    metadataBase: new URL(getSiteUrl()),
    title: {
      default: title,
      template: `%s | ${businessName}`
    },
    description,
    keywords: defaultSeo.keywords,
    authors: [{ name: businessName }],
    creator: businessName,
    publisher: businessName,
    icons: {
      icon: [{ url: favicon }],
      apple: "/apple-touch-icon.png"
    },
    openGraph: {
      title,
      description,
      url: getSiteUrl(),
      siteName: businessName,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${businessName} boutique gifting collection`
        }
      ],
      locale: "en_IN",
      type: "website"
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage]
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1
      }
    },
    // Search Console ownership verification.
    //
    // Set GOOGLE_SITE_VERIFICATION in Vercel to the content value Search
    // Console gives you under the "HTML tag" method - the token only, not the
    // whole <meta> element. Omitted entirely when unset, so an empty variable
    // never emits a broken tag.
    //
    // Read at build time because this layout is prerendered, so the value only
    // takes effect on the next deployment after it is set.
    ...(verificationToken ? { verification: { google: verificationToken } } : {})
  };
}

export default async function RootLayout({ children }) {
  const siteSettings = await getSiteSettings();

  return (
    <html lang="en-IN">
      <head>
        {/*
          Every product and category image is served from Supabase Storage, but
          the browser only learns that origin exists once it parses an <img>
          well into the page - by which point DNS, TCP and TLS all have to
          happen before the first byte. Lighthouse measured 300 ms of LCP
          sitting in that handshake.

          crossOrigin is required: these load as anonymous CORS requests, and a
          preconnect without it opens a connection the image requests cannot
          reuse, so the handshake happens twice instead of none.
        */}
        <link rel="preconnect" href="https://pwdbvmplcftqnrnyizkf.supabase.co" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://pwdbvmplcftqnrnyizkf.supabase.co" />
      </head>
      <body className="font-sans antialiased">
        {children}
        <FloatingActions siteSettings={siteSettings} />
        <GoogleAnalytics />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
