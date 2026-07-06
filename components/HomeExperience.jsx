"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Eye,
  ExternalLink,
  Facebook,
  Globe2,
  Heart,
  Instagram,
  Mail,
  Menu,
  MessageCircle,
  MapPin,
  PackageCheck,
  Search,
  ShoppingCart,
  ShieldCheck,
  Sparkles,
  Truck,
  User,
  X
} from "lucide-react";
import CartDrawer from "@/components/CartDrawer";
import ProductCard from "@/components/ProductCard";
import QuickViewModal from "@/components/QuickViewModal";
import { businessSettings } from "@/data/businessSettings";
import { categories as localCategories } from "@/data/categories";
import { products as localProducts } from "@/data/products";
import { giftCombos } from "@/data/giftCombos";
import { frequentlyBoughtTogether } from "@/data/frequentlyBoughtTogether";
import { seasonalCampaign as localSeasonalCampaign } from "@/data/seasonalCampaign";
import {
  addRecentlyViewed,
  addToCart as addCartItem,
  getCartCount,
  getRecentlyViewed,
  getRecentlyViewedCount,
  getWishlistItems,
  setBuyNowItem,
  toggleWishlist as toggleWishlistItem
} from "@/lib/ecommerceStorage";
import { createWhatsAppUrl, formatCurrency } from "@/lib/whatsapp";

const CAMPAIGN_OFFER_FALLBACK = "Festive offers live now";

function getCampaignOfferLabel(campaign) {
  return campaign?.offerLabel || campaign?.offer_label || CAMPAIGN_OFFER_FALLBACK;
}

const countries = [
  { code: "IN", name: "India", defaultCurrency: "INR" },
  { code: "US", name: "USA", defaultCurrency: "USD" },
  { code: "CA", name: "Canada", defaultCurrency: "CAD" },
  { code: "AU", name: "Australia", defaultCurrency: "AUD" },
  { code: "AE", name: "UAE", defaultCurrency: "AED" },
  { code: "GB", name: "UK", defaultCurrency: "GBP" }
];
const currencies = [
  { code: "INR", symbol: "₹", label: "INR" },
  { code: "USD", symbol: "$", label: "USD" },
  { code: "CAD", symbol: "$", label: "CAD" },
  { code: "AUD", symbol: "$", label: "AUD" },
  { code: "AED", symbol: "د.إ", label: "AED" },
  { code: "GBP", symbol: "£", label: "GBP" }
];

function readStoredValue(key, fallback) {
  if (typeof window === "undefined") return fallback;
  return window.localStorage.getItem(key) || fallback;
}

function Countdown({ campaign = localSeasonalCampaign }) {
  const countdownDate = campaign?.countdownDate || campaign?.endDate || localSeasonalCampaign.countdownDate;
  const targetDate = useMemo(() => new Date(countdownDate), [countdownDate]);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const diff = Math.max(0, targetDate.getTime() - now.getTime());
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return (
    <div className="grid grid-cols-4 gap-1 sm:gap-2" aria-label="Countdown to Raksha Bandhan 2026">
      {[
        ["Days", days],
        ["Hours", hours],
        ["Mins", minutes],
        ["Secs", seconds]
      ].map(([label, value]) => (
        <div key={label} className="h-[3.05rem] rounded-lg border border-antiqueGold/25 bg-white/80 px-1.5 py-1.5 text-center shadow-soft backdrop-blur sm:h-[4.4rem] sm:px-2 sm:py-2">
          <div className="font-display text-lg font-semibold leading-none text-wine sm:text-3xl">{String(value).padStart(2, "0")}</div>
          <div className="mt-0.5 text-[0.52rem] font-semibold uppercase tracking-[0.1em] text-ink/55 sm:mt-1 sm:text-[0.64rem] sm:tracking-[0.14em]">{label}</div>
        </div>
      ))}
    </div>
  );
}

function HeaderDropdown({ open, align = "right", children }) {
  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`absolute top-full z-50 mt-3 w-72 rounded-lg border border-[rgba(122,24,61,0.14)] bg-white p-3 text-left shadow-boutique ${align === "left" ? "left-0" : "right-0"}`}
    >
      {children}
    </motion.div>
  );
}

function HeaderIconButton({ icon: Icon, label, count, onClick, active }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative inline-flex h-11 items-center gap-2 rounded-md border px-3 text-sm font-semibold transition ${
        active ? "border-[#C9962D] bg-[#FFF8EE] text-[#7A183D]" : "border-[rgba(122,24,61,0.14)] bg-white/78 text-[#3A2417] hover:border-[#C9962D] hover:text-[#7A183D]"
      }`}
      aria-label={label}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden xl:inline">{label}</span>
      {typeof count === "number" ? (
        <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-wine px-1 text-[0.65rem] font-bold text-white">
          {count}
        </span>
      ) : null}
    </button>
  );
}

function SearchBox({ onViewProduct, products = localProducts }) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];
    return products
      .filter((product) =>
        [product.name, product.category, product.collection, product.description]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(normalized))
      )
      .slice(0, 8);
  }, [query]);

  return (
    <div className="relative w-full">
      <div className="flex h-11 items-center rounded-md border border-[rgba(122,24,61,0.14)] bg-white px-3 shadow-soft transition focus-within:border-[#C9962D]">
        <Search className="h-4 w-4 shrink-0 text-karariGold" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 140)}
          placeholder="Search Rakhi, jewellery, bangles, gifts…"
          className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm font-medium text-[#3A2417] outline-none placeholder:text-[#3A2417]/40"
        />
      </div>
      {focused && query.trim() ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-lg border border-[rgba(122,24,61,0.14)] bg-white shadow-boutique"
        >
          <div
            className="max-h-[min(20rem,calc(100vh-12rem))] overflow-y-auto overscroll-contain"
            onWheel={(event) => event.stopPropagation()}
            onTouchMove={(event) => event.stopPropagation()}
          >
            {results.length ? (
              results.map((product) => (
                <button
                  type="button"
                  key={product.id}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    setQuery("");
                    onViewProduct(product);
                  }}
                  className="flex w-full items-center gap-3 border-b border-[rgba(122,24,61,0.08)] p-3 text-left transition last:border-b-0 hover:bg-[#FFF8EE]"
                >
                  <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-[#FFF8EE]">
                    <Image src={product.image} alt={product.name} fill sizes="3rem" className="object-cover" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-[#3A2417]">{product.name}</span>
                    <span className="mt-1 block text-xs font-semibold uppercase tracking-[0.14em] text-karariGold">{product.category}</span>
                  </span>
                  <span className="text-sm font-bold text-rose">{formatCurrency(product.price)}</span>
                </button>
              ))
            ) : (
              <div className="p-4 text-sm font-medium text-[#3A2417]/60">No products found.</div>
            )}
          </div>
        </motion.div>
      ) : null}
    </div>
  );
}

function RecentlyViewedList({ products: viewedProducts, onViewProduct }) {
  if (!viewedProducts.length) {
    return <p className="rounded-md bg-[#FFF8EE] p-3 text-sm font-medium text-[#3A2417]/65">No products viewed yet.</p>;
  }

  return (
    <div className="space-y-2">
      {viewedProducts.slice(0, 4).map((product) => (
        <button
          type="button"
          key={product.id}
          onClick={() => onViewProduct(product)}
          className="flex w-full items-center gap-3 rounded-md p-2 text-left transition hover:bg-[#FFF8EE]"
        >
          <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-[#FFF8EE]">
            <Image src={product.image} alt={product.name} fill sizes="3rem" className="object-cover" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold text-[#3A2417]">{product.name}</span>
            <span className="mt-1 block text-xs font-semibold text-rose">{formatCurrency(product.price)}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

const collectionMenuGroups = [
  {
    title: "Festive & Gifts",
    ids: ["rakhi", "gift-items", "wedding-baskets", "imported-items"]
  },
  {
    title: "Fashion & Accessories",
    ids: ["jewellery", "bangles", "handbags", "watches", "ladies-wear"]
  },
  {
    title: "Beauty & Home",
    ids: ["cosmetics", "fancy-items", "crockery"]
  }
];

function getCollectionById(categories, id) {
  return categories.find((category) => category.id === id || category.slug === id);
}

function CollectionsMegaMenu({ open, onClose, categories = localCategories }) {
  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="absolute right-0 top-full z-50 mt-3 w-[min(48rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-[rgba(122,24,61,0.14)] bg-[linear-gradient(135deg,#FFF8EE_0%,#FCE7EC_100%)] p-4 text-left shadow-boutique"
    >
      <div className="mb-3 flex items-center justify-between gap-4 border-b border-[rgba(122,24,61,0.12)] pb-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#C9962D]">Karari Beauty</p>
          <h3 className="font-display text-2xl font-semibold text-[#7A183D]">Collections</h3>
        </div>
        <span className="hidden rounded-full border border-[rgba(201,150,45,0.28)] bg-white/70 px-3 py-1 text-xs font-bold text-[#7A183D] sm:inline-flex">
          12 boutique edits
        </span>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {collectionMenuGroups.map((group) => (
          <div key={group.title}>
            <p className="px-2 pb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#C9962D]">{group.title}</p>
            <div className="space-y-1">
              {group.ids.map((id) => {
                const category = getCollectionById(categories, id);
                if (!category) return null;

                return (
                  <a
                    key={category.id}
                    href={category.href}
                    onClick={onClose}
                    className="group flex items-start justify-between gap-3 rounded-lg border border-transparent px-3 py-2.5 transition hover:border-[rgba(201,150,45,0.32)] hover:bg-white/78"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-[#3A2417] transition group-hover:text-[#7A183D]">{category.name}</span>
                      <span className="mt-1 line-clamp-2 block text-xs leading-5 text-[#3A2417]/58">{category.description}</span>
                    </span>
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-[#C9962D] transition group-hover:translate-x-0.5 group-hover:text-[#7A183D]" />
                  </a>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export function Header({ campaignActive, onViewProduct, recentlyViewed, categories = localCategories, products = localProducts, seasonalCampaign = localSeasonalCampaign, siteSettings }) {
  const headerRef = useRef(null);
  const [selectedCountry, setSelectedCountry] = useState("India");
  const [selectedCurrency, setSelectedCurrency] = useState("INR");
  const [wishlistItems, setWishlistItems] = useState([]);
  const [cartCount, setCartCount] = useState(0);
  const [viewedCount, setViewedCount] = useState(0);
  const [activeHeaderDropdown, setActiveHeaderDropdown] = useState(null);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);

  useEffect(() => {
    const storedCountry = readStoredValue("karari-country", "India");
    const validCountry = countries.find((country) => country.name === storedCountry) ? storedCountry : "India";
    setSelectedCountry(validCountry);
    setSelectedCurrency(readStoredValue("karari-currency", "INR"));
  }, []);

  useEffect(() => {
    const syncHeaderCounts = () => {
      setWishlistItems(getWishlistItems());
      setCartCount(getCartCount());
      setViewedCount(getRecentlyViewedCount());
    };

    syncHeaderCounts();
    window.addEventListener("cart:updated", syncHeaderCounts);
    window.addEventListener("wishlist:updated", syncHeaderCounts);
    window.addEventListener("recentlyViewed:updated", syncHeaderCounts);
    window.addEventListener("storage", syncHeaderCounts);

    return () => {
      window.removeEventListener("cart:updated", syncHeaderCounts);
      window.removeEventListener("wishlist:updated", syncHeaderCounts);
      window.removeEventListener("recentlyViewed:updated", syncHeaderCounts);
      window.removeEventListener("storage", syncHeaderCounts);
    };
  }, []);

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (!headerRef.current || headerRef.current.contains(event.target)) return;
      setActiveHeaderDropdown(null);
    };

    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setActiveHeaderDropdown(null);
      }
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const toggleHeaderDropdown = (key) => {
    setActiveHeaderDropdown((current) => (current === key ? null : key));
  };

  const openCartDrawer = () => {
    setActiveHeaderDropdown(null);
    setCartDrawerOpen(true);
  };

  const updateCountry = (country) => {
    const nextCountry = countries.find((item) => item.name === country) || countries[0];
    setSelectedCountry(nextCountry.name);
    setSelectedCurrency(nextCountry.defaultCurrency);
    window.localStorage.setItem("karari-country", nextCountry.name);
    window.localStorage.setItem("karari-currency", nextCountry.defaultCurrency);
  };

  const updateCurrency = (currency) => {
    setSelectedCurrency(currency);
    window.localStorage.setItem("karari-currency", currency);
  };

  const businessName = getSettingsValue(siteSettings, "business", "name", businessSettings.name);
  const businessTagline = getSettingsValue(siteSettings, "business", "tagline", businessSettings.tagline);
  const logoUrl = getSafeLogoUrl(siteSettings);
  const announcementLine = getSettingsValue(siteSettings, "website", "announcementLine", businessSettings.announcementLine);
  const internationalTemplate = getSettingsValue(siteSettings, "website", "internationalInquiryMessage", businessSettings.internationalMessage);
  const announcement =
    selectedCountry === "India"
      ? announcementLine
      : internationalTemplate.replace("{country}", selectedCountry);
  const selectedCurrencyMeta = currencies.find((currency) => currency.code === selectedCurrency) || currencies[0];

  return (
    <>
      <header ref={headerRef} className="sticky top-0 z-40 border-b border-[rgba(122,24,61,0.12)] bg-[#FFF8EE]/92 backdrop-blur-xl">
      <div className="announcement-shine relative overflow-hidden border-b border-[rgba(122,24,61,0.14)] bg-[linear-gradient(90deg,#FFF8EE_0%,#FCE7EC_42%,#F7E4C3_100%)] px-3 py-1.5 text-center text-[0.68rem] font-semibold tracking-[0.08em] text-[#7A183D] sm:px-4 sm:py-2 sm:text-xs sm:tracking-[0.13em]">
        <motion.span
          key={announcement}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 inline-flex items-center justify-center gap-2"
        >
          <Sparkles className="h-3.5 w-3.5 text-[#C9962D]" />
          {announcement}
        </motion.span>
      </div>
      <div className="mx-auto max-w-[1440px] px-3 py-3 sm:px-6 sm:py-4 lg:px-8">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 xl:gap-6">
          <Link href="/" className="flex w-auto min-w-0 shrink-0 items-center gap-2 sm:gap-3 lg:w-56 xl:w-64" aria-label="Go to Karari Beauty home">
            <BrandLogo src={logoUrl} alt={`${businessName} logo`} width={48} height={48} priority className="h-11 w-11 rounded-full border border-antiqueGold/25 object-cover sm:h-12 sm:w-12" />
            <div className="block min-w-0 max-w-[8.25rem] sm:max-w-none">
              <p className="truncate font-display text-base font-semibold leading-none text-[#3A2417] sm:text-xl">{businessName}</p>
              <p className="mt-1 truncate text-[0.62rem] font-medium uppercase tracking-[0.14em] text-karariGold sm:text-xs sm:tracking-[0.18em]">{businessTagline}</p>
            </div>
          </Link>

          <div className="order-3 min-w-0 flex-[1_0_100%] lg:order-none lg:max-w-[44rem] lg:flex-1 xl:max-w-[50rem]">
            <SearchBox onViewProduct={onViewProduct} products={products} />
          </div>

          <div className="hidden shrink-0 items-center gap-2.5 lg:flex xl:gap-3">
            <div className="relative">
              <button
                type="button"
                onClick={() => toggleHeaderDropdown("collections")}
                className={`inline-flex h-11 items-center gap-2 rounded-md border px-3 text-sm font-semibold transition ${
                  activeHeaderDropdown === "collections"
                    ? "border-[#C9962D] bg-[#FFF8EE] text-[#7A183D]"
                    : "border-[rgba(122,24,61,0.14)] bg-white/78 text-[#3A2417] hover:border-[#C9962D] hover:text-[#7A183D]"
                }`}
              >
                Collections
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              <CollectionsMegaMenu open={activeHeaderDropdown === "collections"} onClose={() => setActiveHeaderDropdown(null)} categories={categories} />
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => toggleHeaderDropdown("country")}
                className="inline-flex h-11 items-center gap-2 rounded-md border border-[rgba(122,24,61,0.14)] bg-white/78 px-3 text-sm font-semibold text-[#3A2417] transition hover:border-[#C9962D] hover:text-[#7A183D]"
              >
                <Globe2 className="h-4 w-4" />
                {selectedCountry}
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              <HeaderDropdown open={activeHeaderDropdown === "country"}>
                <p className="px-2 pb-2 text-xs font-bold uppercase tracking-[0.18em] text-karariGold">Deliver to</p>
                <div className="grid grid-cols-2 gap-1">
                  {countries.map((country) => (
                    <button
                      type="button"
                      key={country.code}
                      onClick={() => {
                        updateCountry(country.name);
                        setActiveHeaderDropdown(null);
                      }}
                      className={`rounded-md px-3 py-2 text-left text-sm font-semibold transition ${
                        selectedCountry === country.name ? "bg-[#7A183D] text-white" : "text-[#3A2417] hover:bg-[#FFF8EE]"
                      }`}
                    >
                      {country.name}
                    </button>
                  ))}
                </div>
              </HeaderDropdown>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => toggleHeaderDropdown("currency")}
                className="inline-flex h-11 items-center gap-2 rounded-md border border-[rgba(122,24,61,0.14)] bg-white/78 px-3 text-sm font-semibold text-[#3A2417] transition hover:border-[#C9962D] hover:text-[#7A183D]"
              >
                {selectedCurrencyMeta.symbol} {selectedCurrency}
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              <HeaderDropdown open={activeHeaderDropdown === "currency"}>
                <p className="px-2 pb-2 text-xs font-bold uppercase tracking-[0.18em] text-karariGold">Display currency</p>
                <div className="grid grid-cols-2 gap-1">
                  {currencies.map((currency) => (
                    <button
                      type="button"
                      key={currency.code}
                      onClick={() => {
                        updateCurrency(currency.code);
                        setActiveHeaderDropdown(null);
                      }}
                      className={`rounded-md px-3 py-2 text-left text-sm font-semibold transition ${
                        selectedCurrency === currency.code ? "bg-[#7A183D] text-white" : "text-[#3A2417] hover:bg-[#FFF8EE]"
                      }`}
                    >
                      {currency.symbol} {currency.label}
                    </button>
                  ))}
                </div>
              </HeaderDropdown>
            </div>

            <div className="relative">
              <HeaderIconButton icon={User} label="Account" onClick={() => toggleHeaderDropdown("account")} active={activeHeaderDropdown === "account"} />
              <HeaderDropdown open={activeHeaderDropdown === "account"}>
                <div className="space-y-2">
                  <Link href="/sign-in" className="block rounded-md bg-[#FFF8EE] p-3 text-sm font-semibold text-[#3A2417] transition hover:bg-[#FCE7EC] hover:text-[#7A183D]">
                    Sign In
                  </Link>
                  <Link href="/account" className="block rounded-md bg-[#FFF8EE] p-3 text-sm font-semibold text-[#3A2417] transition hover:bg-[#FCE7EC] hover:text-[#7A183D]">
                    My Account
                  </Link>
                  <Link href="/account" className="block rounded-md bg-[#FFF8EE] p-3 text-sm font-semibold text-[#3A2417] transition hover:bg-[#FCE7EC] hover:text-[#7A183D]">
                    Track Order
                  </Link>
                  <button type="button" onClick={() => setActiveHeaderDropdown("wishlist")} className="block w-full rounded-md bg-[#FFF8EE] p-3 text-left text-sm font-semibold text-[#3A2417] transition hover:bg-[#FCE7EC] hover:text-[#7A183D]">
                    Wishlist
                  </button>
                  <p className="rounded-md border border-[rgba(201,150,45,0.24)] bg-white p-3 text-xs font-bold uppercase tracking-[0.14em] text-[#C9962D]">Customer login coming soon</p>
                </div>
              </HeaderDropdown>
            </div>

            <div className="relative">
              <HeaderIconButton icon={Heart} label="Wishlist" count={wishlistItems.length} onClick={() => toggleHeaderDropdown("wishlist")} active={activeHeaderDropdown === "wishlist"} />
              <HeaderDropdown open={activeHeaderDropdown === "wishlist"}>
                {wishlistItems.length ? (
                  <p className="rounded-md bg-[#FFF8EE] p-3 text-sm font-medium text-[#3A2417]/65">Wishlist items are saved locally for the upcoming wishlist page.</p>
                ) : (
                  <p className="rounded-md bg-[#FFF8EE] p-3 text-sm font-medium text-[#3A2417]/65">Your wishlist is empty.</p>
                )}
              </HeaderDropdown>
            </div>

            <div className="relative">
              <HeaderIconButton icon={Eye} label="Viewed" count={viewedCount} onClick={() => toggleHeaderDropdown("viewed")} active={activeHeaderDropdown === "viewed"} />
              <HeaderDropdown open={activeHeaderDropdown === "viewed"}>
                <p className="px-1 pb-2 text-xs font-bold uppercase tracking-[0.18em] text-karariGold">Recently Viewed</p>
                <RecentlyViewedList products={recentlyViewed} onViewProduct={onViewProduct} />
              </HeaderDropdown>
            </div>

            <div className="relative">
              <HeaderIconButton icon={ShoppingCart} label="Cart" count={cartCount} onClick={openCartDrawer} active={cartDrawerOpen} />
            </div>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2 lg:hidden">
            <button type="button" onClick={() => toggleHeaderDropdown("wishlist")} className="relative rounded-md border border-[rgba(122,24,61,0.14)] bg-white/80 p-2.5 text-[#3A2417]" aria-label="Wishlist">
              <Heart className="h-4 w-4" />
              {wishlistItems.length ? <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-wine px-1 text-[0.65rem] font-bold text-white">{wishlistItems.length}</span> : null}
            </button>
            <button type="button" onClick={openCartDrawer} className="relative rounded-md border border-[rgba(122,24,61,0.14)] bg-white/80 p-2.5 text-[#3A2417]" aria-label="Cart">
              <ShoppingCart className="h-4 w-4" />
              {cartCount ? <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-wine px-1 text-[0.65rem] font-bold text-white">{cartCount}</span> : null}
            </button>
            <button type="button" onClick={() => toggleHeaderDropdown("mobile")} className="rounded-md border border-[rgba(122,24,61,0.14)] bg-[#7A183D] p-2.5 text-white" aria-label="Open header menu">
              {activeHeaderDropdown === "mobile" ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {activeHeaderDropdown === "mobile" ? (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-3 max-h-[calc(100dvh-9rem)] overflow-y-auto overscroll-contain rounded-lg border border-[rgba(122,24,61,0.14)] bg-white p-3 shadow-boutique lg:hidden">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-bold uppercase tracking-[0.16em] text-karariGold">
                Country
                <select value={selectedCountry} onChange={(event) => updateCountry(event.target.value)} className="mt-2 w-full rounded-md border border-[rgba(122,24,61,0.14)] bg-[#FFF8EE] px-3 py-2 text-sm font-semibold text-[#3A2417] outline-none">
                  {countries.map((country) => (
                    <option key={country.code} value={country.name}>{country.name}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-bold uppercase tracking-[0.16em] text-karariGold">
                Currency
                <select value={selectedCurrency} onChange={(event) => updateCurrency(event.target.value)} className="mt-2 w-full rounded-md border border-[rgba(122,24,61,0.14)] bg-[#FFF8EE] px-3 py-2 text-sm font-semibold text-[#3A2417] outline-none">
                  {currencies.map((currency) => (
                    <option key={currency.code} value={currency.code}>{currency.symbol} {currency.label}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <Link href="/sign-in" onClick={() => setActiveHeaderDropdown(null)} className="inline-flex items-center gap-2 rounded-md bg-[#FFF8EE] px-3 py-2 text-sm font-semibold text-[#3A2417]">
                <User className="h-4 w-4" />
                Sign In
              </Link>
              <Link href="/account" onClick={() => setActiveHeaderDropdown(null)} className="inline-flex items-center gap-2 rounded-md bg-[#FFF8EE] px-3 py-2 text-sm font-semibold text-[#3A2417]">
                <PackageCheck className="h-4 w-4" />
                My Account
              </Link>
              <button type="button" onClick={() => toggleHeaderDropdown("viewed")} className="inline-flex items-center gap-2 rounded-md bg-[#FFF8EE] px-3 py-2 text-sm font-semibold text-[#3A2417]">
                <Eye className="h-4 w-4" />
                Recently Viewed
              </button>
              <a href={createWhatsAppUrl({ product: null })} className="inline-flex items-center gap-2 rounded-md bg-wine px-3 py-2 text-sm font-semibold text-white">
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
            </div>
            <div className="mt-4 border-t border-[rgba(122,24,61,0.12)] pt-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-karariGold">Collections</p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {categories.map((category) => (
                  <a
                    key={category.id}
                    href={category.href}
                    onClick={() => setActiveHeaderDropdown(null)}
                    className="min-h-11 rounded-md border border-[rgba(122,24,61,0.14)] bg-[#FFF8EE] px-3 py-2 text-sm font-bold text-[#7A183D] transition hover:border-[#C9962D] hover:bg-white"
                  >
                    {category.name}
                  </a>
                ))}
              </div>
            </div>
          </motion.div>
        ) : null}

        {["wishlist", "viewed"].includes(activeHeaderDropdown) ? (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-3 rounded-lg border border-[rgba(122,24,61,0.14)] bg-white p-3 shadow-boutique lg:hidden">
            {activeHeaderDropdown === "wishlist" ? (
              wishlistItems.length ? (
                <p className="rounded-md bg-[#FFF8EE] p-3 text-sm font-medium text-[#3A2417]/65">Wishlist items are saved locally for the upcoming wishlist page.</p>
              ) : (
                <p className="rounded-md bg-[#FFF8EE] p-3 text-sm font-medium text-[#3A2417]/65">Your wishlist is empty.</p>
              )
            ) : null}
            {activeHeaderDropdown === "viewed" ? <RecentlyViewedList products={recentlyViewed} onViewProduct={onViewProduct} /> : null}
          </motion.div>
        ) : null}
      </div>
      </header>
      <CartDrawer open={cartDrawerOpen} onClose={() => setCartDrawerOpen(false)} />
      {campaignActive ? (
        <div className="border-t border-antiqueGold/20 bg-wine px-4 py-2 text-center text-xs font-semibold uppercase tracking-[0.16em] text-white">
          {getCampaignOfferLabel(seasonalCampaign)}
        </div>
      ) : null}
    </>
  );
}

function SectionHeading({ eyebrow, title, description, align = "center" }) {
  return (
    <div className={align === "left" ? "max-w-2xl" : "mx-auto max-w-3xl text-center"}>
      <p className="text-xs font-bold uppercase tracking-[0.28em] text-karariGold">{eyebrow}</p>
      <h2 className="mt-3 font-display text-3xl font-semibold text-charcoal sm:text-4xl">{title}</h2>
      {description ? <p className="mt-4 text-base leading-7 text-ink/65">{description}</p> : null}
    </div>
  );
}

const heroSlides = [
  {
    key: "raksha-bandhan",
    image: "/hero/raksha-bandhan-2026.png",
    headline: "Raksha Bandhan Collection 2026 is Live",
    headlineLines: ["Raksha Bandhan", "Collection 2026", "is Live"],
    subheadline: "Celebrate the bond of love with Karari Beauty",
    description: "Premium rakhis, gift hampers, sweets and festive gifts delivered with care.",
    primaryCta: { label: "Shop Rakhi Collection", href: "#products" },
    secondaryCta: { label: "Explore Gift Hampers", href: "#gifts" },
    position: "object-[62%_center] sm:object-center",
    showCountdown: true
  },
  {
    key: "all-occasion",
    image: "/hero/all-occasion-gifting.png",
    eyebrow: "Karari Beauty gifting edit",
    headline: "Gifts That Speak from the Heart",
    headlineLines: ["Gifts That Speak", "from the Heart"],
    subheadline: "Every occasion. Every emotion.",
    description: "Jewellery, bangles, handbags, watches and thoughtful gifts for your loved ones.",
    primaryCta: { label: "Explore Collections", href: "#categories" },
    secondaryCta: { label: "Shop Gift Items", href: "#products" },
    position: "object-[66%_center] sm:object-center"
  }
];

function HeroCarousel({ campaignActive, seasonalCampaign = localSeasonalCampaign }) {
  const [activeSlide, setActiveSlide] = useState(0);
  const campaignOfferLabel = getCampaignOfferLabel(seasonalCampaign);
  const slides = useMemo(() => {
    const nextSlides = campaignActive ? heroSlides : heroSlides.filter((item) => item.key !== "raksha-bandhan");
    return nextSlides.map((item) => (item.key === "raksha-bandhan" ? { ...item, eyebrow: campaignOfferLabel } : item));
  }, [campaignActive, campaignOfferLabel]);
  const slide = slides[activeSlide] || slides[0];

  useEffect(() => {
    setActiveSlide(0);
  }, [campaignActive]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % slides.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [slides.length]);

  return (
    <section
      id="top"
      className="relative overflow-hidden bg-[#FFF8EE] px-3 py-3 sm:px-5 sm:py-4 lg:px-8"
    >
      <div className="relative mx-auto max-w-[1440px] overflow-hidden rounded-2xl border border-[rgba(122,24,61,0.12)] bg-[#FFF8EE] shadow-boutique">
        <div className="relative h-[clamp(25rem,62vh,30rem)] sm:h-[31.5rem] lg:h-[clamp(31.25rem,56vh,35rem)]">
          <AnimatePresence mode="wait">
            <motion.div
              key={slide.key}
              initial={{ opacity: 0, scale: 1.015 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.01 }}
              transition={{ duration: 0.85, ease: "easeOut" }}
              className="absolute inset-0"
            >
              <Image
                src={slide.image}
                alt={slide.headline}
                fill
                priority={activeSlide === 0}
                sizes="100vw"
                className={`object-cover ${slide.position}`}
              />
            </motion.div>
          </AnimatePresence>

          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,248,238,0.98)_0%,rgba(255,248,238,0.9)_42%,rgba(252,231,236,0.34)_62%,rgba(255,248,238,0)_84%)] sm:bg-[linear-gradient(90deg,rgba(255,248,238,0.97)_0%,rgba(255,248,238,0.9)_30%,rgba(252,231,236,0.38)_48%,rgba(255,248,238,0)_70%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,248,238,0.18)_0%,rgba(255,248,238,0)_28%,rgba(255,248,238,0.42)_100%)] sm:hidden" />

          <div className="relative z-10 flex h-full items-center px-4 py-5 pb-12 sm:px-8 sm:py-7 sm:pb-14 lg:px-14 lg:py-8 lg:pb-14">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${slide.key}-copy`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.55, ease: "easeOut" }}
                className={`${slide.showCountdown ? "pt-2 sm:pt-4" : ""} max-w-[25rem] sm:max-w-[31rem] lg:max-w-[34rem]`}
              >
                <div className={`${slide.showCountdown ? "mt-1 sm:mt-2" : ""} inline-flex max-w-full items-center gap-2 rounded-full border border-[rgba(201,150,45,0.32)] bg-white/78 px-3 py-1.5 text-[0.58rem] font-bold uppercase tracking-[0.1em] text-[#7A183D] shadow-soft backdrop-blur sm:px-3.5 sm:text-[0.7rem] sm:tracking-[0.14em] lg:text-xs`}>
                  <Sparkles className="h-3.5 w-3.5 text-[#C9962D]" />
                  {slide.eyebrow}
                </div>
                <h1 className="mt-3 font-display text-[1.95rem] font-semibold leading-[1.04] text-[#3A2417] sm:mt-[1.125rem] sm:text-[2.55rem] lg:text-[3.2rem] xl:text-[3.35rem]">
                  {slide.headlineLines.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </h1>
                <p className="mt-2 text-sm font-semibold text-[#7A183D] sm:mt-3 sm:text-base lg:text-lg">{slide.subheadline}</p>
                <p className="mt-2 max-w-[21rem] text-[0.82rem] leading-5 text-[#3A2417]/72 sm:mt-2.5 sm:max-w-lg sm:text-base sm:leading-6 lg:leading-7">
                  {slide.description}
                </p>

                {slide.showCountdown ? (
                  <div className="mt-3 max-w-[16rem] min-[390px]:max-w-[18rem] sm:mt-[1.125rem] sm:max-w-[22rem]">
                    <Countdown campaign={seasonalCampaign} />
                  </div>
                ) : null}

                <div className={`${slide.showCountdown ? "mt-3 sm:mt-[1.125rem]" : "mt-4 sm:mt-5"} flex max-w-[19rem] flex-col gap-2 sm:max-w-none sm:flex-row sm:gap-3`}>
                  <a href={slide.primaryCta.href} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#7A183D] px-4 py-2.5 text-sm font-bold text-white shadow-soft transition hover:bg-[#3A2417] sm:min-h-12 sm:px-6">
                    {slide.primaryCta.label}
                    <ArrowRight className="h-4 w-4" />
                  </a>
                  <a href={slide.secondaryCta.href} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[rgba(122,24,61,0.18)] bg-white/78 px-4 py-2.5 text-sm font-bold text-[#3A2417] shadow-soft backdrop-blur transition hover:border-[#C9962D] hover:text-[#7A183D] sm:min-h-12 sm:px-6">
                    {slide.secondaryCta.label}
                  </a>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-[rgba(122,24,61,0.1)] bg-white/78 px-3 py-2 shadow-soft backdrop-blur">
          {slides.map((item, index) => (
            <button
              type="button"
              key={item.key}
              onClick={() => setActiveSlide(index)}
              className={`h-2.5 rounded-full transition-all ${activeSlide === index ? "w-8 bg-[#7A183D]" : "w-2.5 bg-[#C9962D]/45 hover:bg-[#C9962D]"}`}
              aria-label={`Show ${item.headline}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function CategorySection({ selectedCategory, categories = localCategories }) {
  return (
    <section id="collections" className="relative overflow-hidden bg-[linear-gradient(180deg,#FFF8EE_0%,#FCE7EC_100%)] px-3 py-12 sm:px-6 sm:py-16 lg:px-8">
      <span id="categories" className="absolute -top-28" aria-hidden="true" />
      <div className="absolute inset-x-0 top-0 h-px bg-[rgba(122,24,61,0.14)]" />
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="Boutique Range"
          title="All Karari Beauty Categories"
          description="A curated showcase for everyday boutique purchases, gifting needs and seasonal celebrations."
        />
        <div className="mt-8 grid grid-cols-2 gap-3 sm:mt-10 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {categories.map((category) => (
            <motion.a
              href={category.href}
              key={category.id}
              whileHover={{ y: -5 }}
              className={`group overflow-hidden rounded-lg border bg-white/74 text-left shadow-soft backdrop-blur transition hover:border-[#C9962D] hover:shadow-boutique ${
                selectedCategory?.id === category.id ? "border-[#C9962D] ring-2 ring-[#C9962D]/20" : "border-[rgba(122,24,61,0.14)]"
              }`}
            >
              <div className="relative overflow-hidden">
                <div className="relative aspect-[1.1/1] sm:aspect-[4/3]">
                  <Image
                    src={category.image}
                    alt={category.name}
                    fill
                    sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                    className="object-cover transition duration-700 group-hover:scale-105"
                  />
                </div>
                <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_48%,rgba(58,36,23,0.46)_100%)]" />
                <span className="absolute left-2 top-2 rounded-full border border-white/45 bg-[#FFF8EE]/88 px-2 py-1 text-[0.56rem] font-bold uppercase tracking-[0.08em] text-[#7A183D] shadow-soft sm:left-3 sm:top-3 sm:px-3 sm:text-[0.68rem] sm:tracking-[0.14em]">
                  {category.productCountLabel}
                </span>
              </div>
              <div className="p-3 sm:p-4">
                <div className="flex items-center justify-between gap-2 sm:gap-3">
                  <h3 className="font-display text-lg font-semibold leading-5 text-[#7A183D] sm:text-xl">{category.name}</h3>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[rgba(201,150,45,0.32)] bg-[#FFF8EE] text-[#C9962D] transition group-hover:border-[#7A183D] group-hover:bg-[#7A183D] group-hover:text-[#FFF8EE] sm:h-8 sm:w-8">
                    <ChevronRight className="h-4 w-4" />
                  </span>
                </div>
                <p className="mt-1.5 line-clamp-2 min-h-10 text-xs leading-5 text-[#3A2417]/66 sm:mt-2 sm:text-sm">{category.description}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[#C9962D] sm:mt-4 sm:text-xs sm:tracking-[0.16em]">
                  Explore
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductSection({ onView, seasonal, selectedCategory, onClearCategory, products = localProducts }) {
  const [sortBy, setSortBy] = useState("featured");
  const [wishlistIds, setWishlistIds] = useState([]);
  const [toast, setToast] = useState("");
  const featuredProducts = useMemo(
    () => products.filter((product) => ["Rakhi", "Gift Hampers", "Gift Items"].includes(product.category)),
    [products]
  );

  useEffect(() => {
    setWishlistIds(getWishlistItems());
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(""), 1800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const baseList = useMemo(() => {
    if (selectedCategory) return products.filter((product) => product.category === selectedCategory.name);
    if (seasonal) {
      const featuredIds = new Set(featuredProducts.map((featured) => featured.id));
      return products.filter((product) => product.isFeatured || featuredIds.has(product.id));
    }
    return products;
  }, [featuredProducts, products, seasonal, selectedCategory]);

  const list = useMemo(() => {
    const items = [...baseList];
    if (sortBy === "price-low") return items.sort((a, b) => a.price - b.price);
    if (sortBy === "price-high") return items.sort((a, b) => b.price - a.price);
    if (sortBy === "newest") {
      return items.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }
    return items;
  }, [baseList, sortBy]);

  const sectionTitle = selectedCategory ? `${selectedCategory.name} Collection` : "Featured Boutique Products";
  const sectionDescription = selectedCategory
    ? selectedCategory.description
    : "Explore curated picks from Karari Beauty's jewellery, gifting and festive collections.";
  const productCountText = selectedCategory
    ? `Showing ${list.length} ${selectedCategory.name} ${list.length === 1 ? "product" : "products"}`
    : `Showing ${list.length} ${list.length === 1 ? "product" : "products"}`;

  const notify = (message) => setToast(message);

  const addToCart = (product) => {
    addCartItem(product);
    notify("Added to cart");
  };

  const buyNow = (product) => {
    setBuyNowItem(product, 1);
    window.location.assign("/checkout?mode=buy-now");
  };

  const toggleWishlist = (product) => {
    const nextWishlist = toggleWishlistItem(product);
    setWishlistIds(nextWishlist.items);
    notify(nextWishlist.isWished ? "Added to wishlist" : "Removed from wishlist");
  };

  return (
    <section id="products" className="relative bg-[linear-gradient(180deg,#FFF8EE_0%,#FCE7EC_100%)] px-3 py-12 sm:px-6 sm:py-16 lg:px-8">
      <AnimatePresence>
        {toast ? (
          <motion.div
            key={toast}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full border border-[rgba(122,24,61,0.16)] bg-white px-5 py-3 text-sm font-bold text-[#7A183D] shadow-boutique"
          >
            {toast}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <SectionHeading align="left" eyebrow={selectedCategory ? "Selected Category" : "Product Showcase"} title={sectionTitle} description={sectionDescription} />
            {selectedCategory ? (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[rgba(122,24,61,0.14)] bg-white/74 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[#7A183D] shadow-soft">
                  Showing: {selectedCategory.name}
                </span>
                <button type="button" onClick={onClearCategory} className="rounded-full border border-[rgba(201,150,45,0.34)] bg-[#FFF8EE] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[#C9962D] transition hover:border-[#7A183D] hover:text-[#7A183D]">
                  Clear Filter
                </button>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-[rgba(122,24,61,0.14)] bg-white/72 p-3 shadow-soft sm:flex-row sm:items-center">
            <p className="text-sm font-bold text-[#3A2417]/70">{productCountText}</p>
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
        </div>

        {list.length ? (
          <motion.div className="mt-8 grid grid-cols-2 gap-3 sm:mt-10 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
            <AnimatePresence mode="popLayout">
              {list.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onView={onView}
                  onAddToCart={addToCart}
                  onBuyNow={buyNow}
                  onToggleWishlist={toggleWishlist}
                  wished={wishlistIds.includes(product.id)}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <div className="mt-10 rounded-lg border border-[rgba(122,24,61,0.14)] bg-white/82 p-8 text-center shadow-soft">
            <p className="font-display text-2xl font-semibold text-wine">Products will be added soon</p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#3A2417]/66">We're curating this collection for Karari Beauty.</p>
            <button type="button" onClick={onClearCategory} className="mt-5 rounded-md bg-wine px-5 py-3 text-sm font-bold text-white transition hover:bg-charcoal">
              View All Products
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
function GiftCombos({ onView, products = localProducts }) {
  return (
    <section id="gifts" className="bg-white px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="Combos and Hampers"
          title="Gift Combos and Premium Hampers"
          description="Seasonal bundles prepared for Rakhi, family gifting and premium festive presentation."
        />
        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {giftCombos.map((combo) => (
            <motion.article key={combo.title} whileHover={{ y: -5 }} className="overflow-hidden rounded-lg border border-black/8 bg-silk shadow-soft">
              <div className="relative aspect-[16/10] bg-cream">
                <Image
                  src={combo.image}
                  alt={combo.title}
                  fill
                  sizes="(min-width: 1024px) 33vw, 100vw"
                  className="object-cover"
                />
              </div>
              <div className="p-5">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-karariGold">Starts at {formatCurrency(combo.price)}</p>
                <h3 className="mt-2 font-display text-2xl font-semibold text-charcoal">{combo.title}</h3>
                <ul className="mt-4 space-y-2">
                  {combo.includes.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm font-medium text-ink/68">
                      <Check className="h-4 w-4 text-karariGold" />
                      {item}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => onView(products.find((product) => product.category === "Gift Hampers") || products[0])}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-charcoal px-4 py-3 text-sm font-bold text-white transition hover:bg-wine"
                >
                  View Hamper Inquiry
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

function FrequentlyBoughtTogetherSection({ onView, products = localProducts }) {
  const group = frequentlyBoughtTogether[0];
  const items = group.productIds.map((id) => products.find((product) => product.id === id)).filter(Boolean);

  return (
    <section className="bg-silk px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl rounded-xl border border-antiqueGold/20 bg-white p-4 shadow-boutique sm:p-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <SectionHeading
            align="left"
            eyebrow="Bundle Builder"
            title="Frequently Bought Together"
            description="A clean companion-purchase UI inspired by ecommerce behavior, adapted for WhatsApp ordering."
          />
          <a href={createWhatsAppUrl({ product: items[0], note: `Bundle inquiry: ${group.title}` })} className="inline-flex items-center justify-center gap-2 rounded-md bg-wine px-5 py-3 text-sm font-bold text-white shadow-soft hover:bg-charcoal">
            <MessageCircle className="h-4 w-4" />
            Ask for Bundle
          </a>
        </div>
        <div className="mt-8 grid gap-4 lg:grid-cols-4">
          {items.map((item) => (
            <button key={item.id} type="button" onClick={() => onView(item)} className="flex gap-4 rounded-lg border border-black/8 bg-silk p-3 text-left transition hover:-translate-y-1 hover:shadow-soft">
              <span className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md bg-cream">
                <Image src={item.image} alt={item.name} fill sizes="6rem" className="object-cover" />
              </span>
              <div>
                <p className="line-clamp-2 text-sm font-bold text-charcoal">{item.name}</p>
                <p className="mt-2 text-sm font-bold text-rose">{formatCurrency(item.price)}</p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-karariGold">Selected</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

const footerTrustItems = [
  { label: "Secure Order Support", icon: ShieldCheck },
  { label: "Delivery Across India", icon: Truck },
  { label: "Premium Packaging", icon: PackageCheck },
  { label: "International Bulk Order Support", icon: Globe2 }
];

const footerCareLinks = [
  { label: "About Karari", href: "#about" },
  { label: "Contact Us", href: "#contact" },
  { label: "International Orders", href: "#international-orders" },
  { label: "Order Support", href: "#support" },
  { label: "Return & Exchange", href: "#return-exchange" },
  { label: "Privacy Policy", href: "#privacy" },
  { label: "Terms & Conditions", href: "#terms" }
];

function getSettingsValue(siteSettings, section, field, fallback = "") {
  return siteSettings?.[section]?.[field] || fallback;
}

function getSafeLogoUrl(siteSettings) {
  const logoUrl = getSettingsValue(siteSettings, "business", "logoUrl", businessSettings.logoUrl);
  return logoUrl || businessSettings.logoUrl;
}

function getWhatsAppContactUrl(siteSettings) {
  const number = getSettingsValue(siteSettings, "contact", "whatsappNumber", businessSettings.whatsappNumber).replace(/[^\d]/g, "");
  const businessName = getSettingsValue(siteSettings, "business", "name", businessSettings.name);
  return `https://wa.me/${number}?text=${encodeURIComponent(`Hi ${businessName}, I would like to know more about your products.`)}`;
}

function BrandLogo({ src, alt, className, width, height, priority = false }) {
  const isLocalAsset = String(src || "").startsWith("/");
  if (!isLocalAsset) {
    return <img src={src} alt={alt} width={width} height={height} className={className} loading={priority ? "eager" : "lazy"} />;
  }

  return <Image src={src} alt={alt} width={width} height={height} priority={priority} className={className} />;
}

function FooterTrustStrip() {
  return (
    <section className="border-y border-[rgba(122,24,61,0.14)] bg-[linear-gradient(90deg,#FFF8EE_0%,#FCE7EC_48%,#FFF8EE_100%)] px-4 py-2 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-2 lg:grid-cols-4">
        {footerTrustItems.map(({ label, icon: Icon }) => (
          <div key={label} className="flex items-center gap-2.5 rounded-md border border-[rgba(122,24,61,0.12)] bg-white/64 px-2.5 py-2 shadow-soft backdrop-blur sm:px-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FFF8EE] text-[#C9962D] sm:h-8 sm:w-8">
              <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </span>
            <p className="text-xs font-bold leading-4 text-[#3A2417] sm:text-sm">{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function FooterLinkColumn({ title, links, variant = "list" }) {
  const isChipList = variant === "chips";

  return (
    <div>
      <h3 className="font-display text-lg font-semibold text-[#7A183D]">{title}</h3>
      <ul className={isChipList ? "mt-3 flex flex-wrap gap-2" : "mt-3 space-y-1.5"}>
        {links.map((link) => (
          <li key={link.label}>
            <a
              href={link.href}
              className={
                isChipList
                  ? "inline-flex min-h-9 items-center rounded-full border border-[rgba(122,24,61,0.14)] bg-white/62 px-3 py-1.5 text-xs font-bold text-[#7A183D] shadow-soft transition hover:border-[#7A183D] hover:bg-[#7A183D] hover:text-[#FFF8EE] sm:min-h-0"
                  : "inline-flex min-h-9 items-center text-sm font-medium text-[#3A2417]/68 underline-offset-4 transition hover:text-[#7A183D] hover:underline sm:min-h-0"
              }
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SupportItem({ icon: Icon, title, children }) {
  return (
    <div id={title === "International Orders" ? "international-orders" : title === "Return & Exchange" ? "return-exchange" : undefined} className="rounded-md border border-[rgba(122,24,61,0.12)] bg-white/55 p-2.5">
      <div className="flex items-center gap-2 text-sm font-bold text-[#7A183D]">
        <Icon className="h-4 w-4 text-[#C9962D]" />
        {title}
      </div>
      <div className="mt-1 text-xs leading-5 text-[#3A2417]/70 sm:text-sm">{children}</div>
    </div>
  );
}

function Footer({ categories = localCategories, siteSettings }) {
  const footerShopLinks = categories.map((category) => ({ label: category.name, href: category.href }));
  const businessName = getSettingsValue(siteSettings, "business", "name", businessSettings.name);
  const businessTagline = getSettingsValue(siteSettings, "business", "tagline", businessSettings.tagline);
  const shortDescription = getSettingsValue(siteSettings, "business", "shortDescription", businessSettings.shortDescription);
  const logoUrl = getSafeLogoUrl(siteSettings);
  const address = getSettingsValue(siteSettings, "contact", "address", businessSettings.address);
  const email = getSettingsValue(siteSettings, "contact", "email", businessSettings.email);
  const phoneNumber = getSettingsValue(siteSettings, "contact", "phoneNumber", businessSettings.phoneNumber);
  const mapsUrl = getSettingsValue(siteSettings, "contact", "mapsUrl", businessSettings.mapsUrl);
  const timings = getSettingsValue(siteSettings, "contact", "timings", businessSettings.timings);
  const footerWhatsappUrl = getWhatsAppContactUrl(siteSettings);
  const footerSocialLinks = [
    { label: "Instagram", href: getSettingsValue(siteSettings, "social", "instagramUrl", businessSettings.instagramUrl), icon: Instagram },
    { label: "Facebook", href: getSettingsValue(siteSettings, "social", "facebookUrl", businessSettings.facebookUrl), icon: Facebook },
    { label: "WhatsApp", href: footerWhatsappUrl, icon: MessageCircle }
  ].filter((link) => link.href);

  return (
    <footer id="footer" className="bg-[linear-gradient(180deg,#FFF8EE_0%,#FCE7EC_100%)] px-3 pb-20 pt-6 sm:px-6 sm:pb-7 lg:px-8 lg:pb-6">
      <div className="mx-auto max-w-7xl">
        <div className="grid items-start gap-7 md:grid-cols-2 lg:grid-cols-[1.2fr_0.95fr_0.72fr_1.45fr] lg:gap-7">
          <div id="contact">
            <div className="flex items-center gap-3">
              <BrandLogo src={logoUrl} alt={`${businessName} logo`} width={44} height={44} className="h-11 w-11 rounded-full border border-[rgba(201,150,45,0.35)] object-cover shadow-soft" />
              <div>
                <p className="font-display text-xl font-semibold text-[#3A2417]">{businessName}</p>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#C9962D]">{businessTagline}</p>
              </div>
            </div>
            <p className="mt-3 max-w-xs text-sm font-medium leading-5 text-[#3A2417]/70">
              {shortDescription}
            </p>

            <div className="mt-3 space-y-1.5 text-sm leading-5 text-[#3A2417]/72">
              <p className="flex gap-3">
                <MapPin className="mt-1 h-4 w-4 shrink-0 text-[#C9962D]" />
                <span>{address}</span>
              </p>
              <p className="flex gap-3">
                <Mail className="mt-1 h-4 w-4 shrink-0 text-[#C9962D]" />
                <a href={`mailto:${email}`} className="cursor-pointer underline-offset-4 transition hover:text-[#7A183D] hover:underline">{email}</a>
              </p>
              <p className="flex gap-3">
                <MessageCircle className="mt-1 h-4 w-4 shrink-0 text-[#C9962D]" />
                <a href={footerWhatsappUrl} target="_blank" rel="noopener noreferrer" className="cursor-pointer underline-offset-4 transition hover:text-[#7A183D] hover:underline">WhatsApp: {phoneNumber}</a>
              </p>
            </div>

            <div className="mt-3">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#C9962D]">Connect with us</p>
              <div className="mt-2 flex items-center gap-2">
                {footerSocialLinks.map(({ label, href, icon: Icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[rgba(122,24,61,0.16)] bg-white/60 text-[#7A183D] shadow-soft transition hover:-translate-y-0.5 hover:border-[#C9962D] hover:bg-[#7A183D] hover:text-[#FFF8EE] sm:h-9 sm:w-9"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            </div>

            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-md border border-[rgba(122,24,61,0.18)] bg-white/70 px-3.5 py-2 text-sm font-bold text-[#7A183D] shadow-soft transition hover:border-[#C9962D] hover:text-[#3A2417] hover:underline"
            >
              Get Directions
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>

          <FooterLinkColumn title="Shop" links={footerShopLinks} variant="chips" />
          <FooterLinkColumn title="Customer Care" links={footerCareLinks} />

          <div>
            <h3 id="support" className="font-display text-lg font-semibold text-[#7A183D]">Support</h3>
            <div className="mt-3 grid gap-2 lg:grid-cols-2">
              <SupportItem icon={Truck} title="Delivery">
                Delivery available across India.
              </SupportItem>
              <SupportItem icon={Globe2} title="International Orders">
                Bulk international order support available for 25+ products.
              </SupportItem>
              <SupportItem icon={PackageCheck} title="Return & Exchange">
                Eligible products can be returned or exchanged within 7 days, subject to store confirmation.
              </SupportItem>
              <SupportItem icon={Clock} title="Business Timings">
                {timings}
              </SupportItem>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-1 border-t border-[rgba(122,24,61,0.14)] pt-3 text-center text-[0.7rem] font-medium text-[#3A2417]/58 sm:flex-row sm:items-center sm:justify-between sm:text-left sm:text-xs">
          <p>{"\u00A9"} 2026 {businessName}. All rights reserved.</p>
          <p>Website by Rajratan Digital {"\u00B7"} Developed by Mithil Mohite</p>
        </div>
      </div>
    </footer>
  );
}

export default function HomeExperience({
  campaignActive,
  categories = localCategories,
  products = localProducts,
  seasonalCampaign = localSeasonalCampaign,
  siteSettings
}) {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => {
    const syncRecentlyViewed = () => setRecentlyViewed(getRecentlyViewed(products));

    syncRecentlyViewed();
    window.addEventListener("recentlyViewed:updated", syncRecentlyViewed);
    window.addEventListener("storage", syncRecentlyViewed);

    return () => {
      window.removeEventListener("recentlyViewed:updated", syncRecentlyViewed);
      window.removeEventListener("storage", syncRecentlyViewed);
    };
  }, [products]);

  const openProduct = (product) => {
    setSelectedProduct(product);
    setRecentlyViewed(addRecentlyViewed(product, products));
  };

  return (
    <main className="min-h-screen bg-silk">
      <Header campaignActive={campaignActive} onViewProduct={openProduct} recentlyViewed={recentlyViewed} categories={categories} products={products} seasonalCampaign={seasonalCampaign} siteSettings={siteSettings} />
      <HeroCarousel campaignActive={campaignActive} seasonalCampaign={seasonalCampaign} />
      <CategorySection selectedCategory={selectedCategory} categories={categories} />
      <ProductSection onView={openProduct} seasonal={campaignActive} selectedCategory={selectedCategory} onClearCategory={() => setSelectedCategory(null)} products={products} />
      {campaignActive ? (
        <>
          <GiftCombos onView={openProduct} products={products} />
          <FrequentlyBoughtTogetherSection onView={openProduct} products={products} />
        </>
      ) : null}
      <FooterTrustStrip />
      <Footer categories={categories} siteSettings={siteSettings} />
      <QuickViewModal product={selectedProduct} onClose={() => setSelectedProduct(null)} products={products} />
    </main>
  );
}
