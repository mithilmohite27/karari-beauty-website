import FloatingActions from "@/components/FloatingActions";
import { defaultSeo, getDefaultOgImage, getSiteUrl } from "@/lib/seo";
import "./globals.css";

export const metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: defaultSeo.title,
    template: "%s | Karari Beauty"
  },
  description: defaultSeo.description,
  keywords: defaultSeo.keywords,
  authors: [{ name: "Karari Beauty" }],
  creator: "Karari Beauty",
  publisher: "Karari Beauty",
  icons: {
    icon: [
      {
        url: "/favicon.png",
        type: "image/png"
      }
    ],
    apple: "/apple-touch-icon.png"
  },
  openGraph: {
    title: defaultSeo.title,
    description: defaultSeo.description,
    url: getSiteUrl(),
    siteName: "Karari Beauty",
    images: [
      {
        url: getDefaultOgImage(),
        width: 1200,
        height: 630,
        alt: "Karari Beauty boutique gifting collection"
      }
    ],
    locale: "en_IN",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: defaultSeo.title,
    description: defaultSeo.description,
    images: [getDefaultOgImage()]
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

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
        <FloatingActions />
      </body>
    </html>
  );
}
