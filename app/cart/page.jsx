import CartPageExperience from "@/components/CartPageExperience";

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

export default function CartPage() {
  return <CartPageExperience />;
}
