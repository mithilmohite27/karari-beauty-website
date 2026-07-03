"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminSetupRequired from "@/components/admin/AdminSetupRequired";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export default function AdminAuthGate({ children }) {
  const router = useRouter();
  const [state, setState] = useState({ status: "checking", admin: null, reason: "" });

  useEffect(() => {
    let mounted = true;

    async function verifyAdmin() {
      const supabase = createBrowserSupabaseClient();

      if (!supabase) {
        if (mounted) setState({ status: "setup", admin: null, reason: "setup_required" });
        return;
      }

      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (!token) {
        router.replace("/admin/login");
        return;
      }

      try {
        const response = await fetch("/api/admin/me", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        const result = await response.json();

        if (!result.configured) {
          if (mounted) setState({ status: "setup", admin: null, reason: "setup_required" });
          return;
        }

        if (!response.ok || !result.ok) {
          await supabase.auth.signOut();
          router.replace("/admin/login");
          return;
        }

        if (mounted) setState({ status: "ready", admin: result.admin, reason: "" });
      } catch {
        if (mounted) setState({ status: "error", admin: null, reason: "verification_failed" });
      }
    }

    verifyAdmin();

    return () => {
      mounted = false;
    };
  }, [router]);

  if (state.status === "setup") {
    return (
      <main className="min-h-screen bg-[linear-gradient(135deg,#FFF8EE_0%,#FCE7EC_54%,#FFF8EE_100%)] px-4 py-8 text-[#3A2417] sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-2xl items-center">
          <AdminSetupRequired />
        </div>
      </main>
    );
  }

  if (state.status === "error") {
    return (
      <main className="min-h-screen bg-[#FFF8EE] px-4 py-8 text-[#3A2417]">
        <div className="mx-auto max-w-xl rounded-2xl border border-[rgba(122,24,61,0.14)] bg-white p-6 text-center shadow-boutique">
          <p className="font-display text-2xl font-semibold text-[#7A183D]">Admin verification failed</p>
          <p className="mt-3 text-sm leading-6 text-[#3A2417]/68">Please refresh the page or sign in again.</p>
        </div>
      </main>
    );
  }

  if (state.status !== "ready") {
    return (
      <main className="min-h-screen bg-[#FFF8EE] px-4 py-8 text-[#3A2417]">
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl items-center justify-center">
          <div className="rounded-full border border-[rgba(122,24,61,0.14)] bg-white px-5 py-3 text-sm font-bold text-[#7A183D] shadow-soft">
            Checking admin access...
          </div>
        </div>
      </main>
    );
  }

  return typeof children === "function" ? children(state.admin) : children;
}
