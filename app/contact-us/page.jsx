import PolicyPageExperience from "@/components/PolicyPageExperience";
import { policies } from "@/data/policies";
import { getCategories } from "@/lib/data/categories";
import { getSiteSettings } from "@/lib/data/siteSettings";

export const metadata = {
  title: "Contact Us",
  description: "Contact Karari Beauty for order support, product questions, shipping, returns and payment-related help."
};

export default async function ContactUsPage() {
  const [categories, siteSettings] = await Promise.all([getCategories(), getSiteSettings()]);
  return <PolicyPageExperience policy={policies.contact} categories={categories} siteSettings={siteSettings} />;
}
