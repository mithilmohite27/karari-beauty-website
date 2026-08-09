import PolicyPageExperience from "@/components/PolicyPageExperience";
import { policies } from "@/data/policies";
import { getCategories } from "@/lib/data/categories";
import { getSiteSettings } from "@/lib/data/siteSettings";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Order Cancellation Policy",
  description: "Read when a Karari Beauty order can be cancelled before confirmation, packing or dispatch, and how approved prepaid-order refunds are handled.",
  path: "/cancellation-policy"
});

export default async function CancellationPolicyPage() {
  const [categories, siteSettings] = await Promise.all([getCategories(), getSiteSettings()]);
  return <PolicyPageExperience policy={policies.cancellation} categories={categories} siteSettings={siteSettings} />;
}
