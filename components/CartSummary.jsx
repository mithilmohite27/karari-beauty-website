"use client";

import Link from "next/link";
import { ArrowRight, PackageCheck, ShieldCheck, Truck } from "lucide-react";
import { goToCheckout } from "@/lib/customer/session";
import { formatCurrency } from "@/lib/whatsapp";

export default function CartSummary({ subtotal, itemCount, mode = "page", onContinueShopping, onCheckout }) {
  const compact = mode === "drawer";

  return (
    <aside className={`rounded-xl border border-[rgba(122,24,61,0.14)] bg-white/86 p-4 shadow-boutique ${compact ? "" : "lg:sticky lg:top-32"}`}>
      <div className="flex items-center justify-between gap-3 border-b border-[rgba(122,24,61,0.12)] pb-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#C9962D]">Order Summary</p>
          <h2 className="mt-1 font-display text-2xl font-semibold text-[#7A183D]">{formatCurrency(subtotal)}</h2>
        </div>
        <span className="rounded-full border border-[rgba(122,24,61,0.14)] bg-[#FFF8EE] px-3 py-1 text-xs font-bold text-[#7A183D]">
          {itemCount} {itemCount === 1 ? "item" : "items"}
        </span>
      </div>

      <div className="space-y-3 py-4 text-sm font-semibold text-[#3A2417]/74">
        <div className="flex items-center justify-between gap-3">
          <span>Subtotal</span>
          <span className="text-[#3A2417]">{formatCurrency(subtotal)}</span>
        </div>
        <p className="flex gap-2 rounded-lg bg-[#FFF8EE] p-3 leading-6">
          <Truck className="mt-0.5 h-4 w-4 shrink-0 text-[#C9962D]" />
          Estimated delivery and final availability will be confirmed before dispatch.
        </p>
        <p className="flex gap-2 rounded-lg bg-[#FCE7EC]/70 p-3 leading-6">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#C9962D]" />
          Secure order support from Karari Beauty. Share your details at checkout and our team will confirm the order.
        </p>
      </div>

      <div className="grid gap-2">
        {itemCount ? (
          <button
            type="button"
            onClick={() => {
              onCheckout?.();
              goToCheckout();
            }}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#7A183D] px-4 text-sm font-bold text-white transition hover:bg-[#3A2417]"
          >
            Proceed to Checkout
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            disabled
            className="inline-flex h-11 cursor-not-allowed items-center justify-center gap-2 rounded-md bg-[#7A183D]/55 px-4 text-sm font-bold text-white"
          >
            Cart is empty
          </button>
        )}
        {mode === "drawer" ? (
          <Link href="/cart" className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[#7A183D] bg-white px-4 text-sm font-bold text-[#7A183D] transition hover:bg-[#FFF8EE]">
            Review Cart
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : null}
        <Link
          href="/#collections"
          onClick={onContinueShopping}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[rgba(122,24,61,0.14)] bg-[#FFF8EE] px-4 text-sm font-bold text-[#3A2417] transition hover:border-[#C9962D] hover:text-[#7A183D]"
        >
          <PackageCheck className="h-4 w-4" />
          Continue Shopping
        </Link>
      </div>
    </aside>
  );
}
