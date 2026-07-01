"use client";

import { motion } from "framer-motion";
import { Heart, Search, ShoppingCart, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { formatCurrency } from "@/lib/whatsapp";

export default function ProductCard({ product, onView, onAddToCart, onToggleWishlist, wished }) {
  const rating = product.rating || "4.8";
  const shortDescription = product.shortDescription || product.description;
  const originalPrice = product.originalPrice;
  const discountLabel = product.discountLabel || product.offer;
  const productHref = `/products/${product.slug}`;

  return (
    <motion.article
      whileHover={{ y: -5 }}
      className="group overflow-hidden rounded-lg border border-[rgba(122,24,61,0.14)] bg-white/82 shadow-soft transition hover:border-[#C9962D] hover:shadow-boutique"
    >
      <div className="image-sheen relative aspect-[1.05/1] overflow-hidden bg-cream sm:aspect-[4/3]">
        <Link href={productHref} className="block h-full w-full text-left" aria-label={`View ${product.name}`}>
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, (min-width: 420px) 50vw, 100vw"
            className="object-cover transition duration-700 group-hover:scale-105"
          />
        </Link>
        <div className="absolute left-2 top-2 max-w-[calc(100%-3.25rem)] rounded-md bg-white/90 px-2 py-1 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-wine shadow-soft sm:left-3 sm:top-3 sm:px-3 sm:text-xs sm:tracking-[0.14em]">
          {product.category}
        </div>
        <button
          type="button"
          onClick={() => onToggleWishlist(product)}
          className={`absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-full border bg-white/92 shadow-soft transition sm:right-3 sm:top-3 ${
            wished ? "border-[#7A183D] text-[#7A183D]" : "border-white/60 text-[#3A2417] hover:border-[#C9962D] hover:text-[#7A183D]"
          }`}
          aria-label={wished ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
        >
          <Heart className={`h-4 w-4 ${wished ? "fill-current" : ""}`} />
        </button>
        {discountLabel ? (
          <div className="absolute bottom-2 left-2 rounded-full bg-[#7A183D] px-2.5 py-1 text-[0.64rem] font-bold text-white shadow-soft sm:bottom-3 sm:left-3 sm:px-3 sm:text-xs">
            {discountLabel}
          </div>
        ) : null}
      </div>
      <div className="p-3 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-[0.64rem] font-bold uppercase tracking-[0.12em] text-karariGold sm:text-xs sm:tracking-[0.18em]">{product.badge || "Karari Edit"}</p>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF8EE] px-2.5 py-1 text-xs font-bold text-[#7A183D]">
            <Star className="h-3.5 w-3.5 fill-[#C9962D] text-[#C9962D]" />
            {rating}
          </span>
        </div>
        <Link href={productHref} className="mt-2 block min-h-[2.6rem] text-sm font-semibold leading-5 text-charcoal transition hover:text-wine sm:min-h-12 sm:text-base sm:leading-6">
          {product.name}
        </Link>
        <p className="mt-1.5 line-clamp-2 min-h-10 text-xs leading-5 text-ink/62 sm:mt-2 sm:min-h-12 sm:text-sm sm:leading-6">{shortDescription}</p>
        <div className="mt-2.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 sm:mt-3">
          <p className="text-base font-bold text-rose sm:text-lg">{formatCurrency(product.price)}</p>
          {originalPrice ? <p className="text-xs font-semibold text-ink/38 line-through sm:text-sm">{formatCurrency(originalPrice)}</p> : null}
        </div>
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-2 border-t border-[rgba(122,24,61,0.1)] p-3 sm:p-5">
        <button
          type="button"
          onClick={() => onAddToCart(product)}
          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md bg-[#7A183D] px-2.5 py-2 text-xs font-bold text-white transition hover:bg-[#3A2417] sm:gap-2 sm:px-3 sm:py-2.5 sm:text-sm"
        >
          <ShoppingCart className="h-4 w-4" />
          <span className="hidden min-[370px]:inline">Add to Cart</span>
          <span className="min-[370px]:hidden">Add</span>
        </button>
        <button type="button" onClick={() => onView?.(product)} className="flex min-h-11 min-w-11 items-center justify-center rounded-md border border-[rgba(122,24,61,0.14)] bg-[#FFF8EE] p-2.5 text-[#7A183D] transition hover:border-[#C9962D] hover:text-[#C9962D]" aria-label={`Quick view ${product.name}`}>
          <Search className="h-4 w-4" />
        </button>
      </div>
    </motion.article>
  );
}
