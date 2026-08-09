import ResetPasswordExperience from "@/components/ResetPasswordExperience";

export const metadata = {
  title: {
    absolute: "Reset Password | Karari Beauty"
  },
  description: "Set a new password for your Karari Beauty account.",
  robots: {
    index: false,
    follow: false
  }
};

export default function ResetPasswordPage() {
  return <ResetPasswordExperience />;
}
