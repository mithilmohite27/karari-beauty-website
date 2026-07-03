import Link from "next/link";
import { ArrowRight, BadgeCheck, Gift, Globe2, Truck } from "lucide-react";
import { categories as localCategories } from "@/data/categories";

const trustItems = [
  { label: "Secure Order Support", icon: BadgeCheck },
  { label: "Fast Delivery", icon: Truck },
  { label: "Gift Ready Picks", icon: Gift },
  { label: "International Inquiry", icon: Globe2 }
];

export default function CollectionMarketingPanel({ category, compact = false, categories = localCategories }) {
  const title = category.marketingTitle || "Curated by Karari Beauty";
  const text = category.marketingText || "Selected boutique products for gifting, celebrations and everyday style.";
  const recommendedCategory =
    categories.find((item) => item.slug === category.recommendedCategorySlug && item.slug !== category.slug) ||
    (category.relatedCategorySlugs || []).map((slug) => categories.find((item) => item.slug === slug)).find((item) => item && item.slug !== category.slug) ||
    categories.find((item) => item.slug !== category.slug);
  const recommendedLabel =
    recommendedCategory?.slug === "rakhi"
      ? "View Rakhi Collection"
      : recommendedCategory?.slug === "gift-items"
        ? "View Gift Items"
        : recommendedCategory
          ? `Explore ${recommendedCategory.name}`
          : "";

  return (
    <aside className={`rounded-xl border border-[rgba(122,24,61,0.14)] bg-white/72 shadow-soft backdrop-blur ${compact ? "p-5" : "p-6 sm:p-7"}`}>
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#C9962D]">Collection Story</p>
      <h2 className="mt-3 font-display text-2xl font-semibold text-[#7A183D]">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-[#3A2417]/70">{text}</p>

      {category.promotionalNote ? (
        <div className="mt-5 rounded-lg border border-[rgba(201,150,45,0.28)] bg-[#FFF8EE] p-4 text-sm font-semibold leading-6 text-[#7A183D]">
          {category.promotionalNote}
        </div>
      ) : null}

      <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {trustItems.map(({ label, icon: Icon }) => (
          <div key={label} className="flex items-center gap-2 rounded-md border border-[rgba(122,24,61,0.12)] bg-[#FFF8EE]/80 px-3 py-2 text-xs font-bold text-[#3A2417]/72">
            <Icon className="h-4 w-4 text-[#C9962D]" />
            {label}
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
        <Link href="/#collections" className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-[rgba(122,24,61,0.16)] bg-white/70 px-4 py-3 text-sm font-bold text-[#7A183D] transition hover:border-[#C9962D] hover:text-[#C9962D]">
          Explore All Categories
        </Link>
        {recommendedCategory ? (
          <Link href={recommendedCategory.href} className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-[#7A183D] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#3A2417]">
            {recommendedLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : null}
      </div>
    </aside>
  );
}
