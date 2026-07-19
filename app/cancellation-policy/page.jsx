import PolicyPageExperience from "@/components/PolicyPageExperience";
import { policies } from "@/data/policies";
import { getCategories } from "@/lib/data/categories";
import { getSiteSettings } from "@/lib/data/siteSettings";

export const metadata = {
  title: "Cancellation Policy",
  description: "Read when Karari Beauty orders can be cancelled by customers or by the business."
};

export default async function CancellationPolicyPage() {
  const [categories, siteSettings] = await Promise.all([getCategories(), getSiteSettings()]);
  return <PolicyPageExperience policy={policies.cancellation} categories={categories} siteSettings={siteSettings} />;
}
