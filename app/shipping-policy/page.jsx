import PolicyPageExperience from "@/components/PolicyPageExperience";
import { policies } from "@/data/policies";
import { getCategories } from "@/lib/data/categories";
import { getSiteSettings } from "@/lib/data/siteSettings";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Shipping Policy",
  description: "Review Karari Beauty order processing, shipping fees, delivery estimates within Gujarat and India, international delivery and tracking information.",
  path: "/shipping-policy"
});

export default async function ShippingPolicyPage() {
  const [categories, siteSettings] = await Promise.all([getCategories(), getSiteSettings()]);
  return <PolicyPageExperience policy={policies.shipping} categories={categories} siteSettings={siteSettings} />;
}
