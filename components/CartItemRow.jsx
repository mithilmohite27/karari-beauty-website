"use client";

import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import ProductImage from "@/components/ProductImage";
import { formatCurrency } from "@/lib/whatsapp";

export default function CartItemRow({ item, compact = false, onQuantityChange, onRemove }) {
  const quantity = Number(item.quantity) || 0;
  const subtotal = (Number(item.price) || 0) * quantity;
  const productHref = item.slug ? `/products/${item.slug}` : null;
  const title = (
    <span className="line-clamp-2 text-sm font-bold leading-5 text-[#3A2417] transition group-hover:text-[#7A183D]">
      {item.name}
    </span>
  );

  return (
    <article className="rounded-xl border border-[rgba(122,24,61,0.14)] bg-white/82 p-3 shadow-soft">
      <div className="flex gap-3">
        <div className={`${compact ? "h-[4.5rem] w-[4.5rem] min-[390px]:h-20 min-[390px]:w-20" : "h-20 w-20 sm:h-24 sm:w-24"} relative shrink-0 overflow-hidden rounded-lg border border-[rgba(122,24,61,0.12)] bg-[#FFF8EE]`}>
          <ProductImage src={item.image} alt={item.name} fill sizes={compact ? "5rem" : "6rem"} className="object-cover" />
        </div>

        <div className="min-w-0 flex-1">
          {productHref ? (
            <Link href={productHref} className="group block">
              {title}
            </Link>
          ) : (
            title
          )}
          <p className="mt-1 truncate text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[#C9962D] sm:text-xs sm:tracking-[0.16em]">{item.category}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="font-bold text-[#7A183D]">{formatCurrency(item.price)}</span>
            <span className="text-[#3A2417]/45">Subtotal {formatCurrency(subtotal)}</span>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex h-11 items-center overflow-hidden rounded-md border border-[rgba(122,24,61,0.14)] bg-[#FFF8EE] sm:h-9">
              <button
                type="button"
                onClick={() => onQuantityChange(item.productId, quantity - 1)}
                className="flex h-11 w-11 items-center justify-center text-[#7A183D] transition hover:bg-[#FCE7EC] sm:h-9 sm:w-9"
                aria-label={`Decrease quantity for ${item.name}`}
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="min-w-9 text-center text-sm font-bold text-[#3A2417]">{quantity}</span>
              <button
                type="button"
                onClick={() => onQuantityChange(item.productId, quantity + 1)}
                className="flex h-11 w-11 items-center justify-center text-[#7A183D] transition hover:bg-[#FCE7EC] sm:h-9 sm:w-9"
                aria-label={`Increase quantity for ${item.name}`}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => onRemove(item.productId)}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-bold text-[#7A183D] transition hover:bg-[#FCE7EC] sm:min-h-0"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
