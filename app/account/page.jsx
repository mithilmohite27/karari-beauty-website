import AccountExperience from "@/components/AccountExperience";

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

export default function AccountPage() {
  return <AccountExperience />;
}
