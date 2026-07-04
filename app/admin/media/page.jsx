import AdminMediaExperience from "@/components/admin/AdminMediaExperience";
import AdminSetupRequired from "@/components/admin/AdminSetupRequired";
import { isAdminConfigured } from "@/lib/admin/auth";

export const metadata = {
  title: {
    absolute: "Admin Media Library | Karari Beauty"
  },
  description: "Upload and manage Karari Beauty product, category and campaign images.",
  robots: {
    index: false,
    follow: false
  }
};

export default function AdminMediaPage() {
  if (!isAdminConfigured()) {
    return (
      <main className="min-h-screen bg-[linear-gradient(135deg,#FFF8EE_0%,#FCE7EC_54%,#FFF8EE_100%)] px-4 py-8 text-[#3A2417] sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-2xl items-center">
          <AdminSetupRequired />
        </div>
      </main>
    );
  }

  return <AdminMediaExperience />;
}
