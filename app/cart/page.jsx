import CartPageExperience from "@/components/CartPageExperience";
import { getProducts } from "@/lib/data/products";

export const metadata = {
  title: {
    absolute: "Cart | Karari Beauty"
  },
  description: "Review selected Karari Beauty products before checkout.",
  robots: {
    index: false,
    follow: false
  }
};

export default async function CartPage() {
  const products = await getProducts();
  return <CartPageExperience products={products} />;
}
