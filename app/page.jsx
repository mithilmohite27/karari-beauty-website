import HomeExperience from "@/components/HomeExperience";
import { businessSettings } from "@/data/businessSettings";
import { getActiveCategories } from "@/lib/data/categories";
import { getProducts } from "@/lib/data/products";
import { getActiveSeasonalCampaign } from "@/lib/data/seasonalCampaigns";
import { getSiteSettings } from "@/lib/data/siteSettings";
import { absoluteUrl, createPageMetadata, defaultSeo, getSiteUrl } from "@/lib/seo";

// Rendered statically and served from the CDN. Admin writes purge the storefront
// cache tags (see lib/cache.js), so published edits appear immediately; this
// window is only a fallback for a missed purge.
export const revalidate = 3600;

export async function generateMetadata() {
  const siteSettings = await getSiteSettings();
  const businessName = siteSettings.business.name || "Karari Beauty";
  const title = siteSettings.seo.siteTitle || defaultSeo.title;
  const description = siteSettings.seo.metaDescription || defaultSeo.description;
  const image = siteSettings.seo.ogImageUrl || defaultSeo.ogImage;

  return createPageMetadata({
    title,
    description,
    path: "/",
    image,
    imageAlt: `${businessName} jewellery, gifting and festive collection`,
    brandName: businessName
  });
}

function StoreJsonLd({ siteSettings }) {
  const business = siteSettings.business;
  const contact = siteSettings.contact;
  const social = siteSettings.social;

  const siteUrl = getSiteUrl();
  const storeId = `${siteUrl}/#store`;
  const websiteId = `${siteUrl}/#website`;
  const phoneNumber = contact.phoneNumber || businessSettings.phoneNumber;
  const email = contact.email || businessSettings.supportEmail;
  const address = contact.address || businessSettings.address;
  const city = contact.city || businessSettings.city;
  const state = contact.state || businessSettings.state;
  const country = contact.country || businessSettings.country;
  const mapsUrl = contact.mapsUrl || businessSettings.mapsUrl;
  const postalCode = address.match(/\b\d{6}\b/)?.[0];
  const store = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": websiteId,
        url: siteUrl,
        name: business.name || "Karari Beauty",
        inLanguage: "en-IN",
        publisher: { "@id": storeId }
      },
      {
        "@type": ["Store", "OnlineStore"],
        "@id": storeId,
        name: business.name || "Karari Beauty",
        description: siteSettings.seo.metaDescription || defaultSeo.description,
        url: siteUrl,
        image: absoluteUrl(business.logoUrl || "/logo.png"),
        logo: absoluteUrl(business.logoUrl || "/logo.png"),
        telephone: phoneNumber,
        email,
        hasMap: mapsUrl,
        address: {
          "@type": "PostalAddress",
          streetAddress: address,
          addressLocality: city,
          addressRegion: state,
          addressCountry: country,
          ...(postalCode ? { postalCode } : {})
        },
        sameAs: [social.instagramUrl, social.facebookUrl, social.youtubeUrl].filter(Boolean),
        contactPoint: {
          "@type": "ContactPoint",
          telephone: phoneNumber,
          email,
          contactType: "customer service"
        },
        hasMerchantReturnPolicy: {
          "@type": "MerchantReturnPolicy",
          merchantReturnLink: absoluteUrl("/return-refund-policy")
        }
      }
    ]
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(store).replace(/</g, "\\u003c") }} />;
}

export default async function Home() {
  const [categories, products, seasonalCampaign, siteSettings] = await Promise.all([
    getActiveCategories(),
    getProducts(),
    getActiveSeasonalCampaign(),
    getSiteSettings()
  ]);

  return (
    <>
      <StoreJsonLd siteSettings={siteSettings} />
      <HomeExperience categories={categories} products={products} seasonalCampaign={seasonalCampaign} campaignActive={Boolean(seasonalCampaign?.active)} siteSettings={siteSettings} />
    </>
  );
}
