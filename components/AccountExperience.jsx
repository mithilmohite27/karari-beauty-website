"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Clock3,
  CreditCard,
  Heart,
  Home,
  KeyRound,
  LogOut,
  Mail,
  MapPin,
  PackageCheck,
  Phone,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Trash2,
  UserRound
} from "lucide-react";
import ProductImage from "@/components/ProductImage";
import {
  addToCart,
  getOrders,
  getRecentlyViewed,
  getWishlistItems,
  toggleWishlist
} from "@/lib/ecommerceStorage";
import { getCustomerDisplayName, getCustomerSession, signOutCustomer } from "@/lib/customer/session";
import { formatCurrency } from "@/lib/whatsapp";

const tabs = [
  { key: "overview", label: "Overview", icon: Home },
  { key: "profile", label: "Profile", icon: UserRound },
  { key: "addresses", label: "Addresses", icon: MapPin },
  { key: "orders", label: "Orders", icon: ShoppingBag },
  { key: "wishlist", label: "Wishlist", icon: Heart },
  { key: "viewed", label: "Recently Viewed", icon: Clock3 },
  { key: "security", label: "Account Security", icon: ShieldCheck }
];

function profileValue(value, fallback = "Not added yet") {
  return value || fallback;
}

function getOrderStatusLabel(status) {
  const value = String(status || "pending").toLowerCase();
  if (value.includes("deliver")) return "Delivered";
  if (value.includes("ship")) return "Shipped";
  if (value.includes("cancel")) return "Cancelled";
  if (value.includes("confirm") || value.includes("paid")) return "Confirmed";
  if (value.includes("process") || value.includes("pack")) return "Processing";
  return "Pending";
}

function getStatusTone(label) {
  if (label === "Delivered") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (label === "Cancelled") return "bg-rose-50 text-rose-700 border-rose-200";
  if (label === "Shipped" || label === "Confirmed") return "bg-[#FFF8EE] text-[#7A183D] border-[#C9962D]/30";
  return "bg-[#FCE7EC] text-[#7A183D] border-[#7A183D]/14";
}

function getInitials(nameOrEmail) {
  const parts = String(nameOrEmail || "Karari customer")
    .replace(/@.*/, "")
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2);
  return (parts.map((part) => part[0]).join("") || "KB").toUpperCase();
}

function formatDate(value) {
  if (!value) return "Recently";
  try {
    return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
  } catch {
    return "Recently";
  }
}

function getItemCount(order) {
  return (order?.items || []).reduce((total, item) => total + (Number(item.quantity) || 0), 0);
}

function getOrderTotal(order) {
  return Number(order?.finalAmount ?? order?.totalAmount ?? order?.subtotal ?? 0) || 0;
}

function SectionTitle({ eyebrow, title, text }) {
  return (
    <div>
      <p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-[#C9962D]">{eyebrow}</p>
      <h2 className="mt-2 font-display text-2xl font-semibold text-[#7A183D] sm:text-3xl">{title}</h2>
      {text ? <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[#3A2417]/62">{text}</p> : null}
    </div>
  );
}

function EmptyState({ icon: Icon, title, text, actionHref, actionLabel }) {
  return (
    <div className="rounded-xl border border-dashed border-[rgba(122,24,61,0.18)] bg-[#FFF8EE]/72 p-6 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#C9962D] shadow-soft">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="mt-4 font-display text-2xl font-semibold text-[#7A183D]">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-[#3A2417]/62">{text}</p>
      {actionHref ? (
        <Link href={actionHref} className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#7A183D] px-5 text-sm font-bold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-[#621330]">
          {actionLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>
      ) : null}
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, text, onClick }) {
  const content = (
    <>
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FFF8EE] text-[#C9962D] shadow-soft">
        <Icon className="h-5 w-5" />
      </span>
      <span className="text-right">
        <span className="block font-display text-3xl font-semibold text-[#7A183D]">{value}</span>
        <span className="mt-1 block text-xs font-bold uppercase tracking-[0.14em] text-[#C9962D]">{label}</span>
      </span>
      <span className="mt-4 block text-sm font-medium leading-6 text-[#3A2417]/62">{text}</span>
    </>
  );

  return onClick ? (
    <button type="button" onClick={onClick} className="rounded-xl border border-[rgba(122,24,61,0.12)] bg-white/86 p-4 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-[#C9962D]/50">
      <span className="flex items-start justify-between gap-4">{content}</span>
    </button>
  ) : (
    <article className="rounded-xl border border-[rgba(122,24,61,0.12)] bg-white/86 p-4 shadow-soft transition hover:-translate-y-0.5 hover:border-[#C9962D]/50">
      <div className="flex items-start justify-between gap-4">{content}</div>
    </article>
  );
}

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex gap-3 rounded-lg border border-[rgba(122,24,61,0.1)] bg-[#FFF8EE]/72 p-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#C9962D]">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[#C9962D]">{label}</span>
        <span className="mt-1 block break-words text-sm font-semibold leading-6 text-[#3A2417]">{value}</span>
      </span>
    </div>
  );
}

function ProductMiniCard({ product, actionLabel, actionIcon: ActionIcon, onAction, secondaryLabel, secondaryHref, onSecondaryAction, secondaryIcon: SecondaryIcon }) {
  if (!product) return null;

  return (
    <article className="grid grid-cols-[5rem_1fr] gap-3 rounded-xl border border-[rgba(122,24,61,0.12)] bg-white/88 p-3 shadow-soft transition hover:-translate-y-0.5 hover:border-[#C9962D]/45">
      <Link href={`/products/${product.slug}`} className="relative aspect-square overflow-hidden rounded-lg bg-[#FFF8EE]">
        <ProductImage src={product.image} alt={product.name} fill sizes="96px" className="object-cover" />
      </Link>
      <div className="min-w-0">
        <Link href={`/products/${product.slug}`} className="line-clamp-2 text-sm font-bold leading-5 text-[#3A2417] transition hover:text-[#7A183D]">
          {product.name}
        </Link>
        <p className="mt-1 text-sm font-bold text-[#7A183D]">{formatCurrency(product.price)}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {onAction ? (
            <button type="button" onClick={() => onAction(product)} className="inline-flex min-h-9 items-center gap-1.5 rounded-md bg-[#7A183D] px-3 text-xs font-bold text-white transition hover:bg-[#621330]">
              {ActionIcon ? <ActionIcon className="h-3.5 w-3.5" /> : null}
              {actionLabel}
            </button>
          ) : null}
          {secondaryHref ? (
            <Link href={secondaryHref} className="inline-flex min-h-9 items-center rounded-md border border-[rgba(122,24,61,0.14)] bg-[#FFF8EE] px-3 text-xs font-bold text-[#7A183D] transition hover:border-[#C9962D]">
              {secondaryLabel}
            </Link>
          ) : null}
          {onSecondaryAction ? (
            <button type="button" onClick={() => onSecondaryAction(product)} className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-[rgba(122,24,61,0.14)] bg-[#FFF8EE] px-3 text-xs font-bold text-[#7A183D] transition hover:border-[#C9962D] hover:bg-[#FCE7EC]">
              {SecondaryIcon ? <SecondaryIcon className="h-3.5 w-3.5" /> : null}
              {secondaryLabel}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export default function AccountExperience({ products = [] }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [activeSection, setActiveSection] = useState("overview");
  const [orders, setOrders] = useState([]);
  const [wishlistIds, setWishlistIds] = useState([]);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [expandedOrderId, setExpandedOrderId] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let mounted = true;

    const syncCustomer = async () => {
      const { user: customerUser } = await getCustomerSession();
      if (!mounted) return;

      if (!customerUser) {
        window.location.replace("/sign-in?redirect=/account");
        return;
      }

      setUser(customerUser);
      setChecking(false);
    };

    syncCustomer();
    window.addEventListener("customerAuth:updated", syncCustomer);

    return () => {
      mounted = false;
      window.removeEventListener("customerAuth:updated", syncCustomer);
    };
  }, []);

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (tabs.some((tab) => tab.key === hash)) setActiveSection(hash);
  }, []);

  useEffect(() => {
    const syncAccountData = () => {
      setOrders(getOrders());
      setWishlistIds(getWishlistItems());
      setRecentlyViewed(getRecentlyViewed(products));
    };

    syncAccountData();
    window.addEventListener("orders:updated", syncAccountData);
    window.addEventListener("wishlist:updated", syncAccountData);
    window.addEventListener("recentlyViewed:updated", syncAccountData);
    window.addEventListener("storage", syncAccountData);

    return () => {
      window.removeEventListener("orders:updated", syncAccountData);
      window.removeEventListener("wishlist:updated", syncAccountData);
      window.removeEventListener("recentlyViewed:updated", syncAccountData);
      window.removeEventListener("storage", syncAccountData);
    };
  }, [products]);

  const profile = user?.user_metadata || {};
  const customerName = getCustomerDisplayName(user);
  const customerInitials = getInitials(customerName);
  const provider = user?.app_metadata?.provider || user?.identities?.[0]?.provider || "email";
  const address = useMemo(
    () =>
      [profile.address, profile.city, profile.state, profile.pincode, profile.country]
        .filter(Boolean)
        .join(", "),
    [profile.address, profile.city, profile.country, profile.pincode, profile.state]
  );
  const addressCount = address ? 1 : 0;
  const wishlistProducts = wishlistIds
    .map((id) => products.find((product) => product.id === id))
    .filter(Boolean);

  const changeSection = (key) => {
    setActiveSection(key);
    window.history.replaceState(null, "", key === "overview" ? "/account" : `/account#${key}`);
  };

  const logout = async () => {
    if (!window.confirm("Are you sure you want to log out?")) return;
    await signOutCustomer();
    window.location.assign("/");
  };

  const moveWishlistToCart = (product) => {
    addToCart(product, 1);
    if (wishlistIds.includes(product.id)) toggleWishlist(product);
    setNotice(`${product.name} moved to cart.`);
  };

  const removeFromWishlist = (product) => {
    toggleWishlist(product);
    setNotice(`${product.name} removed from wishlist.`);
  };

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,#FFF8EE_0%,#FCE7EC_58%,#FFF8EE_100%)] px-4 text-[#3A2417]">
        <div className="rounded-2xl border border-[rgba(122,24,61,0.14)] bg-white/86 p-6 text-center shadow-boutique">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#C9962D]">Karari Beauty</p>
          <p className="mt-2 font-display text-2xl font-semibold text-[#7A183D]">Opening your account...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[linear-gradient(135deg,#FFF8EE_0%,#FCE7EC_58%,#FFF8EE_100%)] px-3 py-5 text-[#3A2417] sm:px-6 sm:py-7 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/" className="inline-flex items-center gap-3" aria-label="Go to Karari Beauty home">
          <Image src="/logo.png" alt="Karari Beauty logo" width={52} height={52} priority className="h-[3.25rem] w-[3.25rem] rounded-full border border-[rgba(201,150,45,0.32)] object-cover shadow-soft" />
          <span>
            <span className="block font-display text-2xl font-semibold text-[#3A2417]">Karari Beauty</span>
            <span className="mt-1 block text-xs font-bold uppercase tracking-[0.2em] text-[#C9962D]">Customer Account</span>
          </span>
        </Link>

        <section className="mt-5 overflow-hidden rounded-2xl border border-[rgba(122,24,61,0.14)] bg-white/82 shadow-boutique backdrop-blur">
          <div className="relative overflow-hidden bg-[linear-gradient(135deg,#FFF8EE_0%,#FCE7EC_56%,#FFF8EE_100%)] p-5 sm:p-7 lg:p-8">
            <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 gap-4">
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-[#C9962D]/32 bg-white font-display text-2xl font-semibold text-[#7A183D] shadow-soft sm:h-20 sm:w-20 sm:text-3xl">
                  {customerInitials}
                </span>
                <div className="min-w-0">
                  <p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-[#C9962D]">Welcome back</p>
                  <h1 className="mt-2 break-words font-display text-3xl font-semibold leading-tight text-[#7A183D] sm:text-5xl">{customerName}</h1>
                  <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-[#3A2417]/66">
                    Your boutique shopping space for orders, saved favourites and Karari Beauty account details.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <span className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#C9962D]/28 bg-white/76 px-4 text-xs font-bold uppercase tracking-[0.12em] text-[#7A183D] shadow-soft">
                  <Sparkles className="h-4 w-4 text-[#C9962D]" />
                  Karari Beauty Member
                </span>
                <Link href="/" className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[#7A183D] px-4 text-sm font-bold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-[#621330]">
                  Continue Shopping
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>

          <div className="grid gap-0 lg:grid-cols-[17rem_1fr]">
            <aside className="border-b border-[rgba(122,24,61,0.12)] bg-[#FFF8EE]/72 p-3 lg:border-b-0 lg:border-r lg:p-4">
              <div className="flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-2 lg:overflow-visible lg:pb-0">
                {tabs.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => changeSection(key)}
                    className={`flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-bold transition lg:w-full ${
                      activeSection === key
                        ? "bg-[#7A183D] text-white shadow-soft"
                        : "bg-white/70 text-[#3A2417]/72 hover:bg-[#FCE7EC] hover:text-[#7A183D]"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
                <button type="button" onClick={logout} className="flex min-h-11 shrink-0 items-center gap-2 rounded-lg bg-white/70 px-3 text-sm font-bold text-[#7A183D] transition hover:bg-[#FCE7EC] lg:w-full">
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </aside>

            <section className="min-w-0 p-4 sm:p-6 lg:p-8">
              {notice ? (
                <p role="status" className="mb-4 rounded-lg border border-[#7A183D]/14 bg-[#FCE7EC] p-3 text-sm font-bold text-[#7A183D]">
                  {notice}
                </p>
              ) : null}

              {activeSection === "overview" ? (
                <div className="space-y-6">
                  <SectionTitle eyebrow="Account overview" title="Your Karari Beauty dashboard" text="A quick view of your saved shopping activity and account details." />
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <SummaryCard icon={ShoppingBag} label="Total Orders" value={orders.length} text="Orders placed from this browser." onClick={() => changeSection("orders")} />
                    <SummaryCard icon={Heart} label="Wishlist Items" value={wishlistProducts.length} text="Products saved for later." onClick={() => changeSection("wishlist")} />
                    <SummaryCard icon={MapPin} label="Saved Addresses" value={addressCount} text="Delivery details on your profile." onClick={() => changeSection("addresses")} />
                    <SummaryCard icon={Clock3} label="Recently Viewed" value={recentlyViewed.length} text="Products you explored recently." onClick={() => changeSection("viewed")} />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <Link href="/" className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[#7A183D] px-4 text-sm font-bold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-[#621330]">Continue Shopping</Link>
                    <button type="button" onClick={() => changeSection("orders")} className="inline-flex min-h-12 items-center justify-center rounded-lg border border-[rgba(122,24,61,0.14)] bg-white px-4 text-sm font-bold text-[#7A183D] transition hover:border-[#C9962D]">View Orders</button>
                    <button type="button" onClick={() => changeSection("wishlist")} className="inline-flex min-h-12 items-center justify-center rounded-lg border border-[rgba(122,24,61,0.14)] bg-white px-4 text-sm font-bold text-[#7A183D] transition hover:border-[#C9962D]">View Wishlist</button>
                    <button type="button" onClick={() => changeSection("addresses")} className="inline-flex min-h-12 items-center justify-center rounded-lg border border-[rgba(122,24,61,0.14)] bg-white px-4 text-sm font-bold text-[#7A183D] transition hover:border-[#C9962D]">Manage Addresses</button>
                  </div>
                </div>
              ) : null}

              {activeSection === "profile" ? (
                <div className="space-y-5">
                  <SectionTitle eyebrow="Profile details" title="Your saved information" text="These details are read from your Karari Beauty account profile." />
                  <div className="grid gap-3 md:grid-cols-2">
                    <DetailRow icon={UserRound} label="Name" value={profileValue(profile.full_name, customerName)} />
                    <DetailRow icon={Mail} label="Email" value={profileValue(user?.email)} />
                    <DetailRow icon={Phone} label="Mobile" value={profileValue(profile.phone || profile.mobile)} />
                    <DetailRow icon={MapPin} label="Default Address" value={profileValue(address)} />
                  </div>
                  <div className="rounded-xl border border-[rgba(122,24,61,0.12)] bg-[#FFF8EE]/72 p-4 text-sm font-semibold leading-6 text-[#3A2417]/66">
                    Profile editing is kept read-only here so your login and checkout details stay consistent.
                  </div>
                </div>
              ) : null}

              {activeSection === "addresses" ? (
                <div className="space-y-5">
                  <SectionTitle eyebrow="Delivery details" title="Saved addresses" text="Your default delivery information appears here when it exists on your profile." />
                  {address ? (
                    <article className="rounded-xl border border-[rgba(122,24,61,0.12)] bg-white/88 p-5 shadow-soft">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="font-display text-2xl font-semibold text-[#7A183D]">{profileValue(profile.full_name, customerName)}</h3>
                          <p className="mt-2 text-sm font-semibold leading-6 text-[#3A2417]/72">{address}</p>
                          <p className="mt-2 text-sm font-semibold text-[#3A2417]/62">{profileValue(profile.phone || profile.mobile, "Mobile not added")}</p>
                        </div>
                        <span className="rounded-full border border-[#C9962D]/32 bg-[#FFF8EE] px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[#7A183D]">Default</span>
                      </div>
                    </article>
                  ) : (
                    <EmptyState icon={MapPin} title="No saved addresses yet" text="Add delivery details during checkout and they will appear in your account profile when available." actionHref="/checkout" actionLabel="Go to Checkout" />
                  )}
                </div>
              ) : null}

              {activeSection === "orders" ? (
                <div className="space-y-5">
                  <SectionTitle eyebrow="Orders" title="Your orders" text="Track your Karari Beauty order activity from this device." />
                  {orders.length ? (
                    <div className="space-y-3">
                      {orders.map((order, index) => {
                        const statusLabel = getOrderStatusLabel(order.status || order.paymentStatus);
                        const orderId = order.orderId || order.orderNumber || `#${index + 1}`;
                        const isExpanded = expandedOrderId === orderId;
                        return (
                          <article key={orderId} className="rounded-xl border border-[rgba(122,24,61,0.12)] bg-white/88 p-4 shadow-soft">
                            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                              <div className="min-w-0">
                                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#C9962D]">Order {orderId}</p>
                                <h3 className="mt-2 font-display text-2xl font-semibold text-[#7A183D]">{formatDate(order.createdAt)}</h3>
                                <p className="mt-1 text-sm font-semibold text-[#3A2417]/62">{getItemCount(order)} item{getItemCount(order) === 1 ? "" : "s"} • {formatCurrency(getOrderTotal(order))}</p>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] ${getStatusTone(statusLabel)}`}>{statusLabel}</span>
                                <span className="rounded-full border border-[rgba(122,24,61,0.12)] bg-[#FFF8EE] px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] text-[#3A2417]/70">{order.paymentStatus || order.paymentPreference || "Payment pending"}</span>
                                <button type="button" onClick={() => setExpandedOrderId(isExpanded ? "" : orderId)} className="inline-flex min-h-9 items-center rounded-md border border-[rgba(122,24,61,0.14)] bg-white px-3 text-xs font-bold text-[#7A183D] transition hover:border-[#C9962D]">
                                  {isExpanded ? "Hide Details" : "View Details"}
                                </button>
                              </div>
                            </div>
                            {isExpanded ? (
                              <div className="mt-4 rounded-lg border border-[rgba(122,24,61,0.1)] bg-[#FFF8EE]/72 p-3">
                                <div className="grid gap-2 text-sm font-semibold text-[#3A2417]/70 sm:grid-cols-2">
                                  <p><span className="text-[#7A183D]">Payment:</span> {order.paymentPreference || order.paymentMethod || "To be confirmed"}</p>
                                  <p><span className="text-[#7A183D]">Total:</span> {formatCurrency(getOrderTotal(order))}</p>
                                </div>
                                {order.items?.length ? (
                                  <ul className="mt-3 space-y-1 text-sm font-medium text-[#3A2417]/66">
                                    {order.items.map((item) => (
                                      <li key={`${orderId}-${item.productId || item.slug || item.name}`} className="flex justify-between gap-3">
                                        <span className="min-w-0 truncate">{item.name}</span>
                                        <span className="shrink-0">x {item.quantity || 1}</span>
                                      </li>
                                    ))}
                                  </ul>
                                ) : null}
                              </div>
                            ) : null}
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <EmptyState icon={ShoppingBag} title="No orders yet" text="Your Karari Beauty orders will appear here once you place them." actionHref="/" actionLabel="Start Shopping" />
                  )}
                </div>
              ) : null}

              {activeSection === "wishlist" ? (
                <div className="space-y-5">
                  <SectionTitle eyebrow="Wishlist" title="Saved favourites" text="Keep your favourite Karari Beauty picks close while you decide." />
                  {wishlistProducts.length ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      {wishlistProducts.map((product) => (
                        <ProductMiniCard
                          key={product.id}
                          product={product}
                          actionLabel="Move to Cart"
                          actionIcon={PackageCheck}
                          onAction={moveWishlistToCart}
                          secondaryLabel="Remove"
                          secondaryIcon={Trash2}
                          onSecondaryAction={removeFromWishlist}
                        />
                      ))}
                    </div>
                  ) : (
                    <EmptyState icon={Heart} title="Your wishlist is empty" text="Save products you love and come back to them anytime." actionHref="/" actionLabel="Explore Products" />
                  )}
                </div>
              ) : null}

              {activeSection === "viewed" ? (
                <div className="space-y-5">
                  <SectionTitle eyebrow="Recently viewed" title="Products you explored" text="A compact history of your recent product browsing." />
                  {recentlyViewed.length ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      {recentlyViewed.map((product) => (
                        <ProductMiniCard key={product.id} product={product} secondaryLabel="View Product" secondaryHref={`/products/${product.slug}`} />
                      ))}
                    </div>
                  ) : (
                    <EmptyState icon={Clock3} title="No products viewed yet" text="Browse the collection and recently viewed products will appear here." actionHref="/" actionLabel="Browse Collections" />
                  )}
                </div>
              ) : null}

              {activeSection === "security" ? (
                <div className="space-y-5">
                  <SectionTitle eyebrow="Account security" title="Sign-in and privacy" text="A simple view of how your Karari Beauty account is connected." />
                  <div className="grid gap-3 md:grid-cols-2">
                    <DetailRow icon={Mail} label="Account Email" value={profileValue(user?.email)} />
                    <DetailRow icon={KeyRound} label="Sign-in Method" value={provider === "google" ? "Google connected account" : "Email and password"} />
                    <DetailRow icon={BadgeCheck} label="Account Status" value={user?.email_confirmed_at ? "Email verified" : "Verification pending"} />
                    <DetailRow icon={CreditCard} label="Shopping Protection" value="Secure checkout and order support" />
                  </div>
                  <div className="flex flex-col gap-3 rounded-xl border border-[rgba(122,24,61,0.12)] bg-white/88 p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-display text-2xl font-semibold text-[#7A183D]">Need to leave?</h3>
                      <p className="mt-1 text-sm font-semibold leading-6 text-[#3A2417]/62">Logout keeps your account secure on shared devices.</p>
                    </div>
                    <button type="button" onClick={logout} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#7A183D] px-5 text-sm font-bold text-white shadow-soft transition hover:bg-[#621330]">
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                </div>
              ) : null}
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
