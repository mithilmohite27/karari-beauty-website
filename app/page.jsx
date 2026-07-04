import HomeExperience from "@/components/HomeExperience";
import { getActiveCategories } from "@/lib/data/categories";
import { getProducts } from "@/lib/data/products";
import { getActiveSeasonalCampaign } from "@/lib/data/seasonalCampaigns";
import { getSiteSettings } from "@/lib/data/siteSettings";
import { absoluteUrl, defaultSeo, getSiteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function StoreJsonLd({ siteSettings }) {
  const business = siteSettings.business;
  const contact = siteSettings.contact;
  const social = siteSettings.social;

  const schema = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: business.name || "Karari Beauty",
    description: siteSettings.seo.metaDescription || defaultSeo.description,
    url: getSiteUrl(),
    image: absoluteUrl(business.logoUrl || "/logo.png"),
    email: contact.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: contact.address,
      addressLocality: contact.city,
      addressRegion: contact.state,
      addressCountry: contact.country
    },
    openingHours: "Mo-Su 07:00-21:00",
    sameAs: [social.instagramUrl, social.facebookUrl, social.youtubeUrl].filter(Boolean)
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />;
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
