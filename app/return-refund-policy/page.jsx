import PolicyPageExperience from "@/components/PolicyPageExperience";
import { policies } from "@/data/policies";
import { getCategories } from "@/lib/data/categories";
import { getSiteSettings } from "@/lib/data/siteSettings";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Return & Refund Policy",
  description: "Understand the Karari Beauty four-day return request window, product eligibility, exchanges, damaged-item support and refund processing timelines.",
  path: "/return-refund-policy"
});

export default async function ReturnRefundPolicyPage() {
  const [categories, siteSettings] = await Promise.all([getCategories(), getSiteSettings()]);
  return <PolicyPageExperience policy={policies.returns} categories={categories} siteSettings={siteSettings} />;
}
