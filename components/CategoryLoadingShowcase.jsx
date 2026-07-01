import Image from "next/image";
import { categories } from "@/data/categories";

export default function CategoryLoadingShowcase() {
  const featuredCategories = categories.filter((category) => ["rakhi", "jewellery", "bangles", "handbags", "watches", "gift-items"].includes(category.slug));

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#FFF8EE_0%,#FCE7EC_60%,#FFF8EE_100%)] px-4 py-8 text-[#3A2417] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-xl border border-[rgba(122,24,61,0.14)] bg-white/70 p-6 shadow-boutique backdrop-blur sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Image src="/logo.png" alt="Karari Beauty logo" width={56} height={56} className="h-14 w-14 rounded-full border border-[rgba(201,150,45,0.35)] object-cover shadow-soft" />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#C9962D]">Karari Beauty</p>
                <h1 className="font-display text-2xl font-semibold text-[#7A183D]">Curating Karari Beauty collections...</h1>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {featuredCategories.map((category) => (
                <span key={category.id} className="rounded-full border border-[rgba(122,24,61,0.14)] bg-[#FFF8EE] px-3 py-1.5 text-xs font-bold text-[#7A183D] shadow-soft">
                  {category.name}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="overflow-hidden rounded-lg border border-[rgba(122,24,61,0.12)] bg-white/78 shadow-soft">
                <div className="h-40 animate-pulse bg-[linear-gradient(90deg,#FFF8EE_0%,#FCE7EC_45%,#FFF8EE_100%)]" />
                <div className="space-y-3 p-4">
                  <div className="h-3 w-20 animate-pulse rounded-full bg-[#C9962D]/22" />
                  <div className="h-4 w-4/5 animate-pulse rounded-full bg-[#7A183D]/14" />
                  <div className="h-3 w-full animate-pulse rounded-full bg-[#3A2417]/10" />
                  <div className="h-3 w-2/3 animate-pulse rounded-full bg-[#3A2417]/10" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
