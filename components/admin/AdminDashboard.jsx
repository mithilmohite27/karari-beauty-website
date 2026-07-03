"use client";

import Link from "next/link";
import { ArrowRight, Boxes, CalendarDays, FolderTree, Package, ShoppingBag, Sparkles } from "lucide-react";

function AdminStatCard({ label, value, helper, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-[rgba(122,24,61,0.14)] bg-white/82 p-5 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#C9962D]">{label}</p>
          <p className="mt-3 font-display text-4xl font-semibold text-[#7A183D]">{value}</p>
        </div>
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FFF8EE] text-[#C9962D]">
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-3 text-sm font-semibold leading-6 text-[#3A2417]/60">{helper}</p>
    </div>
  );
}

function QuickAction({ title, text, icon: Icon, href, status = "Manage" }) {
  const content = (
    <>
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFF8EE] text-[#C9962D]">
          <Icon className="h-5 w-5" />
        </span>
        <h3 className="font-display text-xl font-semibold text-[#7A183D]">{title}</h3>
      </div>
      <p className="mt-3 text-sm font-semibold leading-6 text-[#3A2417]/62">{text}</p>
      <p className="mt-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#C9962D]">
        {status}
        <ArrowRight className="h-3.5 w-3.5" />
      </p>
    </>
  );

  return href ? (
    <Link href={href} className="block rounded-2xl border border-[rgba(122,24,61,0.14)] bg-white/72 p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-[#C9962D]/50">
      {content}
    </Link>
  ) : (
    <article className="rounded-2xl border border-[rgba(122,24,61,0.14)] bg-white/72 p-5 shadow-soft">
      {content}
    </article>
  );
}

export default function AdminDashboard({ stats }) {
  const statCards = [
    { label: "Total Products", value: stats.totalProducts, helper: "Catalog items available through the service layer.", icon: Package },
    { label: "Active Categories", value: stats.activeCategories, helper: "Collection pages ready for storefront browsing.", icon: FolderTree },
    { label: "Featured Products", value: stats.featuredProducts, helper: "Highlighted products for homepage and seasonal sections.", icon: Sparkles },
    { label: "Recent Orders", value: stats.recentOrders, helper: "Live customer order requests available in the orders dashboard.", icon: ShoppingBag }
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <section className="rounded-3xl border border-[rgba(122,24,61,0.14)] bg-white/74 p-5 shadow-boutique sm:p-7">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#C9962D]">Dashboard</p>
        <h1 className="mt-3 font-display text-3xl font-semibold text-[#7A183D] sm:text-5xl">Welcome to Karari Beauty Admin</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[#3A2417]/68 sm:text-base">
          Use this panel to manage boutique products, seasonal campaigns and customer order requests.
        </p>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <AdminStatCard key={card.label} {...card} />
        ))}
      </section>

      <section className="mt-6">
        <div className="mb-4 flex items-center gap-2">
          <Boxes className="h-5 w-5 text-[#C9962D]" />
          <h2 className="font-display text-2xl font-semibold text-[#7A183D]">Admin Shortcuts</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <QuickAction title="Products" text="Manage products, pricing, images and visibility." icon={Package} href="/admin/products" />
          <QuickAction title="Categories" text="Manage storefront collections and category visibility." icon={FolderTree} href="/admin/categories" />
          <QuickAction title="Orders" text="Manage order requests, statuses and timelines." icon={ShoppingBag} href="/admin/orders" />
          <QuickAction title="Campaigns" text="Manage seasonal campaigns, offers and activation." icon={CalendarDays} href="/admin/campaigns" />
        </div>
      </section>
    </div>
  );
}
