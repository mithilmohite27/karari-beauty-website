import PolicyPageExperience from "@/components/PolicyPageExperience";
import { policies } from "@/data/policies";
import { getCategories } from "@/lib/data/categories";
import { getSiteSettings } from "@/lib/data/siteSettings";

export const metadata = {
  title: "Return & Refund Policy",
  description: "Understand Karari Beauty return request window, exchange rules and refund processing timelines."
};

export default async function ReturnRefundPolicyPage() {
  const [categories, siteSettings] = await Promise.all([getCategories(), getSiteSettings()]);
  return <PolicyPageExperience policy={policies.returns} categories={categories} siteSettings={siteSettings} />;
}
