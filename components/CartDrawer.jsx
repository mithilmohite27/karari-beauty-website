"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import CartItemRow from "@/components/CartItemRow";
import CartSummary from "@/components/CartSummary";
import EmptyCartState from "@/components/EmptyCartState";
import {
  getCartCount,
  getCartSubtotal,
  removeCartItem,
  syncCartItemsWithCatalog,
  updateCartItemQuantity
} from "@/lib/ecommerceStorage";

export default function CartDrawer({ open, onClose, products = [] }) {
  const [items, setItems] = useState([]);
  const itemCount = getCartCount();
  const subtotal = getCartSubtotal(items);

  useEffect(() => {
    const syncCart = () => setItems(syncCartItemsWithCatalog(products));

    syncCart();
    window.addEventListener("cart:updated", syncCart);
    window.addEventListener("storage", syncCart);

    return () => {
      window.removeEventListener("cart:updated", syncCart);
      window.removeEventListener("storage", syncCart);
    };
  }, [products]);

  useEffect(() => {
    if (!open) return undefined;

    const closeOnEscape = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", closeOnEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const updateQuantity = (productId, quantity) => {
    setItems(updateCartItemQuantity(productId, quantity));
  };

  const removeItem = (productId) => {
    setItems(removeCartItem(productId));
  };

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[80]" aria-modal="true" role="dialog">
          <motion.button
            type="button"
            aria-label="Close cart drawer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#3A2417]/38 backdrop-blur-[2px]"
          />

          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            className="absolute right-0 top-0 flex h-full w-full max-w-[480px] flex-col bg-[linear-gradient(180deg,#FFF8EE_0%,#FCE7EC_100%)] shadow-boutique sm:w-[88vw]"
          >
            <div className="flex items-center justify-between gap-4 border-b border-[rgba(122,24,61,0.14)] bg-white/62 px-4 py-3 backdrop-blur sm:px-5 sm:py-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#C9962D]">Karari Beauty</p>
                <h2 className="font-display text-2xl font-semibold text-[#7A183D] sm:text-3xl">Your Cart</h2>
                <p className="mt-1 text-sm font-semibold text-[#3A2417]/62">
                  {itemCount} {itemCount === 1 ? "item" : "items"} selected
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-[rgba(122,24,61,0.14)] bg-white text-[#7A183D] transition hover:border-[#C9962D]"
                aria-label="Close cart"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-5 sm:py-4">
              {items.length ? (
                <div className="space-y-3">
                  {items.map((item) => (
                    <CartItemRow
                      key={item.productId}
                      item={item}
                      compact
                      onQuantityChange={updateQuantity}
                      onRemove={removeItem}
                    />
                  ))}
                </div>
              ) : (
                <EmptyCartState compact onAction={onClose} />
              )}
            </div>

            {items.length ? (
              <div className="border-t border-[rgba(122,24,61,0.14)] bg-[#FFF8EE]/88 p-3 sm:p-5">
                <CartSummary subtotal={subtotal} itemCount={itemCount} mode="drawer" onContinueShopping={onClose} onCheckout={onClose} />
              </div>
            ) : null}
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
