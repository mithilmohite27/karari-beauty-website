"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { ArrowRight, CalendarDays, Globe2, Heart, MessageCircle, Share2, X } from "lucide-react";
import { frequentlyBoughtTogether } from "@/data/frequentlyBoughtTogether";
import { products as localProducts } from "@/data/products";
import { setBuyNowItem } from "@/lib/ecommerceStorage";
import { createWhatsAppUrl, formatCurrency } from "@/lib/whatsapp";

export default function QuickViewModal({ product, onClose, products = localProducts }) {
  if (!product) return null;

  const relatedGroup = frequentlyBoughtTogether.find((group) => group.productIds.includes(product.id)) || frequentlyBoughtTogether[0];
  const relatedProducts = relatedGroup.productIds
    .map((id) => products.find((item) => item.id === id))
    .filter(Boolean);
  const buyNow = () => {
    setBuyNowItem(product, 1);
    window.location.assign("/checkout?mode=buy-now");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-charcoal/55 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true">
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-h-[92dvh] w-full max-w-5xl overflow-y-auto rounded-t-xl bg-silk shadow-boutique sm:rounded-xl"
      >
        <div className="flex items-center justify-between border-b border-black/8 px-4 py-3 sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-karariGold">Quick View</p>
            <h3 className="line-clamp-1 font-display text-xl font-semibold text-charcoal sm:text-2xl">{product.name}</h3>
          </div>
          <button type="button" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-md border border-black/12 text-ink hover:border-wine hover:text-wine" aria-label="Close quick view">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[1fr_0.9fr]">
          <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-cream">
            <Image src={product.image} alt={product.name} fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-karariGold">{product.category}</p>
            <h4 className="mt-2 font-display text-2xl font-semibold text-charcoal sm:text-3xl">{product.name}</h4>
            <p className="mt-3 text-2xl font-bold text-rose">{formatCurrency(product.price)}</p>
            <p className="mt-2 text-sm text-ink/58">SKU: {product.sku}</p>
            <p className="mt-4 leading-7 text-ink/70">{product.description}</p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className="rounded-lg border border-black/10 bg-white p-3">
                <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-ink/55">
                  <CalendarDays className="h-4 w-4" />
                  Delivery Date
                </span>
                <input type="date" className="mt-2 w-full rounded-md border border-black/10 px-3 py-2 text-sm outline-none focus:border-karariGold" />
              </label>
              <div className="rounded-lg border border-antiqueGold/25 bg-white p-3">
                <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-ink/55">
                  <Globe2 className="h-4 w-4" />
                  Shipping
                </span>
                <p className="mt-2 text-sm font-medium leading-6 text-charcoal">Ships to India. International inquiry available.</p>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={buyNow}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md bg-wine px-5 py-3 text-sm font-bold text-white shadow-soft transition hover:bg-charcoal"
              >
                <ArrowRight className="h-4 w-4" />
                Buy Now
              </button>
              <a
                href={createWhatsAppUrl({ product })}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md border border-wine/20 bg-white px-5 py-3 text-sm font-bold text-wine shadow-soft transition hover:border-karariGold hover:text-karariGold"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp Inquiry
              </a>
              <button type="button" className="inline-flex min-h-11 items-center justify-center rounded-md border border-black/12 px-4 py-3 text-ink hover:border-karariGold hover:text-karariGold" aria-label="Wishlist">
                <Heart className="h-4 w-4" />
              </button>
              <button type="button" className="inline-flex min-h-11 items-center justify-center rounded-md border border-black/12 px-4 py-3 text-ink hover:border-karariGold hover:text-karariGold" aria-label="Share">
                <Share2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
        <div className="border-t border-black/8 p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-karariGold">Frequently Bought Together</p>
              <h4 className="mt-1 text-lg font-semibold text-charcoal">{relatedGroup.title}</h4>
            </div>
            <p className="hidden text-sm font-semibold text-rose sm:block">
              Total {formatCurrency(relatedProducts.reduce((sum, item) => sum + item.price, 0))}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {relatedProducts.map((item) => (
              <div key={item.id} className="flex gap-3 rounded-lg border border-black/8 bg-white p-3">
                <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-cream">
                  <Image src={item.image} alt={item.name} fill sizes="4rem" className="object-cover" />
                </span>
                <div>
                  <p className="line-clamp-2 text-sm font-semibold text-charcoal">{item.name}</p>
                  <p className="mt-1 text-sm font-bold text-rose">{formatCurrency(item.price)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
