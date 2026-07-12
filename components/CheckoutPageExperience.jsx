"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BadgeCheck, ChevronRight, Globe2, MessageCircle, PackageCheck, ShieldCheck, Truck } from "lucide-react";
import EmptyCartState from "@/components/EmptyCartState";
import { Header } from "@/components/HomeExperience";
import QuickViewModal from "@/components/QuickViewModal";
import { products as localProducts } from "@/data/products";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import {
  addRecentlyViewed,
  clearBuyNowItem,
  clearCart,
  getCartSubtotal,
  getRecentlyViewed,
  saveOrderRequest,
  syncBuyNowItemWithCatalog,
  syncCartItemsWithCatalog
} from "@/lib/ecommerceStorage";
import { formatCurrency } from "@/lib/whatsapp";

const countries = ["India", "USA", "Canada", "Australia", "UAE", "UK"];
const paymentOptions = [
  {
    value: "online",
    label: "Pay securely online",
    description: "Use UPI, Google Pay, PhonePe, BHIM or other payment options supported by Razorpay."
  },
  {
    value: "pending_confirmation",
    label: "Pay after confirmation",
    description: "Karari Beauty will confirm availability, delivery charges and payment details before payment."
  },
  {
    value: "cod",
    label: "Cash on Delivery",
    description: "Available only for eligible products and orders with 10 or more items."
  }
];
const orderTypes = ["Domestic Order", "International Inquiry"];
const trustBadges = [
  { label: "Secure Order Support", icon: ShieldCheck },
  { label: "Delivery Confirmation", icon: Truck },
  { label: "International Inquiry", icon: Globe2 },
  { label: "Gift Ready Picks", icon: PackageCheck }
];

const initialForm = {
  fullName: "",
  mobile: "",
  email: "",
  country: "India",
  address: "",
  city: "",
  state: "",
  pincode: "",
  deliveryNote: "",
  paymentMethod: "online",
  paymentPreference: "Pay securely online",
  orderType: "Domestic Order"
};

function buildWhatsAppOrderUrl(order) {
  const message = [
    "Hi Karari Beauty,",
    "I have submitted an order request.",
    "",
    `Order ID: ${order.orderId}`,
    `Customer: ${order.customer.fullName}`,
    `Subtotal: ${formatCurrency(order.subtotal)}`,
    `Payment Preference: ${order.paymentPreference}`,
    "",
    "Items:",
    ...order.items.map((item) => `- ${item.name} x ${item.quantity}`),
    "",
    "Please confirm availability, delivery charges and payment details."
  ].filter(Boolean).join("\n");

  return `https://wa.me/917435984499?text=${encodeURIComponent(message)}`;
}

function Field({ label, name, value, error, required, as = "input", children, ...props }) {
  const inputClass = `mt-2 w-full rounded-md border bg-white/82 px-3 py-3 text-base font-semibold text-[#3A2417] outline-none transition placeholder:text-[#3A2417]/38 sm:text-sm ${
    error ? "border-[#7A183D] shadow-[0_0_0_3px_rgba(122,24,61,0.08)]" : "border-[rgba(122,24,61,0.14)] focus:border-[#C9962D]"
  }`;
  const Input = as;

  return (
    <label className="block text-sm font-bold text-[#3A2417]">
      {label} {required ? <span className="text-[#7A183D]">*</span> : null}
      <Input name={name} value={value} className={inputClass} {...props}>
        {children}
      </Input>
      {error ? <span className="mt-1 block text-xs font-semibold text-[#7A183D]">{error}</span> : null}
    </label>
  );
}

function getPaymentStartupMessage(errorCode, fallbackMessage) {
  const messages = {
    RAZORPAY_NOT_CONFIGURED: "Payment keys are not configured.",
    AUTH_REQUIRED: "Please sign in before payment.",
    CART_EMPTY: "Cart is empty.",
    INVALID_AMOUNT: "Final amount is required before payment.",
    FINAL_AMOUNT_REQUIRED: "Final amount is required before payment.",
    CUSTOMER_DETAILS_REQUIRED: "Customer details are required.",
    SUPABASE_ORDER_CREATE_FAILED: "Payment setup issue. Please try again or choose Pay after confirmation.",
    SUPABASE_PAYMENT_LINK_FAILED: "Payment setup issue. Please try again or choose Pay after confirmation.",
    RAZORPAY_ORDER_CREATE_FAILED: "Unable to create Razorpay order. Please try again."
  };

  return messages[errorCode] || fallbackMessage || "Unable to create Razorpay order. Please try again.";
}

function loadRazorpayCheckout() {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }

    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function CheckoutPageExperience({ products = localProducts, siteSettings }) {
  const [items, setItems] = useState([]);
  const [isBuyNowMode, setIsBuyNowMode] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState(null);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [customerSession, setCustomerSession] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const subtotal = useMemo(() => getCartSubtotal(items), [items]);
  const deliveryCharge = 0;
  const discount = 0;
  const finalAmount = Math.max(subtotal + deliveryCharge - discount, 0);
  const hasFinalAmount = Number.isFinite(finalAmount) && finalAmount > 0;
  const isInternational = form.country !== "India";
  const totalQuantity = useMemo(() => items.reduce((total, item) => total + (Number(item.quantity) || 0), 0), [items]);
  const isCodEligible = useMemo(
    () =>
      totalQuantity >= 10 &&
      items.length > 0 &&
      items.every((item) => {
        const product = products.find((entry) => entry.id === item.productId || entry.slug === item.slug);
        return Boolean(item.codAvailable || product?.codAvailable);
      }),
    [items, products, totalQuantity]
  );
  const codUnavailableReason = "Cash on Delivery is available only for eligible products and orders with 10 or more items.";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setIsBuyNowMode(params.get("mode") === "buy-now");
  }, []);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      setAuthChecking(false);
      setSubmitError("Customer checkout is temporarily unavailable. Please try again shortly.");
      return undefined;
    }

    let mounted = true;

    const syncSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      if (!data.session) {
        const redirect = `${window.location.pathname}${window.location.search}`;
        window.location.replace(`/sign-in?redirect=${encodeURIComponent(redirect)}`);
        return;
      }

      const user = data.session.user;
      const profile = user.user_metadata || {};
      setCustomerSession(data.session);
      setForm((current) => ({
        ...current,
        fullName: current.fullName || profile.full_name || "",
        mobile: current.mobile || profile.phone || profile.mobile || "",
        email: current.email || user.email || "",
        country: profile.country || current.country || "India",
        address: current.address || profile.address || "",
        city: current.city || profile.city || "",
        state: current.state || profile.state || "",
        pincode: current.pincode || profile.pincode || profile.postal_code || ""
      }));
      setAuthChecking(false);
    };

    syncSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        const redirect = `${window.location.pathname}${window.location.search}`;
        window.location.replace(`/sign-in?redirect=${encodeURIComponent(redirect)}`);
        return;
      }
      setCustomerSession(session);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const syncCheckoutItems = () => {
      const buyNowItem = isBuyNowMode ? syncBuyNowItemWithCatalog(products) : null;
      setItems(isBuyNowMode ? (buyNowItem ? [buyNowItem] : []) : syncCartItemsWithCatalog(products));
    };
    const syncRecentlyViewed = () => setRecentlyViewed(getRecentlyViewed(products));

    syncCheckoutItems();
    syncRecentlyViewed();
    window.addEventListener("cart:updated", syncCheckoutItems);
    window.addEventListener("buyNow:updated", syncCheckoutItems);
    window.addEventListener("storage", syncCheckoutItems);
    window.addEventListener("recentlyViewed:updated", syncRecentlyViewed);

    return () => {
      window.removeEventListener("cart:updated", syncCheckoutItems);
      window.removeEventListener("buyNow:updated", syncCheckoutItems);
      window.removeEventListener("storage", syncCheckoutItems);
      window.removeEventListener("recentlyViewed:updated", syncRecentlyViewed);
    };
  }, [isBuyNowMode, products]);

  const openProduct = (product) => {
    setSelectedProduct(product);
    setRecentlyViewed(addRecentlyViewed(product, products));
  };

  const updateField = (name, value) => {
    setForm((current) => {
      const next = { ...current, [name]: value };

      if (name === "country") {
        if (value !== "India") {
          next.orderType = "International Inquiry";
        } else if (current.orderType === "International Inquiry") {
          next.orderType = "Domestic Order";
        }
      }

      if (name === "paymentMethod") {
        const selected = paymentOptions.find((option) => option.value === value);
        next.paymentPreference = selected?.label || "Pay securely online";
      }

      return next;
    });
    setErrors((current) => ({ ...current, [name]: "" }));
  };

  const validate = () => {
    const nextErrors = {};
    const requiredFields = [
      ["fullName", "Full name is required."],
      ["mobile", "Mobile number is required."],
      ["country", "Country is required."],
      ["address", "Address is required."],
      ["city", "City is required."],
      ["state", "State is required."],
      ["pincode", "Pincode / ZIP is required."]
    ];

    requiredFields.forEach(([field, message]) => {
      if (!String(form[field] || "").trim()) nextErrors[field] = message;
    });

    if (!items.length) nextErrors.cart = "Your cart is empty.";
    if (form.paymentMethod === "online" && !hasFinalAmount) nextErrors.paymentMethod = "Online payment is available only after final amount is calculated.";
    if (form.paymentMethod === "cod" && !isCodEligible) nextErrors.paymentMethod = codUnavailableReason;
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submitOrder = async (event) => {
    event.preventDefault();
    if (!validate()) return;
    setSubmitError("");
    setSubmitting(true);

    try {
      const token = customerSession?.access_token;
      if (!token) {
        window.location.replace(`/sign-in?redirect=${encodeURIComponent(`${window.location.pathname}${window.location.search}`)}`);
        return;
      }

      const payload = {
        customer: {
          fullName: form.fullName.trim(),
          mobile: form.mobile.trim(),
          email: form.email.trim()
        },
        delivery: {
          country: form.country,
          address: form.address.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          pincode: form.pincode.trim(),
          note: form.deliveryNote.trim()
        },
        paymentMethod: form.paymentMethod,
        paymentPreference: form.paymentPreference,
        orderType: form.orderType,
        subtotal,
        deliveryCharge,
        discount,
        finalAmount,
        items
      };

      let result;
      let orderNumber;
      let backendMode = "unknown";

      if (form.paymentMethod === "cod" || form.paymentMethod === "pending_confirmation") {
        const response = await fetch("/api/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });

        result = await response.json();
        if (!response.ok || !result.ok) throw new Error(result.error || "Unable to submit order request.");
        orderNumber = result.order?.orderNumber || result.order?.orderId;
        backendMode = result.order?.mode || "unknown";
      } else {
        if (!hasFinalAmount) throw new Error("Final amount is required before online payment.");
        const createResponse = await fetch("/api/payments/razorpay/create-order", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });

        const paymentDraft = await createResponse.json().catch(() => ({
          error: "RAZORPAY_ORDER_CREATE_FAILED",
          message: "Unable to create Razorpay order. Please try again."
        }));
        if (!createResponse.ok || !paymentDraft.ok) {
          console.error("[checkout-payment-startup]", {
            error: paymentDraft.error,
            message: paymentDraft.message,
            details: paymentDraft.details
          });
          throw new Error(getPaymentStartupMessage(paymentDraft.error, paymentDraft.message));
        }

        const loaded = await loadRazorpayCheckout();
        if (!loaded) throw new Error("Unable to load Razorpay Checkout. Please try again.");

        result = await new Promise((resolve, reject) => {
          const razorpay = new window.Razorpay({
            key: paymentDraft.keyId,
            amount: paymentDraft.amount,
            currency: paymentDraft.currency,
            name: "Karari Beauty",
            description: "Karari Beauty Order",
            order_id: paymentDraft.razorpayOrderId,
            theme: { color: "#7A183D" },
            prefill: {
              name: payload.customer.fullName,
              email: payload.customer.email,
              contact: payload.customer.mobile
            },
            handler: async (paymentResponse) => {
              try {
                const verifyResponse = await fetch("/api/payments/razorpay/verify", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                  },
                  body: JSON.stringify({
                    internalOrderId: paymentDraft.internalOrderId,
                    razorpay_order_id: paymentResponse.razorpay_order_id,
                    razorpay_payment_id: paymentResponse.razorpay_payment_id,
                    razorpay_signature: paymentResponse.razorpay_signature
                  })
                });
                const verified = await verifyResponse.json();
                if (!verifyResponse.ok || !verified.ok) throw new Error(verified.error || "Payment verification failed.");
                resolve(verified);
              } catch (verifyError) {
                reject(verifyError);
              }
            },
            modal: {
              ondismiss: () => reject(new Error("Payment was cancelled. Your cart has not been cleared."))
            }
          });

          razorpay.open();
        });

        orderNumber = result.order?.orderNumber || paymentDraft.orderNumber;
        backendMode = result.order?.mode || "supabase";
      }

      const paymentStatus = form.paymentMethod === "cod" ? "COD Pending" : form.paymentMethod === "pending_confirmation" ? "Pending Confirmation" : "Paid";
      const paymentPreference = form.paymentMethod === "cod" ? "Cash on Delivery" : form.paymentMethod === "pending_confirmation" ? "Pay after confirmation" : "Online Payment via Razorpay";

      const order = {
        orderId: orderNumber,
        customer: payload.customer,
        delivery: payload.delivery,
        paymentMethod: form.paymentMethod,
        paymentPreference,
        paymentStatus,
        orderType: form.orderType,
        items,
        subtotal,
        finalAmount,
        status: form.paymentMethod === "online" ? "Order Confirmed" : "Order Request Received",
        backendMode,
        createdAt: new Date().toISOString()
      };

      saveOrderRequest(order);
      if (isBuyNowMode) {
        clearBuyNowItem();
      } else {
        clearCart();
      }
      setItems([]);
      setSubmittedOrder(order);
    } catch (error) {
      setSubmitError(error.message || "Unable to submit order request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (authChecking) {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#FFF8EE_0%,#FCE7EC_48%,#FFF8EE_100%)] text-[#3A2417]">
        <Header campaignActive={false} onViewProduct={openProduct} recentlyViewed={recentlyViewed} products={products} />
        <section className="px-3 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-xl rounded-2xl border border-[rgba(122,24,61,0.14)] bg-white/82 p-6 text-center shadow-boutique">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#C9962D]">Secure Checkout</p>
            <h1 className="mt-3 font-display text-3xl font-semibold text-[#7A183D]">Checking your account</h1>
            <p className="mt-3 text-sm font-semibold leading-6 text-[#3A2417]/62">Please wait while we prepare your checkout.</p>
          </div>
        </section>
      </main>
    );
  }

  if (submittedOrder) {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#FFF8EE_0%,#FCE7EC_48%,#FFF8EE_100%)] text-[#3A2417]">
        <Header campaignActive={false} onViewProduct={openProduct} recentlyViewed={recentlyViewed} products={products} />
      <section className="px-3 py-8 sm:px-6 sm:py-10 lg:px-8">
          <div className="mx-auto max-w-3xl rounded-2xl border border-[rgba(122,24,61,0.14)] bg-white/82 p-5 text-center shadow-boutique sm:p-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[rgba(201,150,45,0.32)] bg-[#FFF8EE] text-[#C9962D]">
              <BadgeCheck className="h-8 w-8" />
            </div>
            <p className="mt-6 text-xs font-bold uppercase tracking-[0.22em] text-[#C9962D]">Order Confirmed</p>
            <h1 className="mt-3 font-display text-3xl font-semibold text-[#7A183D] sm:text-4xl">Thank you for shopping with Karari Beauty</h1>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[#3A2417]/70">
              {submittedOrder.paymentMethod === "pending_confirmation"
                ? "Karari Beauty will confirm availability, delivery charges and payment details."
                : "Your order has been received. Online payments are verified securely through Razorpay."}
            </p>

            <div className="mt-7 grid gap-3 rounded-xl border border-[rgba(122,24,61,0.12)] bg-[#FFF8EE] p-4 text-left text-sm font-semibold text-[#3A2417]/72 sm:grid-cols-2">
              <p><span className="block text-xs uppercase tracking-[0.16em] text-[#C9962D]">Order ID</span>{submittedOrder.orderId}</p>
              <p><span className="block text-xs uppercase tracking-[0.16em] text-[#C9962D]">Customer</span>{submittedOrder.customer.fullName}</p>
              <p><span className="block text-xs uppercase tracking-[0.16em] text-[#C9962D]">Subtotal</span>{formatCurrency(submittedOrder.subtotal)}</p>
              <p><span className="block text-xs uppercase tracking-[0.16em] text-[#C9962D]">Final Amount</span>{formatCurrency(submittedOrder.finalAmount || submittedOrder.subtotal)}</p>
              <p><span className="block text-xs uppercase tracking-[0.16em] text-[#C9962D]">Payment</span>{submittedOrder.paymentPreference}</p>
              <p><span className="block text-xs uppercase tracking-[0.16em] text-[#C9962D]">Payment Status</span>{submittedOrder.paymentStatus}</p>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              <Link href="/" className="inline-flex h-11 items-center justify-center rounded-md bg-[#7A183D] px-4 text-sm font-bold text-white transition hover:bg-[#3A2417]">
                Continue Shopping
              </Link>
              <Link href="/#collections" className="inline-flex h-11 items-center justify-center rounded-md border border-[#7A183D] bg-white px-4 text-sm font-bold text-[#7A183D] transition hover:bg-[#FFF8EE]">
                View Collections
              </Link>
              <a
                href={buildWhatsAppOrderUrl(submittedOrder)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[rgba(122,24,61,0.14)] bg-[#FFF8EE] px-4 text-sm font-bold text-[#3A2417] transition hover:border-[#C9962D] hover:text-[#7A183D]"
              >
                <MessageCircle className="h-4 w-4" />
                Send Summary
              </a>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#FFF8EE_0%,#FCE7EC_50%,#FFF8EE_100%)] text-[#3A2417]">
      <Header campaignActive={false} onViewProduct={openProduct} recentlyViewed={recentlyViewed} products={products} />

      <section className="px-3 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <nav className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[#3A2417]/62">
            <Link href="/" className="transition hover:text-[#7A183D]">Home</Link>
            <ChevronRight className="h-4 w-4 text-[#C9962D]" />
            <Link href="/cart" className="transition hover:text-[#7A183D]">Cart</Link>
            <ChevronRight className="h-4 w-4 text-[#C9962D]" />
            <span className="text-[#7A183D]">Checkout</span>
          </nav>

          <div className="mt-5 rounded-xl border border-[rgba(122,24,61,0.14)] bg-white/72 p-4 shadow-soft backdrop-blur sm:mt-6 sm:p-7">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#C9962D]">Secure Checkout</p>
            <h1 className="mt-3 font-display text-3xl font-semibold text-[#7A183D] sm:text-5xl">Secure Checkout</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#3A2417]/68">
              Select your delivery address, review your items and pay securely online. Karari Beauty does not store card or UPI details.
            </p>
            <p className="mt-4 inline-flex flex-wrap items-center gap-2 rounded-lg border border-[rgba(201,150,45,0.26)] bg-[#FFF8EE] px-3 py-2 text-sm font-semibold text-[#3A2417]/70">
              Have an account?
              <Link href="/sign-in" className="font-bold text-[#7A183D] underline-offset-4 transition hover:text-[#C9962D] hover:underline">
                Sign in for faster checkout.
              </Link>
            </p>
          </div>

          {!items.length ? (
            <div className="mt-8">
              <EmptyCartState />
            </div>
          ) : (
            <form onSubmit={submitOrder} className="mt-6 grid gap-5 sm:mt-8 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
              <div className="space-y-5 sm:space-y-6">
                <section className="rounded-xl border border-[rgba(122,24,61,0.14)] bg-white/82 p-4 shadow-soft sm:p-6">
                  <h2 className="font-display text-2xl font-semibold text-[#7A183D]">Customer Details</h2>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <Field label="Full Name" name="fullName" value={form.fullName} error={errors.fullName} required onChange={(event) => updateField("fullName", event.target.value)} />
                    <Field label="Mobile Number" name="mobile" value={form.mobile} error={errors.mobile} required onChange={(event) => updateField("mobile", event.target.value)} />
                    <Field label="Email" name="email" type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} />
                    <Field label="Country" name="country" value={form.country} error={errors.country} required as="select" onChange={(event) => updateField("country", event.target.value)}>
                      {countries.map((country) => <option key={country} value={country}>{country}</option>)}
                    </Field>
                  </div>
                </section>

                <section className="rounded-xl border border-[rgba(122,24,61,0.14)] bg-white/82 p-4 shadow-soft sm:p-6">
                  <h2 className="font-display text-2xl font-semibold text-[#7A183D]">Delivery Details</h2>
                  <div className="mt-5 grid gap-4">
                    <Field label="Address" name="address" value={form.address} error={errors.address} required as="textarea" rows={3} onChange={(event) => updateField("address", event.target.value)} />
                    <div className="grid gap-4 sm:grid-cols-3">
                      <Field label="City" name="city" value={form.city} error={errors.city} required onChange={(event) => updateField("city", event.target.value)} />
                      <Field label="State" name="state" value={form.state} error={errors.state} required onChange={(event) => updateField("state", event.target.value)} />
                      <Field label="Pincode / ZIP" name="pincode" value={form.pincode} error={errors.pincode} required onChange={(event) => updateField("pincode", event.target.value)} />
                    </div>
                    <Field label="Delivery Note" name="deliveryNote" value={form.deliveryNote} as="textarea" rows={3} onChange={(event) => updateField("deliveryNote", event.target.value)} />
                  </div>
                </section>

                <section className="rounded-xl border border-[rgba(122,24,61,0.14)] bg-white/82 p-4 shadow-soft sm:p-6">
                  <h2 className="font-display text-2xl font-semibold text-[#7A183D]">Payment Method</h2>
                  {isInternational ? (
                    <p className="mt-3 rounded-lg bg-[#FFF8EE] p-3 text-sm font-semibold leading-6 text-[#7A183D]">
                      Our team will confirm delivery availability and charges for international orders.
                    </p>
                  ) : null}
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {paymentOptions.map((option) => {
                      const isCod = option.value === "cod";
                      const disabled = isCod && !isCodEligible;

                      return (
                      <label key={option.value} className={`flex min-h-11 items-start gap-3 rounded-lg border p-3 text-sm font-bold transition ${
                        disabled ? "cursor-not-allowed border-[rgba(122,24,61,0.1)] bg-white/48 text-[#3A2417]/42" :
                        form.paymentMethod === option.value ? "border-[#C9962D] bg-[#FFF8EE] text-[#7A183D]" : "border-[rgba(122,24,61,0.14)] bg-white/70 text-[#3A2417]"
                      }`}>
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={option.value}
                          checked={form.paymentMethod === option.value}
                          disabled={disabled}
                          onChange={(event) => updateField("paymentMethod", event.target.value)}
                          className="mt-1 accent-[#7A183D]"
                        />
                        <span>
                          <span className="block">{option.label}</span>
                          <span className="mt-1 block text-xs font-semibold leading-5 text-[#3A2417]/62">{option.description}</span>
                          {disabled ? <span className="mt-2 block text-xs font-bold leading-5 text-[#7A183D]">{codUnavailableReason}</span> : null}
                        </span>
                      </label>
                    );
                    })}
                  </div>
                  {errors.paymentMethod ? <p className="mt-3 rounded-lg bg-[#FCE7EC] p-3 text-sm font-bold text-[#7A183D]">{errors.paymentMethod}</p> : null}
                  <p className="mt-4 rounded-lg border border-[rgba(201,150,45,0.24)] bg-[#FFF8EE] p-3 text-sm font-semibold leading-6 text-[#3A2417]/70">
                    Payments are securely processed by Razorpay. Your order will be confirmed after successful payment.
                  </p>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {orderTypes.map((option) => (
                      <label key={option} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm font-bold transition ${
                        form.orderType === option ? "border-[#C9962D] bg-[#FFF8EE] text-[#7A183D]" : "border-[rgba(122,24,61,0.14)] bg-white/70 text-[#3A2417]"
                      }`}>
                        <input
                          type="radio"
                          name="orderType"
                          value={option}
                          checked={form.orderType === option}
                          onChange={(event) => updateField("orderType", event.target.value)}
                          className="accent-[#7A183D]"
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                </section>
              </div>

              <aside className="space-y-4 lg:sticky lg:top-32 lg:self-start">
                <section className="rounded-xl border border-[rgba(122,24,61,0.14)] bg-white/86 p-4 shadow-boutique">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#C9962D]">Order Summary</p>
                  <div className="mt-4 space-y-3">
                    {items.map((item) => (
                      <div key={item.productId} className="flex gap-3 rounded-lg bg-[#FFF8EE] p-3">
                        <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-[#FFF8EE]">
                          <Image src={item.image} alt={item.name} fill sizes="4rem" className="object-cover" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-sm font-bold text-[#3A2417]">{item.name}</p>
                          <p className="mt-1 text-xs font-semibold text-[#3A2417]/55">Qty {item.quantity} x {formatCurrency(item.price)}</p>
                          <p className="mt-1 text-sm font-bold text-[#7A183D]">{formatCurrency((Number(item.price) || 0) * (Number(item.quantity) || 0))}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 space-y-3 border-t border-[rgba(122,24,61,0.12)] pt-4 text-sm font-semibold text-[#3A2417]/72">
                    <div className="flex items-center justify-between">
                      <span>Cart subtotal</span>
                      <span className="text-[#3A2417]">{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Delivery</span>
                      <span className="text-[#3A2417]">{deliveryCharge > 0 ? formatCurrency(deliveryCharge) : "Free delivery"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Discount</span>
                      <span className="text-[#3A2417]">{discount > 0 ? `-${formatCurrency(discount)}` : formatCurrency(0)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Final amount</span>
                      <span className="font-bold text-[#7A183D]">{hasFinalAmount ? formatCurrency(finalAmount) : "To be confirmed"}</span>
                    </div>
                    <p className="rounded-lg bg-[#FCE7EC]/72 p-3 leading-6">
                      {form.paymentMethod === "online"
                        ? "Delivery is included for now. Pay the final amount securely through Razorpay."
                        : "Karari Beauty will confirm availability, delivery charges and payment details."}
                    </p>
                  </div>
                </section>

                <section className="grid gap-2 rounded-xl border border-[rgba(122,24,61,0.14)] bg-white/70 p-4 shadow-soft">
                  {trustBadges.map(({ label, icon: Icon }) => (
                    <div key={label} className="flex items-center gap-2 rounded-lg bg-[#FFF8EE] px-3 py-2 text-xs font-bold text-[#3A2417]/72">
                      <Icon className="h-4 w-4 text-[#C9962D]" />
                      {label}
                    </div>
                  ))}
                </section>

                {errors.cart ? <p className="rounded-lg bg-white p-3 text-sm font-bold text-[#7A183D]">{errors.cart}</p> : null}
                {submitError ? <p className="rounded-lg bg-white p-3 text-sm font-bold text-[#7A183D]">{submitError}</p> : null}
                {form.paymentMethod === "online" && !hasFinalAmount ? <p className="rounded-lg bg-white p-3 text-sm font-bold text-[#7A183D]">Online payment is available only after final amount is calculated.</p> : null}
                <button
                  type="submit"
                  disabled={submitting || (form.paymentMethod === "online" && !hasFinalAmount)}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#7A183D] px-5 text-sm font-bold text-white shadow-soft transition hover:bg-[#3A2417] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submitting ? "Processing..." : form.paymentMethod === "online" ? "Pay Now" : form.paymentMethod === "cod" ? "Place COD Order" : "Submit Order Request"}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </aside>
            </form>
          )}
        </div>
      </section>

      <QuickViewModal product={selectedProduct} onClose={() => setSelectedProduct(null)} products={products} />
    </main>
  );
}
