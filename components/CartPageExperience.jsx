"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, ShoppingCart } from "lucide-react";
import CartItemRow from "@/components/CartItemRow";
import CartSummary from "@/components/CartSummary";
import EmptyCartState from "@/components/EmptyCartState";
import { Header } from "@/components/HomeExperience";
import QuickViewModal from "@/components/QuickViewModal";
import { products as localProducts } from "@/data/products";
import {
  addRecentlyViewed,
  getCartCount,
  getCartItems,
  getCartSubtotal,
  getRecentlyViewed,
  removeCartItem,
  updateCartItemQuantity
} from "@/lib/ecommerceStorage";

export default function CartPageExperience({ products = localProducts }) {
  const [items, setItems] = useState([]);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const itemCount = getCartCount();
  const subtotal = getCartSubtotal(items);

  useEffect(() => {
    const syncCart = () => setItems(getCartItems());

    syncCart();
    window.addEventListener("cart:updated", syncCart);
    window.addEventListener("storage", syncCart);

    return () => {
      window.removeEventListener("cart:updated", syncCart);
      window.removeEventListener("storage", syncCart);
    };
  }, [products]);

  useEffect(() => {
    const syncRecentlyViewed = () => setRecentlyViewed(getRecentlyViewed(products));

    syncRecentlyViewed();
    window.addEventListener("recentlyViewed:updated", syncRecentlyViewed);
    window.addEventListener("storage", syncRecentlyViewed);

    return () => {
      window.removeEventListener("recentlyViewed:updated", syncRecentlyViewed);
      window.removeEventListener("storage", syncRecentlyViewed);
    };
  }, []);

  const updateQuantity = (productId, quantity) => {
    setItems(updateCartItemQuantity(productId, quantity));
  };

  const removeItem = (productId) => {
    setItems(removeCartItem(productId));
  };

  const openProduct = (product) => {
    setSelectedProduct(product);
    setRecentlyViewed(addRecentlyViewed(product, products));
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#FFF8EE_0%,#FCE7EC_48%,#FFF8EE_100%)] text-[#3A2417]">
      <Header campaignActive={false} onViewProduct={openProduct} recentlyViewed={recentlyViewed} products={products} />

      <section className="px-3 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <nav className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[#3A2417]/62">
            <Link href="/" className="transition hover:text-[#7A183D]">Home</Link>
            <ChevronRight className="h-4 w-4 text-[#C9962D]" />
            <span className="text-[#7A183D]">Cart</span>
          </nav>

          <div className="mt-5 flex flex-col justify-between gap-4 rounded-xl border border-[rgba(122,24,61,0.14)] bg-white/70 p-4 shadow-soft backdrop-blur sm:mt-6 sm:p-7 lg:flex-row lg:items-end">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-[#C9962D]">
                <ShoppingCart className="h-4 w-4" />
                Cart Review
              </p>
              <h1 className="mt-3 font-display text-3xl font-semibold text-[#7A183D] sm:text-5xl">Your Shopping Cart</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#3A2417]/68">
                Review your boutique picks, adjust quantities, and keep everything ready for the next checkout phase.
              </p>
            </div>
            <span className="w-fit rounded-full border border-[rgba(201,150,45,0.32)] bg-[#FFF8EE] px-4 py-2 text-sm font-bold text-[#7A183D]">
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </span>
          </div>

          {items.length ? (
            <div className="mt-6 grid gap-5 sm:mt-8 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
              <div className="space-y-4">
                {items.map((item) => (
                  <CartItemRow
                    key={item.productId}
                    item={item}
                    onQuantityChange={updateQuantity}
                    onRemove={removeItem}
                  />
                ))}
              </div>

              <CartSummary subtotal={subtotal} itemCount={itemCount} mode="page" />
            </div>
          ) : (
            <div className="mt-8">
              <EmptyCartState />
            </div>
          )}
        </div>
      </section>

      <QuickViewModal product={selectedProduct} onClose={() => setSelectedProduct(null)} products={products} />
    </main>
  );
}
