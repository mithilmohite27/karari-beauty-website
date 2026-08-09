import PolicyPageExperience from "@/components/PolicyPageExperience";
import { policies } from "@/data/policies";
import { getCategories } from "@/lib/data/categories";
import { getSiteSettings } from "@/lib/data/siteSettings";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Contact Karari Beauty in Vansda",
  description: "Contact Karari Beauty in Vansda for product questions, order support, shipping updates, returns, cancellations and payment-related help.",
  path: "/contact-us"
});

export default async function ContactUsPage() {
  const [categories, siteSettings] = await Promise.all([getCategories(), getSiteSettings()]);
  return <PolicyPageExperience policy={policies.contact} categories={categories} siteSettings={siteSettings} />;
}
