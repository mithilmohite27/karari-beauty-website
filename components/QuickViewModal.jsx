"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { ArrowRight, Globe2, Heart, Share2, X } from "lucide-react";
import { frequentlyBoughtTogether } from "@/data/frequentlyBoughtTogether";
import { businessSettings } from "@/data/businessSettings";
import { products as localProducts } from "@/data/products";
import { goToCheckout } from "@/lib/customer/session";
import { getWishlistItems, setBuyNowItem, toggleWishlist } from "@/lib/ecommerceStorage";
import { getCanonicalProductUrl } from "@/lib/productLinks";
import { formatCurrency } from "@/lib/whatsapp";

function WhatsAppGlyph({ className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className} fill="currentColor">
      <path d="M16.02 3.2A12.74 12.74 0 0 0 5.3 22.82L3.8 28.4l5.72-1.49A12.73 12.73 0 1 0 16.02 3.2Zm0 23.38a10.6 10.6 0 0 1-5.4-1.48l-.39-.23-3.39.89.9-3.3-.25-.4A10.59 10.59 0 1 1 16.02 26.58Zm5.81-7.93c-.32-.16-1.88-.93-2.17-1.03-.29-.11-.5-.16-.71.16-.21.32-.82 1.03-1 1.24-.18.21-.37.24-.69.08-.32-.16-1.34-.49-2.55-1.57-.94-.84-1.58-1.88-1.76-2.2-.18-.32-.02-.49.14-.65.14-.14.32-.37.48-.56.16-.18.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.71-1.72-.98-2.35-.26-.62-.52-.53-.71-.54h-.61c-.21 0-.56.08-.85.4-.29.32-1.11 1.09-1.11 2.64 0 1.56 1.14 3.07 1.3 3.28.16.21 2.24 3.42 5.43 4.8.76.33 1.35.52 1.81.67.76.24 1.46.21 2 .13.61-.09 1.88-.77 2.15-1.51.26-.74.26-1.37.18-1.51-.08-.13-.29-.21-.61-.37Z" />
    </svg>
  );
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    return document.execCommand("copy");
  } finally {
    document.body.removeChild(textarea);
  }
}

function createProductWhatsAppUrl(product, productUrl) {
  const whatsappNumber = String(businessSettings.whatsappNumber || "917435984499").replace(/[^\d]/g, "") || "917435984499";
  const message = [
    "Hello Karari Beauty,",
    `I'm interested in the "${product.name}".`,
    `Price: ${formatCurrency(product.price)}`,
    `Product link: ${productUrl}`,
    "Please share availability and more details."
  ].join("\n");

  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}

export default function QuickViewModal({ product, onClose, products = localProducts }) {
  const [wishlistIds, setWishlistIds] = useState([]);
  const [shareNotice, setShareNotice] = useState("");
  const [shareProcessing, setShareProcessing] = useState(false);

  useEffect(() => {
    if (!product) return;
    setWishlistIds(getWishlistItems());
  }, [product]);

  useEffect(() => {
    if (!product) return undefined;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const closeOnEscape = (event) => {
      if (event.key === "Escape") onClose?.();
    };

    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose, product]);

  useEffect(() => {
    if (!shareNotice) return undefined;
    const timer = window.setTimeout(() => setShareNotice(""), 1800);
    return () => window.clearTimeout(timer);
  }, [shareNotice]);

  const relatedGroup = useMemo(
    () => frequentlyBoughtTogether.find((group) => group.productIds.includes(product?.id)) || frequentlyBoughtTogether[0],
    [product?.id]
  );
  const relatedProducts = useMemo(
    () =>
      relatedGroup.productIds
        .map((id) => products.find((item) => item.id === id))
        .filter(Boolean),
    [products, relatedGroup]
  );

  if (!product) return null;

  const isWished = wishlistIds.includes(product.id);
  const productUrl = getCanonicalProductUrl(product, typeof window !== "undefined" ? window.location.pathname : "");
  const whatsappUrl = createProductWhatsAppUrl(product, productUrl);

  const buyNow = () => {
    setBuyNowItem(product, 1);
    goToCheckout({ mode: "buy-now" });
  };

  const handleWishlist = () => {
    const nextWishlist = toggleWishlist(product);
    setWishlistIds(nextWishlist.items);
  };

  const handleShare = async () => {
    if (shareProcessing) return;

    const shareData = {
      title: product.name,
      text: product.shortDescription || product.description || `Explore ${product.name} at Karari Beauty.`,
      url: productUrl
    };

    setShareProcessing(true);

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setShareProcessing(false);
        return;
      }

      await copyTextToClipboard(productUrl);
      setShareNotice("Product link copied");
    } catch (error) {
      if (error?.name === "AbortError") {
        try {
          await copyTextToClipboard(productUrl);
          setShareNotice("Product link copied");
        } catch {
          setShareNotice("");
        }
      } else {
        try {
          await copyTextToClipboard(productUrl);
          setShareNotice("Product link copied");
        } catch {
          setShareNotice("Unable to copy link");
        }
      }
    } finally {
      setShareProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-charcoal/55 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}>
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex max-h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-t-xl bg-silk shadow-boutique sm:max-h-[calc(100dvh-3rem)] sm:rounded-xl"
        onMouseDown={(event) => event.stopPropagation()}
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
        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 overscroll-contain sm:p-5 lg:grid-cols-[0.92fr_1fr] lg:overflow-hidden">
          <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-cream">
            <Image src={product.image} alt={product.name} fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
          </div>
          <div className="min-h-0 lg:flex lg:flex-col">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-karariGold">{product.category}</p>
            <h4 className="mt-2 font-display text-2xl font-semibold text-charcoal sm:text-3xl">{product.name}</h4>
            <p className="mt-3 text-2xl font-bold text-rose">{formatCurrency(product.price)}</p>
            <p className="mt-2 text-sm text-ink/58">SKU: {product.sku}</p>
            <p className="mt-3 line-clamp-4 leading-7 text-ink/70">{product.description}</p>

            <div className="mt-4 rounded-lg border border-antiqueGold/25 bg-white p-3">
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-ink/55">
                <Globe2 className="h-4 w-4" />
                Shipping
              </span>
              <p className="mt-2 text-sm font-medium leading-6 text-charcoal">Ships to India. International inquiry available.</p>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] lg:mt-auto lg:pt-5">
              <button
                type="button"
                onClick={buyNow}
                className="col-span-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-wine px-5 py-3 text-sm font-bold text-white shadow-soft transition duration-200 hover:-translate-y-0.5 hover:bg-charcoal focus:outline-none focus:ring-2 focus:ring-wine/30 sm:col-span-1"
              >
                <ArrowRight className="h-4 w-4" />
                Buy Now
              </button>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group col-span-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[#0cc96b]/25 bg-white px-5 py-3 text-sm font-bold text-wine shadow-soft transition duration-200 hover:-translate-y-0.5 hover:border-[#0cc96b] hover:bg-[#0cc96b] hover:text-white hover:shadow-[0_12px_26px_rgba(12,201,107,0.2)] focus:outline-none focus:ring-2 focus:ring-[#0cc96b]/30 sm:col-span-1"
                aria-label={`Ask about ${product.name} on WhatsApp`}
                title="WhatsApp Inquiry"
              >
                <WhatsAppGlyph className="h-4 w-4" />
                WhatsApp Inquiry
                <ArrowRight className="h-4 w-4 transition duration-200 group-hover:translate-x-0.5" />
              </a>
              <button
                type="button"
                onClick={handleWishlist}
                className={`inline-flex min-h-11 items-center justify-center rounded-md border px-4 py-3 transition duration-200 focus:outline-none focus:ring-2 focus:ring-wine/25 ${
                  isWished ? "border-wine bg-cream text-wine" : "border-black/12 text-ink hover:-translate-y-0.5 hover:border-karariGold hover:text-karariGold"
                }`}
                aria-label={isWished ? "Remove from wishlist" : "Add to wishlist"}
                aria-pressed={isWished}
                title={isWished ? "Remove from wishlist" : "Add to wishlist"}
              >
                <Heart className={`h-4 w-4 ${isWished ? "fill-current" : ""}`} />
              </button>
              <button
                type="button"
                onClick={handleShare}
                disabled={shareProcessing}
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-black/12 px-4 py-3 text-ink transition duration-200 hover:-translate-y-0.5 hover:border-karariGold hover:text-karariGold focus:outline-none focus:ring-2 focus:ring-karariGold/25 disabled:cursor-wait disabled:opacity-60 disabled:hover:translate-y-0"
                aria-label={`Share ${product.name}`}
                title="Share product"
              >
                <Share2 className="h-4 w-4" />
              </button>
            </div>
            {shareNotice ? <p className="mt-3 rounded-md bg-white px-3 py-2 text-center text-sm font-bold text-wine shadow-soft sm:text-left">{shareNotice}</p> : null}
          </div>
        </div>
        <div className="hidden border-t border-black/8 p-4 sm:block sm:p-5">
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
