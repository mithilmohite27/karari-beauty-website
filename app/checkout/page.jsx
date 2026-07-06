import CheckoutPageExperience from "@/components/CheckoutPageExperience";
import { getProducts } from "@/lib/data/products";
import { getSiteSettings } from "@/lib/data/siteSettings";

export const metadata = {
  title: {
    absolute: "Checkout | Karari Beauty"
  },
  description: "Submit a Karari Beauty order request for delivery and payment confirmation.",
  robots: {
    index: false,
    follow: false
  }
};

export default async function CheckoutPage() {
  const [products, siteSettings] = await Promise.all([getProducts(), getSiteSettings()]);
  return <CheckoutPageExperience products={products} siteSettings={siteSettings} />;
}
