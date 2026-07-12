"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ChevronRight } from "lucide-react";
import CollectionMarketingPanel from "@/components/CollectionMarketingPanel";
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

export default function CollectionExperience({ category, products, relatedCategories, allProducts = localProducts, allCategories = [] }) {
  const [sortBy, setSortBy] = useState("featured");
  const [wishlistIds, setWishlistIds] = useState([]);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    setWishlistIds(getWishlistItems());
  }, []);

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

  const sortedProducts = useMemo(() => {
    const items = [...products];
    if (sortBy === "price-low") return items.sort((a, b) => a.price - b.price);
    if (sortBy === "price-high") return items.sort((a, b) => b.price - a.price);
    if (sortBy === "newest") {
      return items.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }
    return items;
  }, [products, sortBy]);
  const isLowProductCount = products.length <= 2;

  const notify = (message) => setToast(message);

  const addToCart = (product) => {
    addCartItem(product);
    notify("Added to cart");
  };

  const buyNow = (product) => {
    setBuyNowItem(product, 1);
    goToCheckout({ mode: "buy-now" });
  };

  const toggleWishlist = (product) => {
    const nextWishlist = toggleWishlistItem(product);
    setWishlistIds(nextWishlist.items);
    notify(nextWishlist.isWished ? "Added to wishlist" : "Removed from wishlist");
  };

  const openProduct = (product) => {
    setSelectedProduct(product);
    setRecentlyViewed(addRecentlyViewed(product, allProducts));
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#FFF8EE_0%,#FCE7EC_55%,#FFF8EE_100%)] text-[#3A2417]">
      <Header campaignActive={false} onViewProduct={openProduct} recentlyViewed={recentlyViewed} categories={allCategories} products={allProducts} />
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
          <nav className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[#3A2417]/62">
            <Link href="/" className="transition hover:text-[#7A183D]">Home</Link>
            <ChevronRight className="h-4 w-4 text-[#C9962D]" />
            <Link href="/#collections" className="transition hover:text-[#7A183D]">Collections</Link>
            <ChevronRight className="h-4 w-4 text-[#C9962D]" />
            <span className="text-[#7A183D]">{category.name}</span>
          </nav>

          <div className="mt-5 grid overflow-hidden rounded-xl border border-[rgba(122,24,61,0.14)] bg-white/72 shadow-boutique backdrop-blur lg:mt-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="p-4 sm:p-8 lg:p-10">
              <Link href="/#collections" className="inline-flex items-center gap-2 text-sm font-bold text-[#C9962D] transition hover:text-[#7A183D]">
                <ArrowLeft className="h-4 w-4" />
                Back to Collections
              </Link>
              <p className="mt-5 text-xs font-bold uppercase tracking-[0.22em] text-[#C9962D] sm:mt-8 sm:tracking-[0.28em]">Karari Beauty Collection</p>
              <h1 className="mt-3 font-display text-3xl font-semibold text-[#7A183D] sm:text-5xl">{category.name} Collection</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#3A2417]/70 sm:mt-4 sm:text-base sm:leading-7">{category.description}</p>
              <div className="mt-4 flex flex-wrap gap-2 sm:mt-6">
                <span className="rounded-full border border-[rgba(122,24,61,0.14)] bg-[#FFF8EE] px-3 py-1.5 text-xs font-bold text-[#7A183D] sm:px-4 sm:py-2 sm:text-sm">
                  {products.length} {products.length === 1 ? "Product" : "Products"}
                </span>
                <span className="rounded-full border border-[rgba(201,150,45,0.32)] bg-[#FCE7EC] px-3 py-1.5 text-xs font-bold text-[#C9962D] sm:px-4 sm:py-2 sm:text-sm">
                  {category.productCountLabel}
                </span>
                {(category.heroBadges || ["Gift Ready", "Premium Finds", "Fast Delivery"]).map((badge) => (
                  <span key={badge} className="rounded-full border border-[rgba(122,24,61,0.14)] bg-white/74 px-3 py-1.5 text-xs font-bold text-[#3A2417]/70 sm:px-4 sm:py-2 sm:text-sm">
                    {badge}
                  </span>
                ))}
              </div>
              <p className="mt-4 max-w-xl text-sm font-semibold leading-6 text-[#7A183D]/82 sm:mt-5">
                {category.promotionalNote || "Selected boutique products for gifting, celebrations and everyday style."}
              </p>
            </div>
            <div className="relative min-h-[12rem] overflow-hidden sm:min-h-[18rem]">
              <Image
                src={category.image}
                alt={category.name}
                fill
                priority
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(252,231,236,0.28),rgba(122,24,61,0.18))]" />
            </div>
          </div>
        </div>
      </section>

      <section className="px-3 pb-12 sm:px-6 sm:pb-16 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-3 rounded-lg border border-[rgba(122,24,61,0.14)] bg-white/72 p-3 shadow-soft sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-bold text-[#3A2417]/70">
              Showing {sortedProducts.length} {sortedProducts.length === 1 ? "product" : "products"}
            </p>
            <label className="flex items-center gap-2 text-sm font-bold text-[#7A183D]">
              Sort
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="h-11 min-w-0 flex-1 rounded-md border border-[rgba(122,24,61,0.14)] bg-[#FFF8EE] px-3 text-sm font-bold text-[#3A2417] outline-none transition focus:border-[#C9962D] sm:h-10"
              >
                <option value="featured">Featured</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="newest">Newest</option>
              </select>
            </label>
          </div>

          <div className={`mt-6 grid gap-5 sm:mt-8 sm:gap-6 ${isLowProductCount ? "lg:grid-cols-[minmax(0,1fr)_24rem]" : ""}`}>
            <div>
              {sortedProducts.length ? (
                <motion.div className={`grid grid-cols-2 gap-3 sm:gap-5 ${isLowProductCount ? "md:grid-cols-2" : "md:grid-cols-3 lg:grid-cols-4"}`}>
                  <AnimatePresence mode="popLayout">
                    {sortedProducts.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onView={openProduct}
                        onAddToCart={addToCart}
                        onBuyNow={buyNow}
                        onToggleWishlist={toggleWishlist}
                        wished={wishlistIds.includes(product.id)}
                      />
                    ))}
                  </AnimatePresence>
                </motion.div>
              ) : (
                <div className="rounded-lg border border-[rgba(122,24,61,0.14)] bg-white/82 p-8 text-center shadow-soft">
                  <p className="font-display text-2xl font-semibold text-wine">No products are available in this collection.</p>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#3A2417]/66">We're curating this collection for Karari Beauty.</p>
                  <Link href="/#collections" className="mt-5 inline-flex rounded-md bg-wine px-5 py-3 text-sm font-bold text-white transition hover:bg-charcoal">
                    Back to Collections
                  </Link>
                </div>
              )}
            </div>
            {isLowProductCount ? <CollectionMarketingPanel category={category} categories={allCategories} /> : null}
          </div>

          {!isLowProductCount ? (
            <div className="mt-8">
              <CollectionMarketingPanel category={category} compact categories={allCategories} />
            </div>
          ) : null}

          <div className="mt-10 rounded-xl border border-[rgba(122,24,61,0.14)] bg-white/64 p-4 shadow-soft sm:mt-12 sm:p-5">
            <h2 className="font-display text-2xl font-semibold text-[#7A183D]">Explore more from Karari Beauty</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {relatedCategories.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="min-h-11 rounded-full border border-[rgba(122,24,61,0.14)] bg-[#FFF8EE] px-4 py-2 text-sm font-bold text-[#7A183D] transition hover:border-[#7A183D] hover:bg-[#7A183D] hover:text-[#FFF8EE]"
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <QuickViewModal product={selectedProduct} onClose={() => setSelectedProduct(null)} products={allProducts} />
    </main>
  );
}
