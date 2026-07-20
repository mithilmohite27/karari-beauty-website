import AccountExperience from "@/components/AccountExperience";
import { getProducts } from "@/lib/data/products";

export const metadata = {
  title: {
    absolute: "My Account | Karari Beauty"
  },
  description: "Manage your Karari Beauty orders, wishlist, addresses and account details.",
  robots: {
    index: false,
    follow: false
  }
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AccountPage() {
  const products = await getProducts();

  return <AccountExperience products={products} />;
}
