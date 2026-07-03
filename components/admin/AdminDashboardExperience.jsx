"use client";

import { useEffect, useState } from "react";
import AdminAuthGate from "@/components/admin/AdminAuthGate";
import AdminDashboard from "@/components/admin/AdminDashboard";
import AdminLayoutShell from "@/components/admin/AdminLayoutShell";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

function DashboardContent() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadStats() {
      const supabase = createBrowserSupabaseClient();
      if (!supabase) return;

      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (!token) return;

      try {
        const response = await fetch("/api/admin/dashboard", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        const result = await response.json();

        if (!response.ok || !result.ok) {
          throw new Error("Unable to load admin dashboard stats.");
        }

        if (mounted) setStats(result.stats);
      } catch (caughtError) {
        if (mounted) setError(caughtError.message || "Unable to load admin dashboard stats.");
      }
    }

    loadStats();

    return () => {
      mounted = false;
    };
  }, []);

  if (error) {
    return (
      <div className="rounded-2xl border border-[rgba(122,24,61,0.14)] bg-white/82 p-6 text-center shadow-boutique">
        <p className="font-display text-2xl font-semibold text-[#7A183D]">Dashboard unavailable</p>
        <p className="mt-3 text-sm font-semibold text-[#3A2417]/64">{error}</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="rounded-full border border-[rgba(122,24,61,0.14)] bg-white px-5 py-3 text-sm font-bold text-[#7A183D] shadow-soft">
        Loading dashboard...
      </div>
    );
  }

  return <AdminDashboard stats={stats} />;
}

export default function AdminDashboardExperience() {
  return (
    <AdminAuthGate>
      {(admin) => (
        <AdminLayoutShell admin={admin}>
          <DashboardContent />
        </AdminLayoutShell>
      )}
    </AdminAuthGate>
  );
}
