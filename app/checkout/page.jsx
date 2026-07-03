import CheckoutPageExperience from "@/components/CheckoutPageExperience";
import { getProducts } from "@/lib/data/products";

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
  const products = await getProducts();
  return <CheckoutPageExperience products={products} />;
}
