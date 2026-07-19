import PolicyPageExperience from "@/components/PolicyPageExperience";
import { policies } from "@/data/policies";
import { getCategories } from "@/lib/data/categories";
import { getSiteSettings } from "@/lib/data/siteSettings";

export const metadata = {
  title: "Terms & Conditions",
  description: "Read Karari Beauty terms and conditions for accounts, products, orders, shipping, returns and website use."
};

export default async function TermsAndConditionsPage() {
  const [categories, siteSettings] = await Promise.all([getCategories(), getSiteSettings()]);
  return <PolicyPageExperience policy={policies.terms} categories={categories} siteSettings={siteSettings} />;
}
