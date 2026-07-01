import HomeExperience from "@/components/HomeExperience";
import { businessSettings } from "@/data/businessSettings";
import { seasonalCampaign } from "@/data/seasonalCampaign";
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

export default function Home() {
  return (
    <>
      <StoreJsonLd />
      <HomeExperience campaignActive={seasonalCampaign.active} />
    </>
  );
}
