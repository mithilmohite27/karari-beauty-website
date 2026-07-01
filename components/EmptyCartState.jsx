"use client";

import Link from "next/link";
import { ShoppingBag, Sparkles } from "lucide-react";

export default function EmptyCartState({ compact = false, onAction }) {
  return (
    <div className={`rounded-xl border border-[rgba(122,24,61,0.14)] bg-white/82 text-center shadow-soft ${compact ? "p-6" : "p-8 sm:p-12"}`}>
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[rgba(201,150,45,0.28)] bg-[#FFF8EE] text-[#C9962D]">
        <ShoppingBag className="h-6 w-6" />
      </div>
      <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-[#C9962D]">Karari Beauty Cart</p>
      <h2 className="mt-2 font-display text-3xl font-semibold text-[#7A183D]">
        Your cart is waiting for something beautiful
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#3A2417]/68">
        Explore Karari Beauty collections and add your favourite picks.
      </p>
      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        <Link
          href="/#collections"
          onClick={onAction}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#7A183D] px-5 text-sm font-bold text-white transition hover:bg-[#3A2417]"
        >
          <Sparkles className="h-4 w-4" />
          Explore Collections
        </Link>
        <Link
          href="/collections/rakhi"
          onClick={onAction}
          className="inline-flex h-11 items-center justify-center rounded-md border border-[#7A183D] bg-white px-5 text-sm font-bold text-[#7A183D] transition hover:bg-[#FFF8EE]"
        >
          Shop Rakhi
        </Link>
      </div>
    </div>
  );
}
