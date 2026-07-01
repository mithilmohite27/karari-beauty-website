import SignInExperience from "@/components/SignInExperience";

export const metadata = {
  title: {
    absolute: "Sign In | Karari Beauty"
  },
  description: "Sign in to your Karari Beauty account to save wishlist, track order requests and checkout faster.",
  robots: {
    index: false,
    follow: false
  }
};

export default function SignInPage() {
  return <SignInExperience />;
}
