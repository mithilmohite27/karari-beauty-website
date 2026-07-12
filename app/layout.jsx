import FloatingActions from "@/components/FloatingActions";
import { getSiteSettings } from "@/lib/data/siteSettings";
import { absoluteUrl, defaultSeo, getDefaultOgImage, getSiteUrl } from "@/lib/seo";
import "./globals.css";

export async function generateMetadata() {
  const siteSettings = await getSiteSettings();
  const businessName = siteSettings.business.name || "Karari Beauty";
  const title = siteSettings.seo.siteTitle || defaultSeo.title;
  const description = siteSettings.seo.metaDescription || defaultSeo.description;
  const favicon = siteSettings.business.faviconUrl || "/favicon.png";
  const ogImage = siteSettings.seo.ogImageUrl ? absoluteUrl(siteSettings.seo.ogImageUrl) : getDefaultOgImage();

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
    alternates: {
      canonical: getSiteUrl()
    },
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
    }
  };
}

export default async function RootLayout({ children }) {
  const siteSettings = await getSiteSettings();

  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
        <FloatingActions siteSettings={siteSettings} />
      </body>
    </html>
  );
}
