import AdminLoginExperience from "@/components/admin/AdminLoginExperience";

export const metadata = {
  title: {
    absolute: "Admin Login | Karari Beauty"
  },
  description: "Secure Karari Beauty admin login.",
  robots: {
    index: false,
    follow: false
  }
};

export default function AdminLoginPage() {
  return <AdminLoginExperience />;
}
