import HomeExperience from "@/components/HomeExperience";
import { businessSettings } from "@/data/businessSettings";
import { getActiveCategories } from "@/lib/data/categories";
import { getProducts } from "@/lib/data/products";
import { getActiveSeasonalCampaign } from "@/lib/data/seasonalCampaigns";
import { absoluteUrl, defaultSeo, getSiteUrl } from "@/lib/seo";

function StoreJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: "Karari Beauty",
    description: defaultSeo.description,
    url: getSiteUrl(),
    image: absoluteUrl("/logo.png"),
    email: businessSettings.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: "Tower Road, Main Bazar",
      addressLocality: "Vansda",
      addressRegion: "Gujarat",
      postalCode: "396580",
      addressCountry: "IN"
    },
    openingHours: "Mo-Su 07:00-21:00",
    sameAs: ["https://www.instagram.com/karari1999/", "https://www.facebook.com/karari1999"]
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />;
}

export default async function Home() {
  const [categories, products, seasonalCampaign] = await Promise.all([
    getActiveCategories(),
    getProducts(),
    getActiveSeasonalCampaign()
  ]);

  return (
    <>
      <StoreJsonLd />
      <HomeExperience categories={categories} products={products} seasonalCampaign={seasonalCampaign} campaignActive={Boolean(seasonalCampaign?.active)} />
    </>
  );
}
