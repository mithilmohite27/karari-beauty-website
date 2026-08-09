import PolicyPageExperience from "@/components/PolicyPageExperience";
import { policies } from "@/data/policies";
import { getCategories } from "@/lib/data/categories";
import { getSiteSettings } from "@/lib/data/siteSettings";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Privacy Policy",
  description: "Learn how Karari Beauty collects, uses, stores and protects customer information for accounts, orders, payments, delivery and support.",
  path: "/privacy-policy"
});

export default async function PrivacyPolicyPage() {
  const [categories, siteSettings] = await Promise.all([getCategories(), getSiteSettings()]);
  return <PolicyPageExperience policy={policies.privacy} categories={categories} siteSettings={siteSettings} />;
}
