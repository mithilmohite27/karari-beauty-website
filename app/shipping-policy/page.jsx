import PolicyPageExperience from "@/components/PolicyPageExperience";
import { policies } from "@/data/policies";
import { getCategories } from "@/lib/data/categories";
import { getSiteSettings } from "@/lib/data/siteSettings";

export const metadata = {
  title: "Shipping Policy",
  description: "Review Karari Beauty shipping fees, processing timelines and estimated delivery information."
};

export default async function ShippingPolicyPage() {
  const [categories, siteSettings] = await Promise.all([getCategories(), getSiteSettings()]);
  return <PolicyPageExperience policy={policies.shipping} categories={categories} siteSettings={siteSettings} />;
}
