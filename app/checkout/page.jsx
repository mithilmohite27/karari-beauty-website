import CheckoutPageExperience from "@/components/CheckoutPageExperience";

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

export default function CheckoutPage() {
  return <CheckoutPageExperience />;
}
