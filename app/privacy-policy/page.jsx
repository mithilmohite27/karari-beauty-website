import PolicyPageExperience from "@/components/PolicyPageExperience";
import { policies } from "@/data/policies";
import { getCategories } from "@/lib/data/categories";
import { getSiteSettings } from "@/lib/data/siteSettings";

export const metadata = {
  title: "Privacy Policy",
  description: "Learn how Karari Beauty collects, uses and protects customer information for accounts, orders and support."
};

export default async function PrivacyPolicyPage() {
  const [categories, siteSettings] = await Promise.all([getCategories(), getSiteSettings()]);
  return <PolicyPageExperience policy={policies.privacy} categories={categories} siteSettings={siteSettings} />;
}
