import PolicyPageExperience from "@/components/PolicyPageExperience";
import { policies } from "@/data/policies";
import { getCategories } from "@/lib/data/categories";
import { getSiteSettings } from "@/lib/data/siteSettings";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Terms & Conditions",
  description: "Read the Karari Beauty terms covering accounts, product information, pricing, orders, payments, shipping, returns and use of this website.",
  path: "/terms-and-conditions"
});

export default async function TermsAndConditionsPage() {
  const [categories, siteSettings] = await Promise.all([getCategories(), getSiteSettings()]);
  return <PolicyPageExperience policy={policies.terms} categories={categories} siteSettings={siteSettings} />;
}
