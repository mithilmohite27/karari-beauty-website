"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, CalendarDays, FolderTree, Image as ImageIcon, LogOut, Menu, Package, Settings, ShoppingBag, Users, X } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

const navItems = [
  { label: "Dashboard", href: "/admin", icon: BarChart3 },
  { label: "Products", href: "/admin/products", icon: Package },
  { label: "Categories", href: "/admin/categories", icon: FolderTree },
  { label: "Orders", href: "/admin/orders", icon: ShoppingBag },
  { label: "Customers", href: "/admin/customers", icon: Users },
  { label: "Campaigns", href: "/admin/campaigns", icon: CalendarDays },
  { label: "Media", icon: ImageIcon },
  { label: "Settings", icon: Settings }
];

function AdminSidebar({ open, onClose }) {
  const pathname = usePathname();

  return (
    <aside className={`${open ? "fixed inset-y-0 left-0 z-50 w-72" : "hidden"} border-r border-[rgba(122,24,61,0.12)] bg-[#FFF8EE] p-4 shadow-boutique lg:static lg:block lg:w-72 lg:shadow-none`}>
      <div className="flex items-center justify-between gap-3">
        <Link href="/admin" className="flex items-center gap-3">
          <Image src="/logo.png" alt="Karari Beauty logo" width={42} height={42} className="h-10 w-10 rounded-full border border-[rgba(201,150,45,0.32)] object-cover" />
          <span>
            <span className="block font-display text-xl font-semibold text-[#3A2417]">Karari Beauty</span>
            <span className="text-[0.66rem] font-bold uppercase tracking-[0.18em] text-[#C9962D]">Admin</span>
          </span>
        </Link>
        <button type="button" onClick={onClose} className="rounded-md border border-[rgba(122,24,61,0.14)] p-2 text-[#7A183D] lg:hidden" aria-label="Close admin menu">
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav className="mt-8 space-y-2">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = href === "/admin" ? pathname === href : href && pathname?.startsWith(href);

          return href ? (
            <Link key={label} href={href} onClick={onClose} className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-bold transition ${active ? "bg-[#7A183D] text-white" : "text-[#3A2417]/68 hover:bg-[#FCE7EC] hover:text-[#7A183D]"}`}>
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ) : (
            <div key={label} className="flex min-h-11 items-center justify-between gap-3 rounded-lg px-3 text-sm font-bold text-[#3A2417]/42">
              <span className="inline-flex items-center gap-3">
                <Icon className="h-4 w-4" />
                {label}
              </span>
              <span className="rounded-full bg-white px-2 py-1 text-[0.62rem] uppercase tracking-[0.12em] text-[#C9962D]">Soon</span>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

function AdminTopbar({ admin, onMenuClick }) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const logout = async () => {
    setLoggingOut(true);
    const supabase = createBrowserSupabaseClient();
    await supabase?.auth.signOut();
    router.replace("/admin/login");
  };

  return (
    <header className="border-b border-[rgba(122,24,61,0.12)] bg-white/82 px-4 py-3 backdrop-blur sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={onMenuClick} className="rounded-md border border-[rgba(122,24,61,0.14)] p-2 text-[#7A183D] lg:hidden" aria-label="Open admin menu">
          <Menu className="h-4 w-4" />
        </button>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#C9962D]">Admin Panel</p>
          <p className="truncate font-display text-xl font-semibold text-[#7A183D]">Welcome, {admin?.fullName || "Karari Admin"}</p>
        </div>
        <button type="button" onClick={logout} disabled={loggingOut} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[rgba(122,24,61,0.14)] bg-[#FFF8EE] px-3 text-sm font-bold text-[#7A183D] transition hover:border-[#C9962D] disabled:opacity-70">
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">{loggingOut ? "Signing out..." : "Logout"}</span>
        </button>
      </div>
    </header>
  );
}

export default function AdminLayoutShell({ admin, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#FFF8EE_0%,#FCE7EC_60%,#FFF8EE_100%)] text-[#3A2417]">
      {sidebarOpen ? <div className="fixed inset-0 z-40 bg-[#3A2417]/35 lg:hidden" onClick={() => setSidebarOpen(false)} aria-hidden="true" /> : null}
      <div className="flex min-h-screen">
        <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="min-w-0 flex-1">
          <AdminTopbar admin={admin} onMenuClick={() => setSidebarOpen(true)} />
          <div className="px-4 py-5 sm:px-6 lg:px-8">
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}
