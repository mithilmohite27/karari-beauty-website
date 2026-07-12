"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, BadgeCheck, ChevronRight, Heart, Minus, PackageCheck, Plus, ShieldCheck, ShoppingCart, Star, Truck } from "lucide-react";
import { Header } from "@/components/HomeExperience";
import ProductCard from "@/components/ProductCard";
import QuickViewModal from "@/components/QuickViewModal";
import { products as localProducts } from "@/data/products";
import { goToCheckout } from "@/lib/customer/session";
import {
  addRecentlyViewed,
  addToCart as addCartItem,
  getRecentlyViewed,
  getWishlistItems,
  setBuyNowItem,
  toggleWishlist as toggleWishlistItem
} from "@/lib/ecommerceStorage";
import { formatCurrency } from "@/lib/whatsapp";

const trustBadges = [
  { label: "Secure Order Support", icon: ShieldCheck },
  { label: "Gift Ready Packaging", icon: PackageCheck },
  { label: "Fast Delivery", icon: Truck },
  { label: "Boutique Quality", icon: BadgeCheck }
];

export default function ProductDetailExperience({ product, category, relatedProducts, allProducts = localProducts, allCategories }) {
  const [quantity, setQuantity] = useState(1);
  const [wishlistIds, setWishlistIds] = useState([]);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [toast, setToast] = useState("");
  const galleryImages = useMemo(() => {
    if (Array.isArray(product.galleryImages) && product.galleryImages.length) return product.galleryImages;
    return product.image
      ? [{ id: `${product.id || product.slug}-main`, imageUrl: product.image, altText: product.name, isMain: true }]
      : [];
  }, [product]);
  const [selectedImage, setSelectedImage] = useState(galleryImages[0]?.imageUrl || product.image);
  const isWished = wishlistIds.includes(product.id);

  useEffect(() => {
    setSelectedImage(galleryImages[0]?.imageUrl || product.image);
  }, [galleryImages, product.image]);

  useEffect(() => {
    setWishlistIds(getWishlistItems());
    setRecentlyViewed(addRecentlyViewed(product, allProducts));
  }, [product]);

  useEffect(() => {
    const syncRecentlyViewed = () => setRecentlyViewed(getRecentlyViewed(allProducts));

    syncRecentlyViewed();
    window.addEventListener("recentlyViewed:updated", syncRecentlyViewed);
    window.addEventListener("storage", syncRecentlyViewed);

    return () => {
      window.removeEventListener("recentlyViewed:updated", syncRecentlyViewed);
      window.removeEventListener("storage", syncRecentlyViewed);
    };
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(""), 1800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const productTags = useMemo(() => product.tags || [product.categorySlug], [product]);

  const notify = (message) => setToast(message);

  const addToCart = (item, itemQuantity = 1) => {
    addCartItem(item, itemQuantity);
    notify("Added to cart");
  };

  const buyNow = (item, itemQuantity = 1) => {
    setBuyNowItem(item, itemQuantity);
    goToCheckout({ mode: "buy-now" });
  };

  const toggleWishlist = (item) => {
    const nextWishlist = toggleWishlistItem(item);
    setWishlistIds(nextWishlist.items);
    notify(nextWishlist.isWished ? "Added to wishlist" : "Removed from wishlist");
  };

  const openProduct = (item) => {
    setSelectedProduct(item);
    setRecentlyViewed(addRecentlyViewed(item, allProducts));
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#FFF8EE_0%,#FCE7EC_55%,#FFF8EE_100%)] text-[#3A2417]">
      <Header campaignActive={false} onViewProduct={openProduct} recentlyViewed={recentlyViewed} products={allProducts} categories={allCategories} />
      <AnimatePresence>
        {toast ? (
          <motion.div
            key={toast}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 rounded-full border border-[rgba(122,24,61,0.16)] bg-white px-5 py-3 text-sm font-bold text-[#7A183D] shadow-boutique"
          >
            {toast}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <section className="px-3 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <nav className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-[#3A2417]/62 sm:gap-2 sm:text-sm">
            <Link href="/" className="transition hover:text-[#7A183D]">Home</Link>
            <ChevronRight className="h-4 w-4 text-[#C9962D]" />
            <Link href={category?.href || `/collections/${product.categorySlug}`} className="transition hover:text-[#7A183D]">{product.category}</Link>
            <ChevronRight className="h-4 w-4 text-[#C9962D]" />
            <span className="text-[#7A183D]">{product.name}</span>
          </nav>

          <div className="mt-5 grid gap-5 sm:mt-6 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_0.9fr]">
            <div className="rounded-xl border border-[rgba(122,24,61,0.14)] bg-white/72 p-2.5 shadow-boutique sm:p-3">
              <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-[#FFF8EE]">
                <Image
                  src={selectedImage || product.image}
                  alt={product.name}
                  fill
                  priority
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="object-cover"
                  onError={() => setSelectedImage(product.image)}
                />
              </div>
              <div className="mt-2 flex gap-2 overflow-x-auto pb-1 overscroll-contain sm:mt-3">
                {galleryImages.map((image) => {
                  const isSelected = image.imageUrl === selectedImage;
                  return (
                    <button
                      key={image.id || image.imageUrl}
                      type="button"
                      onClick={() => setSelectedImage(image.imageUrl)}
                      aria-label={`View ${image.altText || product.name}`}
                      aria-pressed={isSelected}
                      className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 bg-[#FFF8EE] transition ${isSelected ? "border-[#7A183D] shadow-sm" : "border-transparent hover:border-[#C9962D]"}`}
                    >
                      <Image src={image.imageUrl} alt={image.altText || `${product.name} thumbnail`} fill sizes="4rem" className="object-cover" />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-[rgba(122,24,61,0.14)] bg-white/74 p-4 shadow-boutique backdrop-blur sm:p-7">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[rgba(122,24,61,0.14)] bg-[#FFF8EE] px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[#7A183D]">
                  {product.category}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF8EE] px-3 py-1 text-xs font-bold text-[#7A183D]">
                  <Star className="h-3.5 w-3.5 fill-[#C9962D] text-[#C9962D]" />
                  {product.rating || "4.8"}
                </span>
              </div>

              <h1 className="mt-3 font-display text-3xl font-semibold leading-tight text-[#7A183D] sm:mt-4 sm:text-5xl">{product.name}</h1>
              <p className="mt-3 text-sm leading-6 text-[#3A2417]/70 sm:mt-4 sm:text-base sm:leading-7">{product.shortDescription || product.description}</p>

              <div className="mt-5 flex flex-wrap items-baseline gap-3">
                <p className="text-2xl font-bold text-rose sm:text-3xl">{formatCurrency(product.price)}</p>
                {product.originalPrice ? <p className="text-lg font-semibold text-[#3A2417]/38 line-through">{formatCurrency(product.originalPrice)}</p> : null}
                {product.discountLabel ? <span className="rounded-full bg-[#7A183D] px-3 py-1 text-xs font-bold text-white">{product.discountLabel}</span> : null}
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-sm font-semibold text-[#3A2417]/62">
                {product.sku ? <span>SKU: {product.sku}</span> : null}
                {productTags.slice(0, 3).map((tag) => (
                  <span key={tag} className="rounded-full bg-[#FFF8EE] px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[#C9962D]">{tag}</span>
                ))}
              </div>

              <div className="mt-5 grid gap-3 sm:mt-6 sm:grid-cols-[auto_1fr_auto]">
                <div className="inline-flex h-12 w-full items-center justify-center rounded-md border border-[rgba(122,24,61,0.14)] bg-[#FFF8EE] sm:w-auto">
                  <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="h-12 min-w-12 px-3 text-[#7A183D]" aria-label="Decrease quantity">
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="min-w-10 text-center text-sm font-bold text-[#3A2417]">{quantity}</span>
                  <button type="button" onClick={() => setQuantity((value) => Math.min(10, value + 1))} className="h-12 min-w-12 px-3 text-[#7A183D]" aria-label="Increase quantity">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => buyNow(product, quantity)}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#7A183D] px-5 text-sm font-bold text-white transition hover:bg-[#3A2417]"
                >
                  <ArrowRight className="h-4 w-4" />
                  Buy Now
                </button>

                <button
                  type="button"
                  onClick={() => addToCart(product, quantity)}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-[#7A183D] bg-white/78 px-5 text-sm font-bold text-[#7A183D] transition hover:border-[#C9962D] hover:text-[#C9962D]"
                >
                  <ShoppingCart className="h-4 w-4" />
                  Add to Cart
                </button>

                <button
                  type="button"
                  onClick={() => toggleWishlist(product)}
                  className={`inline-flex h-12 items-center justify-center gap-2 rounded-md border px-4 text-sm font-bold transition ${
                    isWished ? "border-[#7A183D] bg-[#FFF8EE] text-[#7A183D]" : "border-[rgba(122,24,61,0.14)] bg-white/70 text-[#3A2417] hover:border-[#C9962D] hover:text-[#7A183D]"
                  }`}
                >
                  <Heart className={`h-4 w-4 ${isWished ? "fill-current" : ""}`} />
                  Wishlist
                </button>
              </div>

              <div className="mt-5 grid gap-2 sm:mt-6 sm:grid-cols-2">
                {trustBadges.map(({ label, icon: Icon }) => (
                  <div key={label} className="flex items-center gap-2 rounded-md border border-[rgba(122,24,61,0.12)] bg-[#FFF8EE]/80 px-3 py-2 text-xs font-bold text-[#3A2417]/72">
                    <Icon className="h-4 w-4 text-[#C9962D]" />
                    {label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:mt-8 sm:gap-6 lg:grid-cols-[1fr_0.85fr]">
            <section className="rounded-xl border border-[rgba(122,24,61,0.14)] bg-white/72 p-4 shadow-soft sm:p-6">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#C9962D]">Product Details</p>
              <h2 className="mt-3 font-display text-2xl font-semibold text-[#7A183D]">Description</h2>
              <p className="mt-3 text-sm leading-7 text-[#3A2417]/70">{product.description}</p>
            </section>

            <section className="rounded-xl border border-[rgba(122,24,61,0.14)] bg-white/72 p-4 shadow-soft sm:p-6">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#C9962D]">Why Choose This Product</p>
              <ul className="mt-4 space-y-3 text-sm font-medium leading-6 text-[#3A2417]/70">
                <li>Curated by Karari Beauty for gifting, styling and celebration moments.</li>
                <li>Premium boutique presentation with order support before dispatch.</li>
                <li>Suitable for thoughtful gifts, festive purchases and personal styling.</li>
              </ul>
            </section>
          </div>

          <section className="mt-10">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#C9962D]">Related Products</p>
                <h2 className="mt-2 font-display text-3xl font-semibold text-[#7A183D]">More from {product.category}</h2>
              </div>
              <Link href={category?.href || `/collections/${product.categorySlug}`} className="inline-flex items-center gap-2 text-sm font-bold text-[#7A183D] transition hover:text-[#C9962D]">
                View Collection
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:mt-6 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
              {relatedProducts.map((item) => (
                <ProductCard
                  key={item.id}
                  product={item}
                  onView={openProduct}
                  onAddToCart={(target) => addToCart(target, 1)}
                  onBuyNow={(target) => buyNow(target, 1)}
                  onToggleWishlist={toggleWishlist}
                  wished={wishlistIds.includes(item.id)}
                />
              ))}
            </div>
          </section>
        </div>
      </section>

      <QuickViewModal product={selectedProduct} onClose={() => setSelectedProduct(null)} products={allProducts} />
    </main>
  );
}
