import FloatingActions from "@/components/FloatingActions";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import { getSiteSettings } from "@/lib/data/siteSettings";
import { absoluteUrl, defaultSeo, getDefaultOgImage, getSiteUrl } from "@/lib/seo";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

export async function generateMetadata() {
  const siteSettings = await getSiteSettings();
  const businessName = siteSettings.business.name || "Karari Beauty";
  const title = siteSettings.seo.siteTitle || defaultSeo.title;
  const description = siteSettings.seo.metaDescription || defaultSeo.description;
  const favicon = siteSettings.business.faviconUrl || "/favicon.png";
  const ogImage = siteSettings.seo.ogImageUrl ? absoluteUrl(siteSettings.seo.ogImageUrl) : getDefaultOgImage();
  // Trimmed because pasting the token from Search Console commonly carries
  // trailing whitespace, which would emit a tag Google then fails to match.
  const verificationToken = String(process.env.GOOGLE_SITE_VERIFICATION || "").trim();

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
