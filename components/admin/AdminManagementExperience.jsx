"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpDown, Check, ChevronDown, Eye, Loader2, Pencil, Plus, Power, Search, Trash2, X } from "lucide-react";
import AdminAuthGate from "@/components/admin/AdminAuthGate";
import AdminBadge from "@/components/admin/AdminBadge";
import AdminLayoutShell from "@/components/admin/AdminLayoutShell";
import { generateSku, generateSlug } from "@/lib/productIdentifiers";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

const resourceConfig = {
  products: {
    title: "Products",
    description: "Create, edit, upload images and manage boutique product visibility.",
    endpoint: "/api/admin/products",
    searchPlaceholder: "Search product name, slug or SKU",
    emptyTitle: "No products found",
    emptyText: "Products will appear here after the catalog is seeded or connected.",
    defaultSort: "newest"
  },
  categories: {
    title: "Categories",
    description: "Create, edit and manage storefront collection categories.",
    endpoint: "/api/admin/categories",
    searchPlaceholder: "Search category name or slug",
    emptyTitle: "No categories found",
    emptyText: "Categories will appear here after setup.",
    defaultSort: "sort-order"
  },
  orders: {
    title: "Orders",
    description: "Manage customer order requests, status updates and internal timeline notes.",
    endpoint: "/api/admin/orders",
    searchPlaceholder: "Search order number, customer, phone or email",
    emptyTitle: "No live orders yet",
    emptyText: "Customer order requests will appear here after checkout is connected to Supabase.",
    defaultSort: "newest"
  },
  customers: {
    title: "Customers",
    description: "Manage customer details, order history and communication.",
    endpoint: "/api/admin/customers",
    searchPlaceholder: "Search name, phone, email, city or country",
    emptyTitle: "No customers yet",
    emptyText: "Customer profiles will appear here after checkout orders are created.",
    defaultSort: "newest"
  },
  campaigns: {
    title: "Campaigns",
    description: "Create, edit, activate and deactivate seasonal campaigns. Manage campaign dates, offers and featured categories.",
    endpoint: "/api/admin/campaigns",
    searchPlaceholder: "Search campaign name, slug or theme",
    emptyTitle: "No campaigns found",
    emptyText: "Seasonal campaigns will appear here after setup.",
    defaultSort: "newest"
  }
};

const emptyProductForm = {
  name: "",
  slug: "",
  sku: "",
  category_id: "",
  category_slug: "",
  category_name: "",
  price: "",
  original_price: "",
  discount_label: "",
  rating: "",
  badge: "",
  offer: "",
  image_url: "",
  short_description: "",
  description: "",
  tags: "",
  stock_status: "in_stock",
  is_active: true,
  is_featured: false,
  cod_available: false,
  sort_order: 0
};

const emptyCategoryForm = {
  name: "",
  slug: "",
  description: "",
  product_count_label: "",
  image_url: "",
  featured: false,
  is_active: true,
  sort_order: 0
};

const emptyCampaignForm = {
  name: "",
  slug: "",
  theme: "rakhi",
  is_active: false,
  start_date: "",
  end_date: "",
  hero_title: "",
  hero_subtitle: "",
  offer_label: "",
  featured_category_slugs: [],
  config: "{}"
};

const campaignThemes = ["rakhi", "diwali", "wedding", "navratri", "gifting", "custom"];

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
}

const orderStatusOptions = [
  { value: "new", label: "New Order", tone: "gold" },
  { value: "confirmed", label: "Confirmed", tone: "blue" },
  { value: "processing", label: "Processing", tone: "purple" },
  { value: "packed", label: "Packed", tone: "amber" },
  { value: "shipped", label: "Shipped", tone: "teal" },
  { value: "delivered", label: "Delivered", tone: "green" },
  { value: "cancelled", label: "Cancelled", tone: "red" }
];

const paymentStatusOptions = [
  { value: "pending", label: "Pending", tone: "gold" },
  { value: "pending_confirmation", label: "Pending Confirmation", tone: "gold" },
  { value: "paid", label: "Paid", tone: "green" },
  { value: "failed", label: "Failed", tone: "red" },
  { value: "cod_pending", label: "COD Pending", tone: "amber" },
  { value: "refunded", label: "Refunded", tone: "muted" }
];

const customerMessageTemplates = [
  {
    value: "received",
    label: "Order Received",
    text: "Hi {customerName}, thank you for your order request with Karari Beauty. Your order {orderNumber} has been received. Our team will confirm details shortly."
  },
  {
    value: "confirmed",
    label: "Order Confirmed",
    text: "Hi {customerName}, your Karari Beauty order {orderNumber} is confirmed. We will update you once it is packed."
  },
  {
    value: "packed",
    label: "Packed",
    text: "Hi {customerName}, your Karari Beauty order {orderNumber} has been packed and is ready for dispatch."
  },
  {
    value: "shipped",
    label: "Shipped",
    text: "Hi {customerName}, your Karari Beauty order {orderNumber} has been shipped. Thank you for shopping with Karari Beauty."
  },
  {
    value: "delivered",
    label: "Delivered",
    text: "Hi {customerName}, your Karari Beauty order {orderNumber} has been delivered. We hope you loved your purchase."
  },
  {
    value: "follow-up",
    label: "Custom Follow-up",
    text: "Hi {customerName}, this is Karari Beauty regarding your order {orderNumber}. We wanted to share an update with you."
  }
];

function getOrderStatusMeta(status) {
  return orderStatusOptions.find((item) => item.value === status) || { value: status, label: status || "New Order", tone: "muted" };
}

function getPaymentStatusMeta(status) {
  return paymentStatusOptions.find((item) => item.value === status) || { value: status, label: status || "Pending", tone: "muted" };
}

function formatCategoryLabel(value) {
  return String(value || "")
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function AdminSelect({ value, options, placeholder = "Select", onChange, disabled = false }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-[rgba(122,24,61,0.14)] bg-white px-3 text-left text-sm font-bold text-[#3A2417] shadow-soft outline-none transition hover:border-[#C9962D] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className={selected ? "truncate" : "truncate text-[#3A2417]/45"}>{selected?.label || placeholder}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-[#C9962D] transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div className="absolute left-0 right-0 z-[90] mt-2 max-h-64 overflow-y-auto rounded-xl border border-[rgba(122,24,61,0.14)] bg-white p-1 shadow-boutique">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={`flex min-h-10 w-full items-center justify-between gap-3 rounded-lg px-3 text-left text-sm font-bold transition ${
                option.value === value ? "bg-[#7A183D] text-white" : "text-[#3A2417] hover:bg-[#FFF8EE] hover:text-[#7A183D]"
              }`}
            >
              <span className="truncate">{option.label}</span>
              {option.value === value ? <Check className="h-4 w-4 shrink-0" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function normalizeWhatsAppPhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

function buildCustomerMessage(template, customer, order) {
  return template.text
    .replaceAll("{customerName}", customer.fullName || "there")
    .replaceAll("{orderNumber}", order?.orderNumber || "your order");
}

function productToForm(product) {
  return {
    name: product.name || "",
    slug: product.slug || "",
    sku: product.sku || "",
    category_id: product.categoryId || "",
    category_slug: product.categorySlug || "",
    category_name: product.category || "",
    price: product.price ?? "",
    original_price: product.originalPrice ?? "",
    discount_label: product.discountLabel || "",
    rating: product.rating || "",
    badge: product.badge || "",
    offer: product.offer || "",
    image_url: product.image || "",
    short_description: product.shortDescription || "",
    description: product.description || "",
    tags: Array.isArray(product.tags) ? product.tags.join(", ") : "",
    stock_status: product.stockStatus || "in_stock",
    is_active: product.isActive !== false,
    is_featured: Boolean(product.isFeatured),
    cod_available: Boolean(product.codAvailable),
    sort_order: product.sortOrder || 0
  };
}

function categoryToForm(category) {
  return {
    name: category.name || "",
    slug: category.slug || "",
    description: category.description || "",
    product_count_label: category.productCountLabel || "",
    image_url: category.image || "",
    featured: Boolean(category.featured),
    is_active: category.isActive !== false,
    sort_order: category.sortOrder || 0
  };
}

function campaignToForm(campaign) {
  return {
    name: campaign.name || "",
    slug: campaign.slug || "",
    theme: campaign.theme || "custom",
    is_active: Boolean(campaign.active || campaign.isActive),
    start_date: campaign.startDate || "",
    end_date: campaign.endDate || "",
    hero_title: campaign.heroTitle || "",
    hero_subtitle: campaign.heroSubtitle || "",
    offer_label: campaign.offerLabel || campaign.offer || "",
    featured_category_slugs: campaign.featuredCategorySlugs || campaign.featuredCategories || [],
    config: JSON.stringify(campaign.config || {}, null, 2)
  };
}

function formToPayload(form) {
  return {
    ...form,
    price: form.price,
    original_price: form.original_price,
    rating: form.rating,
    sort_order: form.sort_order,
    tags: form.tags,
    category_id: isUuid(form.category_id) ? form.category_id : null,
    category_slug: form.category_slug || null,
    category_name: form.category_name || null
  };
}

function categoryFormToPayload(form) {
  return {
    name: form.name,
    slug: form.slug,
    description: form.description,
    product_count_label: form.product_count_label,
    image_url: form.image_url,
    featured: form.featured,
    is_active: form.is_active,
    sort_order: form.sort_order
  };
}

function campaignFormToPayload(form) {
  let config = {};
  try {
    config = form.config ? JSON.parse(form.config) : {};
  } catch {
    throw new Error("Advanced visual settings must be valid JSON.");
  }

  return {
    name: form.name,
    slug: form.slug,
    theme: form.theme,
    is_active: form.is_active,
    start_date: form.start_date,
    end_date: form.end_date,
    hero_title: form.hero_title,
    hero_subtitle: form.hero_subtitle,
    offer_label: form.offer_label,
    featured_category_slugs: form.featured_category_slugs,
    config
  };
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(value) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function getCampaignStatus(campaign) {
  const active = Boolean(campaign.active || campaign.isActive);
  const now = new Date();
  const start = campaign.startDate ? new Date(`${campaign.startDate}T00:00:00`) : null;
  const end = campaign.endDate ? new Date(`${campaign.endDate}T23:59:59`) : null;

  if (active && (!start || now >= start) && (!end || now <= end)) return { label: "Live", tone: "green" };
  if (start && now < start) return { label: "Scheduled", tone: "gold" };
  if (end && now > end) return { label: "Ended", tone: "muted" };
  return { label: active ? "Active" : "Inactive", tone: active ? "wine" : "muted" };
}

function boolBadge(value, trueLabel = "Yes", falseLabel = "No") {
  return <AdminBadge tone={value ? "green" : "muted"}>{value ? trueLabel : falseLabel}</AdminBadge>;
}

function textForSearch(item, resource) {
  if (resource === "products") return [item.name, item.slug, item.sku, item.category, item.categorySlug].join(" ");
  if (resource === "categories") return [item.name, item.slug, item.description].join(" ");
  if (resource === "orders") return [item.orderNumber, item.customerName, item.customerPhone, item.customerEmail, item.status, item.paymentStatus, item.paymentReference].join(" ");
  if (resource === "customers") return [item.fullName, item.phone, item.email, item.city, item.country].join(" ");
  return [item.name, item.slug, item.theme, item.offer, item.offerLabel].join(" ");
}

function filterItems(items, resource, query, filters) {
  const normalizedQuery = query.trim().toLowerCase();

  return items.filter((item) => {
    const matchesQuery = !normalizedQuery || textForSearch(item, resource).toLowerCase().includes(normalizedQuery);
    if (!matchesQuery) return false;

    if (resource === "products") {
      if (filters.category && item.categorySlug !== filters.category) return false;
      if (filters.status === "active" && item.isActive === false) return false;
      if (filters.status === "featured" && !item.isFeatured) return false;
    }

    if (resource === "categories") {
      if (filters.status === "active" && item.isActive === false) return false;
      if (filters.status === "featured" && !item.featured) return false;
    }

    if (resource === "orders") {
      if (filters.status && item.status !== filters.status) return false;
      if (filters.orderType && item.orderType !== filters.orderType) return false;
    }

    if (resource === "campaigns") {
      if (filters.status === "active" && !(item.active || item.isActive)) return false;
      if (filters.status === "inactive" && (item.active || item.isActive)) return false;
    }

    return true;
  });
}

function sortItems(items, resource, sortBy) {
  const next = [...items];
  if (sortBy === "name") return next.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
  if (sortBy === "price-low") return next.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
  if (sortBy === "price-high") return next.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
  if (sortBy === "total-low") return next.sort((a, b) => Number(a.totalAmount || 0) - Number(b.totalAmount || 0));
  if (sortBy === "total-high") return next.sort((a, b) => Number(b.totalAmount || 0) - Number(a.totalAmount || 0));
  if (sortBy === "most-orders") return next.sort((a, b) => Number(b.totalOrders || 0) - Number(a.totalOrders || 0));
  if (sortBy === "highest-spent") return next.sort((a, b) => Number(b.totalSpent || 0) - Number(a.totalSpent || 0));
  if (sortBy === "recently-ordered") return next.sort((a, b) => new Date(b.lastOrderDate || 0) - new Date(a.lastOrderDate || 0));
  if (sortBy === "oldest") return next.sort((a, b) => new Date(a.createdAt || a.startDate || 0) - new Date(b.createdAt || b.startDate || 0));
  if (sortBy === "sort-order") return next.sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));
  if (resource === "orders" || sortBy === "newest") return next.sort((a, b) => new Date(b.createdAt || b.startDate || 0) - new Date(a.createdAt || a.startDate || 0));
  return next;
}

async function getAdminToken() {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) return "";
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || "";
}

function CategoryDetailDrawer({ category, onClose, onEdit, onToggleStatus, onDelete, canManageCategories, canHardDeleteCategories }) {
  if (!category) return null;

  const collectionPath = category.href || `/collections/${category.slug}`;
  const isActive = category.isActive !== false;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#3A2417]/35">
      <aside className="h-full w-full max-w-lg overflow-y-auto bg-[#FFF8EE] p-5 shadow-boutique">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#C9962D]">Category Details</p>
            <h2 className="mt-2 font-display text-3xl font-semibold text-[#7A183D]">{category.name}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-md border border-[rgba(122,24,61,0.14)] bg-white p-2 text-[#7A183D]" aria-label="Close category details">
            <X className="h-4 w-4" />
          </button>
        </div>

        <section className="mt-5 rounded-2xl border border-[rgba(122,24,61,0.12)] bg-white/72 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#C9962D]">Category Summary</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-[#FFF8EE] p-3">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#C9962D]">Slug</p>
              <p className="mt-1 break-words text-sm font-bold text-[#3A2417]">{category.slug}</p>
            </div>
            <div className="rounded-xl bg-[#FFF8EE] p-3">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#C9962D]">Status</p>
              <div className="mt-1">{boolBadge(isActive, "Active", "Inactive")}</div>
            </div>
            <div className="rounded-xl bg-[#FFF8EE] p-3">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#C9962D]">Featured on homepage</p>
              <div className="mt-1">{boolBadge(Boolean(category.featured), "Yes", "No")}</div>
            </div>
            <div className="rounded-xl bg-[#FFF8EE] p-3">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#C9962D]">Active products</p>
              <p className="mt-1 text-sm font-bold text-[#3A2417]">{category.productCount || 0}</p>
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-[rgba(122,24,61,0.12)] bg-white/72 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#C9962D]">Storefront Details</p>
          <div className="mt-3 space-y-3">
            <div className="rounded-xl bg-[#FFF8EE] p-3">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#C9962D]">Description</p>
              <p className="mt-1 text-sm font-semibold leading-6 text-[#3A2417]/72">{category.description || "No description added."}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-[#FFF8EE] p-3">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#C9962D]">Product count label</p>
                <p className="mt-1 text-sm font-bold text-[#3A2417]">{category.productCountLabel || `${category.productCount || 0} products`}</p>
              </div>
              <div className="rounded-xl bg-[#FFF8EE] p-3">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#C9962D]">Display order</p>
                <p className="mt-1 text-sm font-bold text-[#3A2417]">{category.sortOrder ?? 0}</p>
              </div>
            </div>
            <div className="rounded-xl bg-[#FFF8EE] p-3">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#C9962D]">Collection page</p>
              <a href={collectionPath} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex break-all text-sm font-bold text-[#7A183D] underline-offset-4 hover:underline">
                {collectionPath}
              </a>
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-[rgba(122,24,61,0.12)] bg-white/72 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#C9962D]">Category Image</p>
          {category.image ? (
            <>
              <img src={category.image} alt={category.name} className="mt-3 h-44 w-full rounded-xl object-cover" />
              <p className="mt-2 line-clamp-2 break-all text-xs font-semibold text-[#3A2417]/58">{category.image}</p>
            </>
          ) : (
            <p className="mt-3 rounded-xl bg-[#FFF8EE] p-3 text-sm font-semibold text-[#3A2417]/58">No category image added.</p>
          )}
        </section>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={() => onEdit(category)} disabled={!canManageCategories} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#7A183D] px-4 text-sm font-bold text-white transition hover:bg-[#5f102f] disabled:cursor-not-allowed disabled:opacity-55">
            <Pencil className="h-4 w-4" />
            Edit Category
          </button>
          <button type="button" onClick={() => onToggleStatus(category, !isActive)} disabled={!canManageCategories} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[rgba(122,24,61,0.16)] bg-white px-4 text-sm font-bold text-[#7A183D] transition hover:border-[#C9962D] disabled:cursor-not-allowed disabled:opacity-55">
            <Power className="h-4 w-4" />
            {isActive ? "Hide from website" : "Activate"}
          </button>
          <button type="button" onClick={() => onDelete(category)} disabled={!canHardDeleteCategories} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-rose-500/25 bg-rose-50 px-4 text-sm font-bold text-rose-700 transition hover:border-rose-500/45 disabled:cursor-not-allowed disabled:opacity-55">
            <Trash2 className="h-4 w-4" />
            Delete permanently
          </button>
          <button type="button" onClick={onClose} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[rgba(122,24,61,0.16)] bg-white px-4 text-sm font-bold text-[#3A2417]/72 transition hover:border-[#C9962D] hover:text-[#7A183D]">
            Close
          </button>
        </div>
      </aside>
    </div>
  );
}

function DetailsDrawer({ item, resource, gallery = [], onClose, onEdit, onDeactivate, onDelete, canManageProducts, canHardDeleteProducts, onEditCategory, onToggleCategoryStatus, onDeleteCategory, canManageCategories, canHardDeleteCategories }) {
  if (!item) return null;

  if (resource === "categories") {
    return <CategoryDetailDrawer category={item} onClose={onClose} onEdit={onEditCategory} onToggleStatus={onToggleCategoryStatus} onDelete={onDeleteCategory} canManageCategories={canManageCategories} canHardDeleteCategories={canHardDeleteCategories} />;
  }

  const entries = Object.entries(item).filter(([, value]) => value !== undefined && value !== null && value !== "");

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#3A2417]/35">
      <aside className="h-full w-full max-w-md overflow-y-auto bg-[#FFF8EE] p-5 shadow-boutique">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#C9962D]">Details</p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-[#7A183D]">{item.name || item.orderNumber || item.slug}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-md border border-[rgba(122,24,61,0.14)] bg-white p-2 text-[#7A183D]" aria-label="Close details">
            <X className="h-4 w-4" />
          </button>
        </div>
        {resource === "products" ? (
          <div className="mt-5 rounded-xl border border-[rgba(122,24,61,0.12)] bg-white/72 p-3">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#C9962D]">Images</p>
            {item.image ? <img src={item.image} alt={item.name} className="mt-3 h-40 w-full rounded-lg object-cover" /> : <p className="mt-3 text-sm font-semibold text-[#3A2417]/58">No main image set.</p>}
            <p className="mt-3 text-sm font-bold text-[#7A183D]">{gallery.length} gallery {gallery.length === 1 ? "image" : "images"}</p>
            {gallery.length ? (
              <div className="mt-3 grid grid-cols-4 gap-2">
                {gallery.map((image) => (
                  <img key={image.id} src={image.imageUrl} alt={image.altText || item.name} className="h-16 w-full rounded-md object-cover" />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="mt-5 space-y-3">
          {entries.map(([key, value]) => (
            <div key={key} className="rounded-xl border border-[rgba(122,24,61,0.12)] bg-white/72 p-3">
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[#C9962D]">{key}</p>
              <p className="mt-1 break-words text-sm font-semibold leading-6 text-[#3A2417]/72">{Array.isArray(value) ? value.join(", ") : typeof value === "object" ? JSON.stringify(value) : String(value)}</p>
            </div>
          ))}
        </div>
        {resource === "products" ? (
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={() => onEdit(item)} disabled={!canManageProducts} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#7A183D] px-4 text-sm font-bold text-white transition hover:bg-[#5f102f] disabled:cursor-not-allowed disabled:opacity-55">
              <Pencil className="h-4 w-4" />
              Edit Product
            </button>
            <button type="button" onClick={() => onDeactivate(item)} disabled={!canManageProducts || item.isActive === false} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[rgba(122,24,61,0.16)] bg-white px-4 text-sm font-bold text-[#7A183D] transition hover:border-[#C9962D] disabled:cursor-not-allowed disabled:opacity-55">
              <Power className="h-4 w-4" />
              Hide from website
            </button>
            <button type="button" onClick={() => onDelete(item)} disabled={!canHardDeleteProducts} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-rose-500/25 bg-rose-50 px-4 text-sm font-bold text-rose-700 transition hover:border-rose-500/45 disabled:cursor-not-allowed disabled:opacity-55">
              <Trash2 className="h-4 w-4" />
              Delete permanently
            </button>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

function ProductRows({ items, selectedProductIds, onToggleProductSelection, onView, onEdit, onDeactivate, onDelete, canManageProducts, canHardDeleteProducts }) {
  return items.map((item) => (
    <tr key={item.id || item.slug} className="border-b border-[rgba(122,24,61,0.08)]">
      <td className="px-3 py-3">
        <input
          type="checkbox"
          checked={selectedProductIds.includes(item.id)}
          onChange={() => onToggleProductSelection(item.id)}
          disabled={!canManageProducts}
          className="h-4 w-4 rounded border-[rgba(122,24,61,0.24)] text-[#7A183D]"
          aria-label={`Select ${item.name}`}
        />
      </td>
      <td className="px-3 py-3">
        <span className="relative block h-12 w-12 overflow-hidden rounded-lg bg-[#FFF8EE]">
          {item.image ? <img src={item.image} alt={item.name} className="h-full w-full object-cover" /> : null}
        </span>
      </td>
      <td className="px-3 py-3 font-bold text-[#3A2417]">{item.name}<span className="mt-1 block text-xs font-semibold text-[#3A2417]/48">{item.sku || item.slug}</span></td>
      <td className="px-3 py-3">{item.category || item.categorySlug}</td>
      <td className="px-3 py-3 font-bold text-[#7A183D]">{formatCurrency(item.price)}</td>
      <td className="px-3 py-3">{item.originalPrice ? formatCurrency(item.originalPrice) : "—"}</td>
      <td className="px-3 py-3">{item.discountLabel || "—"}</td>
      <td className="px-3 py-3">{boolBadge(item.isFeatured, "Featured", "No")}</td>
      <td className="px-3 py-3">{boolBadge(item.isActive !== false, "Active", "Inactive")}</td>
      <td className="px-3 py-3"><AdminBadge tone="gold">{item.stockStatus || "in_stock"}</AdminBadge></td>
      <td className="px-3 py-3">{formatDate(item.createdAt)}</td>
      <td className="px-3 py-3">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => onView(item)} className="inline-flex items-center gap-1 rounded-md border border-[rgba(122,24,61,0.14)] bg-white px-3 py-2 text-xs font-bold text-[#7A183D]"><Eye className="h-3.5 w-3.5" />View</button>
          <button type="button" onClick={() => onEdit(item)} disabled={!canManageProducts} className="inline-flex items-center gap-1 rounded-md border border-[rgba(122,24,61,0.14)] bg-[#FFF8EE] px-3 py-2 text-xs font-bold text-[#7A183D] disabled:cursor-not-allowed disabled:opacity-50"><Pencil className="h-3.5 w-3.5" />Edit</button>
          <button type="button" onClick={() => onDeactivate(item)} disabled={!canManageProducts || item.isActive === false} className="inline-flex items-center gap-1 rounded-md border border-[rgba(122,24,61,0.14)] bg-white px-3 py-2 text-xs font-bold text-[#7A183D] disabled:cursor-not-allowed disabled:opacity-50"><Power className="h-3.5 w-3.5" />Hide</button>
          <button type="button" onClick={() => onDelete(item)} disabled={!canHardDeleteProducts} className="inline-flex items-center gap-1 rounded-md border border-rose-500/25 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" />Delete</button>
        </div>
      </td>
    </tr>
  ));
}

function CategoryRows({ items, onView, onEdit, onDeactivate, onDelete, canManageCategories, canHardDeleteCategories }) {
  return items.map((item) => (
    <tr key={item.id || item.slug} className="border-b border-[rgba(122,24,61,0.08)]">
      <td className="px-3 py-3">
        <span className="relative block h-12 w-12 overflow-hidden rounded-lg bg-[#FFF8EE]">
          {item.image ? <img src={item.image} alt={item.name} className="h-full w-full object-cover" /> : null}
        </span>
      </td>
      <td className="px-3 py-3 font-bold text-[#3A2417]">{item.name}</td>
      <td className="px-3 py-3">{item.slug}</td>
      <td className="max-w-xs px-3 py-3 text-[#3A2417]/62">{item.description}</td>
      <td className="px-3 py-3">{item.productCountLabel || "-"}</td>
      <td className="px-3 py-3">{boolBadge(item.featured, "Featured", "No")}</td>
      <td className="px-3 py-3">{boolBadge(item.isActive !== false, "Active", "Inactive")}</td>
      <td className="px-3 py-3">{item.sortOrder ?? 0}</td>
      <td className="px-3 py-3 font-bold text-[#7A183D]">{item.productCount ?? 0}</td>
      <td className="px-3 py-3">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => onView(item)} className="rounded-md border border-[rgba(122,24,61,0.14)] bg-white px-3 py-2 text-xs font-bold text-[#7A183D]">View</button>
          <button type="button" onClick={() => onEdit(item)} disabled={!canManageCategories} className="rounded-md border border-[rgba(122,24,61,0.14)] bg-[#FFF8EE] px-3 py-2 text-xs font-bold text-[#7A183D] disabled:cursor-not-allowed disabled:opacity-50">Edit</button>
          <button type="button" onClick={() => onDeactivate(item)} disabled={!canManageCategories || item.isActive === false} className="rounded-md border border-[rgba(122,24,61,0.14)] bg-white px-3 py-2 text-xs font-bold text-[#7A183D] disabled:cursor-not-allowed disabled:opacity-50">Hide</button>
          <button type="button" onClick={() => onDelete(item)} disabled={!canHardDeleteCategories} className="rounded-md border border-rose-500/25 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 disabled:cursor-not-allowed disabled:opacity-50">Delete</button>
        </div>
      </td>
    </tr>
  ));
}

function OrderRows({ items, onView }) {
  return items.map((item) => (
    <tr key={item.id || item.orderNumber} className="border-b border-[rgba(122,24,61,0.08)]">
      <td className="px-3 py-3 font-bold text-[#7A183D]">{item.orderNumber}</td>
      <td className="px-3 py-3 font-bold text-[#3A2417]">{item.customerName || "—"}</td>
      <td className="px-3 py-3">{item.customerPhone || item.customerEmail || "—"}</td>
      <td className="px-3 py-3"><AdminBadge tone="gold">{item.orderType}</AdminBadge></td>
      <td className="px-3 py-3">{item.paymentPreference || "—"}</td>
      <td className="px-3 py-3 font-bold text-[#7A183D]">{formatCurrency(item.totalAmount)}</td>
      <td className="px-3 py-3"><AdminBadge tone="wine">{item.status}</AdminBadge></td>
      <td className="px-3 py-3">{formatDate(item.createdAt)}</td>
      <td className="px-3 py-3">{item.itemsCount || 0}</td>
      <td className="px-3 py-3"><button type="button" onClick={() => onView(item)} className="rounded-md border border-[rgba(122,24,61,0.14)] bg-white px-3 py-2 text-xs font-bold text-[#7A183D]">View</button></td>
    </tr>
  ));
}

function ManagedOrderRows({ items, onView }) {
  return items.map((item) => {
    const status = getOrderStatusMeta(item.status);
    const paymentStatus = getPaymentStatusMeta(item.paymentStatus);

    return (
      <tr key={item.id || item.orderNumber} className="border-b border-[rgba(122,24,61,0.08)]">
        <td className="px-3 py-3 font-bold text-[#7A183D]">{item.orderNumber}</td>
        <td className="px-3 py-3 font-bold text-[#3A2417]">{item.customerName || "-"}</td>
        <td className="px-3 py-3">{item.customerPhone || item.customerEmail || "-"}</td>
        <td className="px-3 py-3"><AdminBadge tone="gold">{item.orderType === "international" ? "International" : "Domestic"}</AdminBadge></td>
        <td className="px-3 py-3 font-bold text-[#7A183D]">{formatCurrency(item.totalAmount)}</td>
        <td className="px-3 py-3"><AdminBadge tone={status.tone}>{status.label}</AdminBadge></td>
        <td className="px-3 py-3"><AdminBadge tone={paymentStatus.tone}>{paymentStatus.label}</AdminBadge></td>
        <td className="px-3 py-3">{formatDate(item.createdAt)}</td>
        <td className="px-3 py-3">{item.itemsCount || 0}</td>
        <td className="px-3 py-3"><button type="button" onClick={() => onView(item)} className="rounded-md border border-[rgba(122,24,61,0.14)] bg-white px-3 py-2 text-xs font-bold text-[#7A183D]">Manage</button></td>
      </tr>
    );
  });
}

function CustomerRows({ items, onView }) {
  return items.map((item) => (
    <tr key={item.id || item.email || item.phone} className="border-b border-[rgba(122,24,61,0.08)]">
      <td className="px-3 py-3 font-bold text-[#3A2417]">
        {item.fullName || "Customer"}
        <span className="mt-1 block text-xs font-semibold text-[#3A2417]/48">{formatDate(item.createdAt)}</span>
      </td>
      <td className="px-3 py-3">{item.phone || "-"}</td>
      <td className="px-3 py-3">{item.email || "-"}</td>
      <td className="px-3 py-3">{[item.city, item.country].filter(Boolean).join(", ") || "-"}</td>
      <td className="px-3 py-3 font-bold text-[#7A183D]">{item.totalOrders || 0}</td>
      <td className="px-3 py-3 font-bold text-[#7A183D]">{formatCurrency(item.totalSpent)}</td>
      <td className="px-3 py-3">{formatDate(item.lastOrderDate)}</td>
      <td className="px-3 py-3"><button type="button" onClick={() => onView(item)} className="rounded-md border border-[rgba(122,24,61,0.14)] bg-white px-3 py-2 text-xs font-bold text-[#7A183D]">View</button></td>
    </tr>
  ));
}

function CampaignRows({ items, onView, onEdit, onActivate, onDeactivate, canManageCampaigns }) {
  return items.map((item) => (
    <tr key={item.id || item.slug || item.name} className="border-b border-[rgba(122,24,61,0.08)]">
      <td className="px-3 py-3 font-bold text-[#3A2417]">{item.name}<span className="mt-1 block text-xs font-semibold text-[#3A2417]/48">{item.slug || "-"}</span></td>
      <td className="px-3 py-3"><AdminBadge tone="gold">{item.theme || "campaign"}</AdminBadge></td>
      <td className="px-3 py-3"><AdminBadge tone={getCampaignStatus(item).tone}>{getCampaignStatus(item).label}</AdminBadge></td>
      <td className="px-3 py-3">{formatDate(item.startDate)}</td>
      <td className="px-3 py-3">{formatDate(item.endDate)}</td>
      <td className="px-3 py-3">{item.offerLabel || item.offer || "—"}</td>
      <td className="px-3 py-3">{(item.featuredCategorySlugs || item.featuredCategories || []).join(", ") || "—"}</td>
      <td className="px-3 py-3">{formatDate(item.createdAt)}</td>
      <td className="px-3 py-3">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => onView(item)} className="rounded-md border border-[rgba(122,24,61,0.14)] bg-white px-3 py-2 text-xs font-bold text-[#7A183D]">View</button>
          <button type="button" onClick={() => onEdit(item)} disabled={!canManageCampaigns} className="rounded-md border border-[rgba(122,24,61,0.14)] bg-[#FFF8EE] px-3 py-2 text-xs font-bold text-[#7A183D] disabled:cursor-not-allowed disabled:opacity-50">Edit</button>
          <button type="button" onClick={() => onActivate(item)} disabled={!canManageCampaigns || item.active || item.isActive} className="rounded-md border border-[rgba(122,24,61,0.14)] bg-white px-3 py-2 text-xs font-bold text-[#7A183D] disabled:cursor-not-allowed disabled:opacity-50">Activate</button>
          <button type="button" onClick={() => onDeactivate(item)} disabled={!canManageCampaigns || !(item.active || item.isActive)} className="rounded-md border border-[rgba(122,24,61,0.14)] bg-white px-3 py-2 text-xs font-bold text-[#7A183D] disabled:cursor-not-allowed disabled:opacity-50">Off</button>
        </div>
      </td>
    </tr>
  ));
}

function Table({ resource, items, selectedProductIds = [], allVisibleProductsSelected = false, onToggleAllVisibleProducts, onToggleProductSelection, onView, onEditProduct, onDeactivateProduct, onDeleteProduct, canManageProducts, canHardDeleteProducts, onEditCategory, onDeactivateCategory, onDeleteCategory, canManageCategories, canHardDeleteCategories, onEditCampaign, onActivateCampaign, onDeactivateCampaign, canManageCampaigns }) {
  const headers = {
    products: ["Select", "Image", "Product", "Category", "Price", "Original", "Discount", "Featured", "Active", "Stock", "Created", "Action"],
    categories: ["Image", "Name", "Slug", "Description", "Count Label", "Featured", "Active", "Sort", "Products", "Action"],
    orders: ["Order", "Customer", "Contact", "Type", "Total", "Status", "Payment", "Created", "Items", "Action"],
    customers: ["Customer", "Phone", "Email", "Location", "Orders", "Total Spent", "Last Order", "Action"],
    campaigns: ["Campaign", "Theme", "Status", "Start", "End", "Offer", "Featured Categories", "Created", "Action"]
  };

  const rows = {
    products: <ProductRows items={items} selectedProductIds={selectedProductIds} onToggleProductSelection={onToggleProductSelection} onView={onView} onEdit={onEditProduct} onDeactivate={onDeactivateProduct} onDelete={onDeleteProduct} canManageProducts={canManageProducts} canHardDeleteProducts={canHardDeleteProducts} />,
    categories: <CategoryRows items={items} onView={onView} onEdit={onEditCategory} onDeactivate={onDeactivateCategory} onDelete={onDeleteCategory} canManageCategories={canManageCategories} canHardDeleteCategories={canHardDeleteCategories} />,
    orders: <ManagedOrderRows items={items} onView={onView} />,
    customers: <CustomerRows items={items} onView={onView} />,
    campaigns: <CampaignRows items={items} onView={onView} onEdit={onEditCampaign} onActivate={onActivateCampaign} onDeactivate={onDeactivateCampaign} canManageCampaigns={canManageCampaigns} />
  };

  return (
    <div className="overflow-x-auto rounded-2xl border border-[rgba(122,24,61,0.14)] bg-white/82 shadow-soft">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-[#FFF8EE] text-xs font-bold uppercase tracking-[0.14em] text-[#C9962D]">
          <tr>
            {headers[resource].map((header) => (
              <th key={header} className="whitespace-nowrap px-3 py-3">
                {resource === "products" && header === "Select" ? (
                  <input
                    type="checkbox"
                    checked={allVisibleProductsSelected}
                    onChange={onToggleAllVisibleProducts}
                    disabled={!canManageProducts || !items.length}
                    className="h-4 w-4 rounded border-[rgba(122,24,61,0.24)] text-[#7A183D]"
                    aria-label="Select all visible products"
                  />
                ) : header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-[#3A2417]/72">{rows[resource]}</tbody>
      </table>
    </div>
  );
}

function OrderDetailDrawer({ order, saving, error, canManageOrders, onClose, onSave }) {
  const [status, setStatus] = useState(order?.status || "new");
  const [paymentStatus, setPaymentStatus] = useState(order?.paymentStatus || "pending");
  const [note, setNote] = useState("");

  useEffect(() => {
    setStatus(order?.status || "new");
    setPaymentStatus(order?.paymentStatus || "pending");
    setNote("");
  }, [order?.id, order?.status, order?.paymentStatus]);

  if (!order) return null;

  const statusMeta = getOrderStatusMeta(order.status);
  const paymentStatusMeta = getPaymentStatusMeta(order.paymentStatus);
  const items = order.items || [];
  const timeline = order.timeline || [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#3A2417]/35">
      <aside className="h-full w-full max-w-2xl overflow-y-auto bg-[#FFF8EE] p-4 shadow-boutique sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#C9962D]">Order Management</p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-[#7A183D]">{order.orderNumber}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <AdminBadge tone={statusMeta.tone}>{statusMeta.label}</AdminBadge>
              <AdminBadge tone={paymentStatusMeta.tone}>Payment {paymentStatusMeta.label}</AdminBadge>
              <AdminBadge tone="gold">{order.orderType === "international" ? "International" : "Domestic"}</AdminBadge>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-md border border-[rgba(122,24,61,0.14)] bg-white p-2 text-[#7A183D]" aria-label="Close order details">
            <X className="h-4 w-4" />
          </button>
        </div>

        {order.detailLoading ? (
          <div className="mt-5 rounded-2xl border border-[rgba(122,24,61,0.14)] bg-white/78 p-6 text-sm font-bold text-[#7A183D]">Loading order details...</div>
        ) : null}

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-[rgba(122,24,61,0.14)] bg-white/78 p-4">
            <h3 className="font-display text-xl font-semibold text-[#7A183D]">Order Summary</h3>
            <div className="mt-3 space-y-2 text-sm font-semibold text-[#3A2417]/72">
              <p className="flex justify-between gap-3"><span>Order date</span><span className="text-right text-[#3A2417]">{formatDateTime(order.createdAt)}</span></p>
              <p className="flex justify-between gap-3"><span>Total amount</span><span className="text-right font-bold text-[#7A183D]">{formatCurrency(order.totalAmount)}</span></p>
              <p className="flex justify-between gap-3"><span>Payment preference</span><span className="text-right text-[#3A2417]">{order.paymentPreference || "Not selected"}</span></p>
              <p className="flex justify-between gap-3"><span>Subtotal</span><span className="text-right text-[#3A2417]">{formatCurrency(order.subtotal)}</span></p>
            </div>
          </section>

          <section className="rounded-2xl border border-[rgba(122,24,61,0.14)] bg-white/78 p-4">
            <h3 className="font-display text-xl font-semibold text-[#7A183D]">Customer Details</h3>
            <div className="mt-3 space-y-2 text-sm font-semibold text-[#3A2417]/72">
              <p>{order.customerName || "Name not provided"}</p>
              <p>{order.customerPhone || "Phone not provided"}</p>
              <p>{order.customerEmail || "Email not provided"}</p>
            </div>
          </section>
        </div>

        <section className="mt-4 rounded-2xl border border-[rgba(122,24,61,0.14)] bg-white/78 p-4">
          <h3 className="font-display text-xl font-semibold text-[#7A183D]">Delivery Details</h3>
          <div className="mt-3 text-sm font-semibold leading-6 text-[#3A2417]/72">
            <p>{[order.deliveryCity, order.deliveryCountry].filter(Boolean).join(", ") || "Delivery city/country not provided"}</p>
            <p className="mt-1">{order.deliveryAddress || "Address not provided"}</p>
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-[rgba(122,24,61,0.14)] bg-white/78 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-display text-xl font-semibold text-[#7A183D]">Payment Details</h3>
            <AdminBadge tone={paymentStatusMeta.tone}>{paymentStatusMeta.label}</AdminBadge>
          </div>
          <div className="mt-3 grid gap-3 text-sm font-semibold text-[#3A2417]/72 sm:grid-cols-2">
            <p className="rounded-xl bg-[#FFF8EE] p-3"><span className="block text-xs uppercase tracking-[0.14em] text-[#C9962D]">Gateway</span>{order.paymentGateway || "Not selected"}</p>
            <p className="rounded-xl bg-[#FFF8EE] p-3"><span className="block text-xs uppercase tracking-[0.14em] text-[#C9962D]">Method</span>{order.paymentPreference || order.paymentMethod || "Not selected"}</p>
            <p className="rounded-xl bg-[#FFF8EE] p-3"><span className="block text-xs uppercase tracking-[0.14em] text-[#C9962D]">Razorpay order ID</span>{order.razorpayOrderId || "Not available"}</p>
            <p className="rounded-xl bg-[#FFF8EE] p-3"><span className="block text-xs uppercase tracking-[0.14em] text-[#C9962D]">Razorpay payment ID</span>{order.razorpayPaymentId || "Not available"}</p>
            <p className="rounded-xl bg-[#FFF8EE] p-3"><span className="block text-xs uppercase tracking-[0.14em] text-[#C9962D]">Paid at</span>{order.paymentVerifiedAt ? formatDateTime(order.paymentVerifiedAt) : "Not paid"}</p>
            <p className="rounded-xl bg-[#FFF8EE] p-3"><span className="block text-xs uppercase tracking-[0.14em] text-[#C9962D]">COD selected</span>{order.codSelected ? "Yes" : "No"} / Eligible: {order.codEligible ? "Yes" : "No"}</p>
            {order.paymentReference ? <p className="rounded-xl bg-[#FFF8EE] p-3"><span className="block text-xs uppercase tracking-[0.14em] text-[#C9962D]">Reference</span>{order.paymentReference}</p> : null}
            {order.paymentNote ? <p className="rounded-xl bg-[#FFF8EE] p-3 sm:col-span-2"><span className="block text-xs uppercase tracking-[0.14em] text-[#C9962D]">Payment note</span>{order.paymentNote}</p> : null}
            {order.paymentFailureReason ? <p className="rounded-xl bg-rose-50 p-3 text-rose-700 sm:col-span-2"><span className="block text-xs uppercase tracking-[0.14em] text-rose-500">Failure reason</span>{order.paymentFailureReason}</p> : null}
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-[rgba(122,24,61,0.14)] bg-white/78 p-4">
          <h3 className="font-display text-xl font-semibold text-[#7A183D]">Ordered Items</h3>
          <div className="mt-3 space-y-3">
            {items.length ? items.map((item) => (
              <div key={item.id || item.productName} className="grid grid-cols-[56px_minmax(0,1fr)] gap-3 rounded-xl border border-[rgba(122,24,61,0.1)] bg-[#FFF8EE] p-3">
                <span className="block h-14 w-14 overflow-hidden rounded-lg bg-white">
                  {item.productImage ? <img src={item.productImage} alt={item.productName} className="h-full w-full object-cover" /> : null}
                </span>
                <div className="min-w-0">
                  <p className="font-bold text-[#3A2417]">{item.productName}</p>
                  <p className="mt-1 text-sm font-semibold text-[#3A2417]/62">Qty {item.quantity} x {formatCurrency(item.unitPrice)}</p>
                  <p className="mt-1 text-sm font-bold text-[#7A183D]">{formatCurrency(item.lineTotal)}</p>
                </div>
              </div>
            )) : <p className="text-sm font-semibold text-[#3A2417]/62">No items found for this order.</p>}
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-[rgba(122,24,61,0.14)] bg-white/78 p-4">
          <h3 className="font-display text-xl font-semibold text-[#7A183D]">Status Management</h3>
          <div className="mt-3 grid gap-3">
            <label className="grid gap-1 text-sm font-bold text-[#3A2417]">
              Order status
              <select value={status} onChange={(event) => setStatus(event.target.value)} className="min-h-11 rounded-lg border border-[rgba(122,24,61,0.14)] bg-[#FFF8EE] px-3 outline-none focus:border-[#C9962D]">
                {orderStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-bold text-[#3A2417]">
              Payment status
              <select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)} className="min-h-11 rounded-lg border border-[rgba(122,24,61,0.14)] bg-[#FFF8EE] px-3 outline-none focus:border-[#C9962D]">
                {paymentStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-bold text-[#3A2417]">
              Internal note
              <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} placeholder="Add a private update for this order." className="rounded-lg border border-[rgba(122,24,61,0.14)] bg-[#FFF8EE] px-3 py-2 outline-none focus:border-[#C9962D]" />
            </label>
            {error ? <p className="rounded-lg border border-rose-500/20 bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</p> : null}
            <button type="button" disabled={saving || !canManageOrders} onClick={() => onSave(order, { status, paymentStatus, note })} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#7A183D] px-5 text-sm font-bold text-white transition hover:bg-[#5f102f] disabled:cursor-not-allowed disabled:opacity-60">
              {saving ? "Saving..." : "Save order update"}
            </button>
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-[rgba(122,24,61,0.14)] bg-white/78 p-4">
          <h3 className="font-display text-xl font-semibold text-[#7A183D]">Order Timeline</h3>
          <div className="mt-4 space-y-3">
            {timeline.length ? timeline.map((entry) => {
              const fromStatus = getOrderStatusMeta(entry.fromStatus);
              const toStatus = getOrderStatusMeta(entry.toStatus);

              return (
                <div key={entry.id} className="rounded-xl border border-[rgba(122,24,61,0.1)] bg-[#FFF8EE] p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {entry.fromStatus ? <AdminBadge tone={fromStatus.tone}>{fromStatus.label}</AdminBadge> : null}
                    <span className="text-xs font-bold text-[#C9962D]">to</span>
                    <AdminBadge tone={toStatus.tone}>{toStatus.label}</AdminBadge>
                  </div>
                  <p className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-[#C9962D]">{formatDateTime(entry.createdAt)} by {entry.changedByName || "Karari Admin"}</p>
                  {entry.note ? <p className="mt-2 text-sm font-semibold leading-6 text-[#3A2417]/72">{entry.note}</p> : null}
                </div>
              );
            }) : (
              <p className="rounded-xl border border-[rgba(122,24,61,0.1)] bg-[#FFF8EE] p-3 text-sm font-semibold text-[#3A2417]/62">No timeline updates yet. Update the order status to start tracking progress.</p>
            )}
          </div>
        </section>
      </aside>
    </div>
  );
}

function CustomerDetailDrawer({ customer, onClose }) {
  const [selectedOrderId, setSelectedOrderId] = useState(customer?.orders?.[0]?.id || "");
  const [selectedTemplate, setSelectedTemplate] = useState(customerMessageTemplates[0].value);
  const [copyState, setCopyState] = useState("");

  useEffect(() => {
    setSelectedOrderId(customer?.orders?.[0]?.id || "");
    setSelectedTemplate(customerMessageTemplates[0].value);
    setCopyState("");
  }, [customer?.id, customer?.orders]);

  if (!customer) return null;

  const orders = customer.orders || [];
  const selectedOrder = orders.find((order) => order.id === selectedOrderId) || orders[0] || null;
  const template = customerMessageTemplates.find((item) => item.value === selectedTemplate) || customerMessageTemplates[0];
  const message = buildCustomerMessage(template, customer, selectedOrder);
  const phone = normalizeWhatsAppPhone(customer.phone);
  const whatsappUrl = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : "";
  const latestStatus = getOrderStatusMeta(customer.latestOrderStatus);

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopyState("Message copied");
    } catch {
      setCopyState("Unable to copy message. Please select and copy it manually.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#3A2417]/35">
      <aside className="h-full w-full max-w-2xl overflow-y-auto bg-[#FFF8EE] p-4 shadow-boutique sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#C9962D]">Customer Profile</p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-[#7A183D]">{customer.fullName || "Customer"}</h2>
            <p className="mt-2 text-sm font-semibold text-[#3A2417]/62">{[customer.city, customer.country].filter(Boolean).join(", ") || "Location not provided"}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md border border-[rgba(122,24,61,0.14)] bg-white p-2 text-[#7A183D]" aria-label="Close customer details">
            <X className="h-4 w-4" />
          </button>
        </div>

        {customer.detailLoading ? (
          <div className="mt-5 rounded-2xl border border-[rgba(122,24,61,0.14)] bg-white/78 p-6 text-sm font-bold text-[#7A183D]">Loading customer details...</div>
        ) : null}

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-[rgba(122,24,61,0.14)] bg-white/78 p-4">
            <h3 className="font-display text-xl font-semibold text-[#7A183D]">Customer Summary</h3>
            <div className="mt-3 space-y-2 text-sm font-semibold text-[#3A2417]/72">
              <p>{customer.phone || "Phone not provided"}</p>
              <p>{customer.email || "Email not provided"}</p>
              <p>{[customer.city, customer.country].filter(Boolean).join(", ") || "City/country not provided"}</p>
              <p>{customer.address || "Address not provided"}</p>
              <p>Customer since {formatDate(customer.createdAt)}</p>
            </div>
          </section>

          <section className="rounded-2xl border border-[rgba(122,24,61,0.14)] bg-white/78 p-4">
            <h3 className="font-display text-xl font-semibold text-[#7A183D]">Customer Stats</h3>
            <div className="mt-3 space-y-2 text-sm font-semibold text-[#3A2417]/72">
              <p className="flex justify-between gap-3"><span>Total orders</span><span className="font-bold text-[#7A183D]">{customer.totalOrders || 0}</span></p>
              <p className="flex justify-between gap-3"><span>Total spent</span><span className="font-bold text-[#7A183D]">{formatCurrency(customer.totalSpent)}</span></p>
              <p className="flex justify-between gap-3"><span>Last order</span><span className="text-right text-[#3A2417]">{formatDate(customer.lastOrderDate)}</span></p>
              <div className="flex items-center justify-between gap-3"><span>Latest status</span><AdminBadge tone={latestStatus.tone}>{latestStatus.label}</AdminBadge></div>
            </div>
          </section>
        </div>

        <section className="mt-4 rounded-2xl border border-[rgba(122,24,61,0.14)] bg-white/78 p-4">
          <h3 className="font-display text-xl font-semibold text-[#7A183D]">Order History</h3>
          <div className="mt-3 space-y-3">
            {orders.length ? orders.map((order) => {
              const status = getOrderStatusMeta(order.status);
              return (
                <div key={order.id} className="rounded-xl border border-[rgba(122,24,61,0.1)] bg-[#FFF8EE] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-bold text-[#7A183D]">{order.orderNumber}</p>
                    <AdminBadge tone={status.tone}>{status.label}</AdminBadge>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-[#3A2417]/62">{formatDate(order.createdAt)} · {formatCurrency(order.totalAmount)}</p>
                </div>
              );
            }) : <p className="text-sm font-semibold text-[#3A2417]/62">No orders found for this customer.</p>}
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-[rgba(122,24,61,0.14)] bg-white/78 p-4">
          <h3 className="font-display text-xl font-semibold text-[#7A183D]">Notification Helper</h3>
          <p className="mt-2 text-sm font-semibold leading-6 text-[#3A2417]/62">Generate a WhatsApp message for manual customer communication. Nothing is sent automatically.</p>
          <div className="mt-4 grid gap-3">
            <label className="grid gap-1 text-sm font-bold text-[#3A2417]">
              Select order
              <select value={selectedOrder?.id || ""} onChange={(event) => setSelectedOrderId(event.target.value)} disabled={!orders.length} className="min-h-11 rounded-lg border border-[rgba(122,24,61,0.14)] bg-[#FFF8EE] px-3 outline-none focus:border-[#C9962D]">
                {orders.length ? orders.map((order) => <option key={order.id} value={order.id}>{order.orderNumber}</option>) : <option value="">No orders available</option>}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-bold text-[#3A2417]">
              Message template
              <select value={selectedTemplate} onChange={(event) => setSelectedTemplate(event.target.value)} className="min-h-11 rounded-lg border border-[rgba(122,24,61,0.14)] bg-[#FFF8EE] px-3 outline-none focus:border-[#C9962D]">
                {customerMessageTemplates.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <div className="rounded-xl border border-[rgba(122,24,61,0.12)] bg-[#FFF8EE] p-3">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#C9962D]">Message Preview</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#3A2417]/72">{message}</p>
            </div>
            {!phone ? <p className="rounded-lg border border-amber-500/20 bg-amber-50 p-3 text-sm font-bold text-amber-700">Phone number not available</p> : null}
            {copyState ? <p className="rounded-lg border border-[rgba(122,24,61,0.14)] bg-[#FFF8EE] p-3 text-sm font-bold text-[#7A183D]">{copyState}</p> : null}
            <div className="flex flex-col gap-2 sm:flex-row">
              <button type="button" onClick={copyMessage} className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg border border-[rgba(122,24,61,0.14)] bg-white px-4 text-sm font-bold text-[#7A183D] transition hover:border-[#C9962D]">Copy Message</button>
              <a href={whatsappUrl || undefined} target="_blank" rel="noopener noreferrer" aria-disabled={!phone} className={`inline-flex min-h-11 flex-1 items-center justify-center rounded-lg px-4 text-sm font-bold transition ${phone ? "bg-[#7A183D] text-white hover:bg-[#5f102f]" : "pointer-events-none bg-[#3A2417]/18 text-[#3A2417]/42"}`}>Open WhatsApp</a>
            </div>
          </div>
        </section>
      </aside>
    </div>
  );
}

function ProductFormDrawer({ mode, product, products, categories, saving, error, canManageProducts, onClose, onSubmit }) {
  const [form, setForm] = useState(() => (product ? productToForm(product) : emptyProductForm));
  const [slugTouched, setSlugTouched] = useState(Boolean(product?.slug));
  const [skuTouched, setSkuTouched] = useState(Boolean(product?.sku));
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [gallery, setGallery] = useState([]);
  const [galleryUrl, setGalleryUrl] = useState("");
  const [imageState, setImageState] = useState({ loading: false, galleryLoading: false, error: "" });

  useEffect(() => {
    setForm(product ? productToForm(product) : emptyProductForm);
    setSlugTouched(Boolean(product?.slug));
    setSkuTouched(Boolean(product?.sku));
    setAdvancedOpen(false);
  }, [product]);

  const buildSku = useCallback((values) => generateSku({
    categorySlug: values.category_slug,
    categoryName: values.category_name,
    existingProducts: products,
    currentProductId: product?.id || ""
  }), [product?.id, products]);

  const slugWarning = useMemo(() => {
    if (!form.slug) return "";
    const duplicate = products.find((item) => item.slug === form.slug && item.id !== product?.id);
    return duplicate ? "This slug already exists in the current product list." : "";
  }, [form.slug, product?.id, products]);

  const skuWarning = useMemo(() => {
    if (!form.sku) return "";
    const duplicate = products.find((item) => item.sku && item.sku === form.sku && item.id !== product?.id);
    return duplicate ? "This SKU already exists in the current product list." : "";
  }, [form.sku, product?.id, products]);

  const loadGallery = useCallback(async () => {
    if (!product?.id || !canManageProducts) {
      setGallery([]);
      return;
    }

    setImageState((current) => ({ ...current, galleryLoading: true, error: "" }));
    try {
      const token = await getAdminToken();
      const response = await fetch(`/api/admin/products/${product.id}/images`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Unable to load gallery.");
      setGallery(result.data || []);
      setImageState((current) => ({ ...current, galleryLoading: false }));
    } catch (galleryError) {
      setImageState((current) => ({ ...current, galleryLoading: false, error: galleryError.message || "Unable to load gallery." }));
    }
  }, [canManageProducts, product?.id]);

  useEffect(() => {
    loadGallery();
  }, [loadGallery]);

  const setField = (field, value) => {
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === "name" && !slugTouched) next.slug = generateSlug(value);
      if (field === "name" && !skuTouched && (next.category_slug || next.category_name)) next.sku = buildSku(next);
      return next;
    });
  };

  const categorySelectOptions = useMemo(() => {
    const activeCategories = categories.filter((category) => category.isActive !== false);
    const currentCategory = categories.find((category) => category.id === form.category_id || category.slug === form.category_slug);
    if (currentCategory && !activeCategories.some((category) => category.id === currentCategory.id || category.slug === currentCategory.slug)) {
      return [currentCategory, ...activeCategories];
    }
    if (!currentCategory && form.category_slug) {
      return [
        {
          id: `slug:${form.category_slug}`,
          name: form.category_name || form.category_slug,
          slug: form.category_slug,
          isActive: false
        },
        ...activeCategories
      ];
    }
    return activeCategories;
  }, [categories, form.category_id, form.category_name, form.category_slug]);

  const selectedCategoryOption = categorySelectOptions.find((category) => category.id === form.category_id || category.slug === form.category_slug);
  const categorySelectValue = selectedCategoryOption?.id || "";
  const categoryDropdownOptions = categorySelectOptions.map((category) => ({
    value: category.id,
    label: `${category.name}${category.isActive === false ? " (inactive)" : ""}`
  }));

  const selectCategory = (categoryValue) => {
    const category = categorySelectOptions.find((item) => item.id === categoryValue || item.slug === categoryValue.replace(/^slug:/, ""));
    const categoryId = isUuid(category?.id) ? category.id : "";
    setForm((current) => {
      const next = {
        ...current,
        category_id: categoryId,
        category_slug: category?.slug || "",
        category_name: category?.name || ""
      };
      if (!skuTouched && current.name) next.sku = buildSku(next);
      return next;
    });
  };

  const regenerateSlug = () => {
    setSlugTouched(false);
    setForm((current) => ({ ...current, slug: generateSlug(current.name) }));
  };

  const regenerateSku = () => {
    setSkuTouched(false);
    setForm((current) => ({ ...current, sku: buildSku(current) }));
  };

  const submit = (event) => {
    event.preventDefault();
    onSubmit(formToPayload(form));
  };

  const uploadImage = async (file, purpose) => {
    if (!file) return null;
    if (!canManageProducts) throw new Error("Connect Supabase Storage to upload images.");

    const token = await getAdminToken();
    const formData = new FormData();
    formData.append("file", file);
    formData.append("purpose", purpose);
    if (product?.id) formData.append("productId", product.id);

    const response = await fetch("/api/admin/uploads/product-image", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || "Unable to upload image.");
    return result;
  };

  const handleMainUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setImageState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const result = await uploadImage(file, "main");
      setField("image_url", result.url);
      setImageState((current) => ({ ...current, loading: false }));
    } catch (uploadError) {
      setImageState((current) => ({ ...current, loading: false, error: uploadError.message || "Unable to upload image." }));
    }
  };

  const addGalleryImage = async (input) => {
    if (!product?.id) {
      setImageState((current) => ({ ...current, error: "Gallery images can be added after saving the product." }));
      return;
    }

    const token = await getAdminToken();
    const response = await fetch(`/api/admin/products/${product.id}/images`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(input)
    });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || "Unable to add gallery image.");
    await loadGallery();
  };

  const handleGalleryUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setImageState((current) => ({ ...current, galleryLoading: true, error: "" }));
    try {
      const result = await uploadImage(file, "gallery");
      await addGalleryImage({
        image_url: result.url,
        storage_path: result.path,
        alt_text: form.name,
        sort_order: gallery.length
      });
      setImageState((current) => ({ ...current, galleryLoading: false }));
    } catch (uploadError) {
      setImageState((current) => ({ ...current, galleryLoading: false, error: uploadError.message || "Unable to upload gallery image." }));
    }
  };

  const handleAddGalleryUrl = async () => {
    if (!galleryUrl.trim()) return;
    setImageState((current) => ({ ...current, galleryLoading: true, error: "" }));
    try {
      await addGalleryImage({
        image_url: galleryUrl.trim(),
        alt_text: form.name,
        sort_order: gallery.length
      });
      setGalleryUrl("");
      setImageState((current) => ({ ...current, galleryLoading: false }));
    } catch (galleryError) {
      setImageState((current) => ({ ...current, galleryLoading: false, error: galleryError.message || "Unable to add gallery image." }));
    }
  };

  const setGalleryAsMain = async (image) => {
    setImageState((current) => ({ ...current, galleryLoading: true, error: "" }));
    try {
      const token = await getAdminToken();
      const response = await fetch(`/api/admin/products/${product.id}/images/${image.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ set_as_main: true })
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Unable to set main image.");
      setField("image_url", image.imageUrl);
      await loadGallery();
      setImageState((current) => ({ ...current, galleryLoading: false }));
    } catch (galleryError) {
      setImageState((current) => ({ ...current, galleryLoading: false, error: galleryError.message || "Unable to set main image." }));
    }
  };

  const removeGalleryImage = async (image) => {
    const confirmed = window.confirm("Remove this gallery image?");
    if (!confirmed) return;

    setImageState((current) => ({ ...current, galleryLoading: true, error: "" }));
    try {
      const token = await getAdminToken();
      const response = await fetch(`/api/admin/products/${product.id}/images/${image.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Unable to remove gallery image.");
      await loadGallery();
      setImageState((current) => ({ ...current, galleryLoading: false }));
    } catch (galleryError) {
      setImageState((current) => ({ ...current, galleryLoading: false, error: galleryError.message || "Unable to remove gallery image." }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#3A2417]/35">
      <aside className="h-full w-full max-w-2xl overflow-y-auto bg-[#FFF8EE] p-5 shadow-boutique">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#C9962D]">Product CMS</p>
            <h2 className="mt-2 font-display text-3xl font-semibold text-[#7A183D]">{mode === "edit" ? "Edit Product" : "Add Product"}</h2>
            <p className="mt-2 text-sm font-semibold text-[#3A2417]/62">{mode === "edit" ? "Update product details, pricing, images and visibility." : "Add product details, pricing, image and visibility."}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md border border-[rgba(122,24,61,0.14)] bg-white p-2 text-[#7A183D]" aria-label="Close product form">
            <X className="h-4 w-4" />
          </button>
        </div>

        {error || imageState.error ? <div className="mt-4 rounded-xl border border-[#7A183D]/15 bg-[#FCE7EC] p-3 text-sm font-bold text-[#7A183D]">{error || imageState.error}</div> : null}

        <form onSubmit={submit} className="mt-6 grid gap-6">
          <section className="rounded-2xl border border-[rgba(122,24,61,0.14)] bg-white/72 p-4">
            <h3 className="font-display text-xl font-semibold text-[#7A183D]">Basic Details</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-bold text-[#3A2417]">
                Product name *
                <input value={form.name} onChange={(event) => setField("name", event.target.value)} className="min-h-11 rounded-lg border border-[rgba(122,24,61,0.14)] bg-white px-3 outline-none focus:border-[#C9962D]" required />
              </label>
              <label className="grid gap-1 text-sm font-bold text-[#3A2417]">
                Category *
                <AdminSelect
                  value={categorySelectValue}
                  options={categoryDropdownOptions}
                  placeholder="Select category"
                  onChange={selectCategory}
                />
              </label>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="grid gap-1 text-sm font-bold text-[#3A2417]">
                Selling price *
                <input type="number" min="0" step="0.01" value={form.price} onChange={(event) => setField("price", event.target.value)} className="min-h-11 rounded-lg border border-[rgba(122,24,61,0.14)] bg-white px-3 outline-none focus:border-[#C9962D]" required />
              </label>
              <label className="grid gap-1 text-sm font-bold text-[#3A2417]">
                Original price
                <input type="number" min="0" step="0.01" value={form.original_price} onChange={(event) => setField("original_price", event.target.value)} className="min-h-11 rounded-lg border border-[rgba(122,24,61,0.14)] bg-white px-3 outline-none focus:border-[#C9962D]" />
              </label>
              <label className="grid gap-1 text-sm font-bold text-[#3A2417]">
                Discount label
                <input value={form.discount_label} onChange={(event) => setField("discount_label", event.target.value)} className="min-h-11 rounded-lg border border-[rgba(122,24,61,0.14)] bg-white px-3 outline-none focus:border-[#C9962D]" />
              </label>
              <label className="grid gap-1 text-sm font-bold text-[#3A2417]">
                Stock status *
                <select value={form.stock_status} onChange={(event) => setField("stock_status", event.target.value)} className="min-h-11 rounded-lg border border-[rgba(122,24,61,0.14)] bg-white px-3 outline-none focus:border-[#C9962D]">
                  <option value="in_stock">In stock</option>
                  <option value="low_stock">Low stock</option>
                  <option value="out_of_stock">Out of stock</option>
                  <option value="made_to_order">Made to order</option>
                </select>
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-[rgba(122,24,61,0.14)] bg-white/72 p-4">
            <h3 className="mb-4 font-display text-xl font-semibold text-[#7A183D]">Product Image</h3>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <div className="h-36 w-36 shrink-0 overflow-hidden rounded-xl border border-[rgba(122,24,61,0.14)] bg-[#FFF8EE]">
                {form.image_url ? <img src={form.image_url} alt="Product image" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center px-3 text-center text-xs font-bold text-[#3A2417]/42">No image</div>}
              </div>
              <div className="min-w-0 flex-1 space-y-3">
                <label className="grid gap-1 text-sm font-bold text-[#3A2417]">
                  Image URL / existing path
                  <input value={form.image_url} onChange={(event) => setField("image_url", event.target.value)} placeholder="/products/example.png or https://..." className="min-h-11 rounded-lg border border-[rgba(122,24,61,0.14)] bg-white px-3 outline-none focus:border-[#C9962D]" />
                </label>
                <div className="flex flex-wrap gap-2">
                  <label className={`inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg bg-[#7A183D] px-4 text-sm font-bold text-white ${!canManageProducts ? "pointer-events-none opacity-55" : ""}`}>
                    {imageState.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Upload / Replace Image
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleMainUpload} disabled={!canManageProducts || imageState.loading} className="hidden" />
                  </label>
                  <button type="button" onClick={() => setField("image_url", "")} className="min-h-10 rounded-lg border border-[rgba(122,24,61,0.14)] bg-white px-4 text-sm font-bold text-[#7A183D]">Clear image</button>
                </div>
                {!canManageProducts ? <p className="text-xs font-bold text-[#7A183D]">Connect Supabase Storage to upload images.</p> : null}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[rgba(122,24,61,0.14)] bg-white/72 p-4">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <p className="font-display text-xl font-semibold text-[#7A183D]">Product Gallery</p>
                <p className="mt-1 text-sm font-semibold text-[#3A2417]/62">{product?.id ? "Upload or add supporting product images." : "Gallery images can be added after saving the product."}</p>
              </div>
              <label className={`inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#FFF8EE] px-4 text-sm font-bold text-[#7A183D] ring-1 ring-[rgba(122,24,61,0.14)] ${!product?.id || !canManageProducts ? "pointer-events-none opacity-55" : ""}`}>
                {imageState.galleryLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Upload Gallery
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleGalleryUpload} disabled={!product?.id || !canManageProducts || imageState.galleryLoading} className="hidden" />
              </label>
            </div>
            {product?.id ? (
              <>
                <div className="mt-4 flex gap-2">
                  <input value={galleryUrl} onChange={(event) => setGalleryUrl(event.target.value)} placeholder="Paste image URL" className="min-h-10 min-w-0 flex-1 rounded-lg border border-[rgba(122,24,61,0.14)] bg-white px-3 text-sm font-semibold outline-none focus:border-[#C9962D]" />
                  <button type="button" onClick={handleAddGalleryUrl} disabled={!canManageProducts || imageState.galleryLoading} className="rounded-lg bg-[#7A183D] px-4 text-sm font-bold text-white disabled:opacity-55">Add URL</button>
                </div>
                {gallery.length ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {gallery.map((image) => (
                      <div key={image.id} className="rounded-xl border border-[rgba(122,24,61,0.12)] bg-[#FFF8EE] p-3">
                        <img src={image.imageUrl} alt={image.altText || form.name} className="h-32 w-full rounded-lg object-cover" />
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button type="button" onClick={() => setGalleryAsMain(image)} disabled={!canManageProducts || imageState.galleryLoading} className="rounded-md border border-[rgba(122,24,61,0.14)] bg-white px-3 py-2 text-xs font-bold text-[#7A183D] disabled:opacity-55">Set main</button>
                          <button type="button" onClick={() => removeGalleryImage(image)} disabled={!canManageProducts || imageState.galleryLoading} className="rounded-md border border-[rgba(122,24,61,0.14)] bg-white px-3 py-2 text-xs font-bold text-[#7A183D] disabled:opacity-55">Remove</button>
                          {image.isMain ? <AdminBadge tone="green">Main</AdminBadge> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p className="mt-4 rounded-xl bg-[#FFF8EE] p-3 text-sm font-bold text-[#3A2417]/58">No gallery images yet.</p>}
              </>
            ) : null}
          </section>

          <section className="rounded-2xl border border-[rgba(122,24,61,0.14)] bg-white/72 p-4">
            <h3 className="font-display text-xl font-semibold text-[#7A183D]">Product Description</h3>
            <div className="mt-4 grid gap-4">
              <label className="grid gap-1 text-sm font-bold text-[#3A2417]">
                Short description
                <input value={form.short_description} onChange={(event) => setField("short_description", event.target.value)} className="min-h-11 rounded-lg border border-[rgba(122,24,61,0.14)] bg-white px-3 outline-none focus:border-[#C9962D]" />
              </label>
              <label className="grid gap-1 text-sm font-bold text-[#3A2417]">
                Full description
                <textarea value={form.description} onChange={(event) => setField("description", event.target.value)} rows={4} className="rounded-lg border border-[rgba(122,24,61,0.14)] bg-white px-3 py-2 outline-none focus:border-[#C9962D]" />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-[rgba(122,24,61,0.14)] bg-white/72 p-4">
            <h3 className="font-display text-xl font-semibold text-[#7A183D]">Display Options</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <label className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[rgba(122,24,61,0.14)] bg-white px-3 text-sm font-bold text-[#3A2417]">
                <input type="checkbox" checked={form.is_featured} onChange={(event) => setField("is_featured", event.target.checked)} />
                Show as featured
              </label>
              <label className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[rgba(122,24,61,0.14)] bg-white px-3 text-sm font-bold text-[#3A2417]">
                <input type="checkbox" checked={form.is_active} onChange={(event) => setField("is_active", event.target.checked)} />
                Product active
              </label>
              <label className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[rgba(122,24,61,0.14)] bg-white px-3 text-sm font-bold text-[#3A2417]">
                <input type="checkbox" checked={form.cod_available} onChange={(event) => setField("cod_available", event.target.checked)} />
                Cash on Delivery available
              </label>
              <label className="grid gap-1 text-sm font-bold text-[#3A2417]">
                Rating
                <input type="number" min="0" max="5" step="0.1" value={form.rating} onChange={(event) => setField("rating", event.target.value)} className="min-h-11 rounded-lg border border-[rgba(122,24,61,0.14)] bg-white px-3 outline-none focus:border-[#C9962D]" />
              </label>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-bold text-[#3A2417]">
                Badge
                <input value={form.badge} onChange={(event) => setField("badge", event.target.value)} className="min-h-11 rounded-lg border border-[rgba(122,24,61,0.14)] bg-white px-3 outline-none focus:border-[#C9962D]" />
              </label>
              <label className="grid gap-1 text-sm font-bold text-[#3A2417]">
                Offer note
                <input value={form.offer} onChange={(event) => setField("offer", event.target.value)} className="min-h-11 rounded-lg border border-[rgba(122,24,61,0.14)] bg-white px-3 outline-none focus:border-[#C9962D]" />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-[rgba(122,24,61,0.14)] bg-white/72">
            <button type="button" onClick={() => setAdvancedOpen((current) => !current)} className="flex min-h-14 w-full items-center justify-between gap-3 px-4 text-left font-display text-xl font-semibold text-[#7A183D]">
              Advanced product details
              <span className="text-sm font-bold text-[#C9962D]">{advancedOpen ? "Hide" : "Show"}</span>
            </button>
            {advancedOpen ? (
              <div className="grid gap-4 border-t border-[rgba(122,24,61,0.1)] p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-1 text-sm font-bold text-[#3A2417]">
                    <div className="flex items-center justify-between gap-2">
                      <span>Slug</span>
                      <button type="button" onClick={regenerateSlug} className="text-xs font-bold text-[#7A183D] underline-offset-4 hover:underline">Regenerate</button>
                    </div>
                    <input value={form.slug} onChange={(event) => { setSlugTouched(true); setField("slug", event.target.value); }} className="min-h-11 rounded-lg border border-[rgba(122,24,61,0.14)] bg-white px-3 outline-none focus:border-[#C9962D]" required />
                    <p className="text-xs font-semibold text-[#3A2417]/52">Auto-generated. Edit only if needed.</p>
                    {slugWarning ? <p className="text-xs font-bold text-[#7A183D]">{slugWarning}</p> : null}
                  </div>
                  <div className="grid gap-1 text-sm font-bold text-[#3A2417]">
                    <div className="flex items-center justify-between gap-2">
                      <span>SKU</span>
                      <button type="button" onClick={regenerateSku} className="text-xs font-bold text-[#7A183D] underline-offset-4 hover:underline">Regenerate</button>
                    </div>
                    <input value={form.sku} onChange={(event) => { setSkuTouched(true); setField("sku", event.target.value.toUpperCase()); }} className="min-h-11 rounded-lg border border-[rgba(122,24,61,0.14)] bg-white px-3 outline-none focus:border-[#C9962D]" />
                    <p className="text-xs font-semibold text-[#3A2417]/52">Auto-generated. Edit only if needed.</p>
                    {skuWarning ? <p className="text-xs font-bold text-[#7A183D]">{skuWarning}</p> : null}
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="grid gap-1 text-sm font-bold text-[#3A2417] sm:col-span-2">
                    Tags
                    <input value={form.tags} onChange={(event) => setField("tags", event.target.value)} placeholder="rakhi, festive, gift" className="min-h-11 rounded-lg border border-[rgba(122,24,61,0.14)] bg-white px-3 outline-none focus:border-[#C9962D]" />
                  </label>
                  <label className="grid gap-1 text-sm font-bold text-[#3A2417]">
                    Sort order
                    <input type="number" value={form.sort_order} onChange={(event) => setField("sort_order", event.target.value)} className="min-h-11 rounded-lg border border-[rgba(122,24,61,0.14)] bg-white px-3 outline-none focus:border-[#C9962D]" />
                  </label>
                </div>
              </div>
            ) : null}
          </section>

          <div className="flex flex-col gap-2 border-t border-[rgba(122,24,61,0.12)] pt-4 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="min-h-11 rounded-lg border border-[rgba(122,24,61,0.14)] bg-white px-5 text-sm font-bold text-[#7A183D]">Cancel</button>
            <button type="submit" disabled={saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#7A183D] px-5 text-sm font-bold text-white transition hover:bg-[#5f102f] disabled:opacity-70">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {mode === "edit" ? "Save Changes" : "Create Product"}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}

function CategoryFormDrawer({ mode, category, saving, error, canManageCategories, onClose, onSubmit }) {
  const categoryImageInputRef = useRef(null);
  const [form, setForm] = useState(() => (category ? categoryToForm(category) : emptyCategoryForm));
  const [slugTouched, setSlugTouched] = useState(Boolean(category?.slug));
  const [imageUploadState, setImageUploadState] = useState({ uploading: false, error: "" });

  useEffect(() => {
    setForm(category ? categoryToForm(category) : emptyCategoryForm);
    setSlugTouched(Boolean(category?.slug));
    setImageUploadState({ uploading: false, error: "" });
  }, [category]);

  const setField = (field, value) => {
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === "name" && !slugTouched) next.slug = generateSlug(value);
      return next;
    });
  };

  const submit = (event) => {
    event.preventDefault();
    onSubmit(categoryFormToPayload(form));
  };

  const uploadCategoryImage = async (file) => {
    if (!file) return;

    if (!canManageCategories) {
      setImageUploadState({ uploading: false, error: "Image upload requires storage setup." });
      return;
    }

    setImageUploadState({ uploading: true, error: "" });

    try {
      const token = await getAdminToken();
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/admin/uploads/category-image", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Image upload requires storage setup.");

      setField("image_url", result.url);
      setImageUploadState({ uploading: false, error: "" });
      if (categoryImageInputRef.current) categoryImageInputRef.current.value = "";
    } catch (uploadError) {
      setImageUploadState({ uploading: false, error: uploadError.message || "Image upload requires storage setup." });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#3A2417]/35">
      <aside className="h-full w-full max-w-xl overflow-y-auto bg-[#FFF8EE] p-5 shadow-boutique">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#C9962D]">Category CMS</p>
            <h2 className="mt-2 font-display text-3xl font-semibold text-[#7A183D]">{mode === "edit" ? "Edit Category" : "Add Category"}</h2>
            <p className="mt-2 text-sm font-semibold text-[#3A2417]/62">Update collection details, image and storefront visibility.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md border border-[rgba(122,24,61,0.14)] bg-white p-2 text-[#7A183D]" aria-label="Close category form">
            <X className="h-4 w-4" />
          </button>
        </div>

        {error ? <div className="mt-4 rounded-xl border border-[#7A183D]/15 bg-[#FCE7EC] p-3 text-sm font-bold text-[#7A183D]">{error}</div> : null}
        {!canManageCategories ? <div className="mt-4 rounded-xl border border-[rgba(122,24,61,0.14)] bg-white p-3 text-sm font-bold text-[#7A183D]">Connect Supabase to manage categories.</div> : null}

        <form onSubmit={submit} className="mt-6 grid gap-5">
          <section className="rounded-2xl border border-[rgba(122,24,61,0.14)] bg-white/72 p-4">
            <h3 className="font-display text-xl font-semibold text-[#7A183D]">Category Details</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-bold text-[#3A2417]">
                Category name *
                <input value={form.name} onChange={(event) => setField("name", event.target.value)} className="min-h-11 rounded-lg border border-[rgba(122,24,61,0.14)] bg-white px-3 outline-none focus:border-[#C9962D]" required />
              </label>
              <label className="grid gap-1 text-sm font-bold text-[#3A2417]">
                Slug *
                <input value={form.slug} onChange={(event) => { setSlugTouched(true); setField("slug", event.target.value); }} className="min-h-11 rounded-lg border border-[rgba(122,24,61,0.14)] bg-white px-3 outline-none focus:border-[#C9962D]" required />
              </label>
            </div>
            <label className="mt-4 grid gap-1 text-sm font-bold text-[#3A2417]">
              Description
              <textarea value={form.description} onChange={(event) => setField("description", event.target.value)} rows={3} className="rounded-lg border border-[rgba(122,24,61,0.14)] bg-white px-3 py-2 outline-none focus:border-[#C9962D]" />
            </label>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-bold text-[#3A2417]">
                Product count label
                <input value={form.product_count_label} onChange={(event) => setField("product_count_label", event.target.value)} placeholder="12 Products" className="min-h-11 rounded-lg border border-[rgba(122,24,61,0.14)] bg-white px-3 outline-none focus:border-[#C9962D]" />
              </label>
              <label className="grid gap-1 text-sm font-bold text-[#3A2417]">
                Sort order
                <input type="number" value={form.sort_order} onChange={(event) => setField("sort_order", event.target.value)} className="min-h-11 rounded-lg border border-[rgba(122,24,61,0.14)] bg-white px-3 outline-none focus:border-[#C9962D]" />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-[rgba(122,24,61,0.14)] bg-white/72 p-4">
            <h3 className="font-display text-xl font-semibold text-[#7A183D]">Category Image</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-[8rem_minmax(0,1fr)]">
              <div className="h-32 w-32 overflow-hidden rounded-xl border border-[rgba(122,24,61,0.14)] bg-[#FFF8EE]">
                {form.image_url ? <img src={form.image_url} alt="Category image" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center px-3 text-center text-xs font-bold text-[#3A2417]/42">No image</div>}
              </div>
              <div className="grid min-w-0 gap-3">
                <label className="grid gap-1 text-sm font-bold text-[#3A2417]">
                  Image URL / existing path
                  <input value={form.image_url} onChange={(event) => setField("image_url", event.target.value)} placeholder="/categories/example.png or https://..." className="min-h-11 rounded-lg border border-[rgba(122,24,61,0.14)] bg-white px-3 outline-none focus:border-[#C9962D]" />
                </label>
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#7A183D] px-4 text-sm font-bold text-white transition hover:bg-[#5f102f] disabled:opacity-70">
                    {imageUploadState.uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {imageUploadState.uploading ? "Uploading..." : "Upload / Replace Image"}
                    <input ref={categoryImageInputRef} type="file" accept="image/jpeg,image/png,image/webp" disabled={imageUploadState.uploading || !canManageCategories} onChange={(event) => uploadCategoryImage(event.target.files?.[0])} className="hidden" />
                  </label>
                  <button type="button" onClick={() => setField("image_url", "")} className="min-h-10 rounded-lg border border-[rgba(122,24,61,0.14)] bg-white px-4 text-sm font-bold text-[#7A183D]">Clear Image</button>
                </div>
                {imageUploadState.error ? <p className="rounded-lg border border-rose-500/20 bg-rose-50 p-2 text-xs font-bold text-rose-700">{imageUploadState.error}</p> : null}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[rgba(122,24,61,0.14)] bg-white/72 p-4">
            <h3 className="font-display text-xl font-semibold text-[#7A183D]">Display Options</h3>
            <div className="mt-4 flex flex-wrap gap-3">
              <label className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[rgba(122,24,61,0.14)] bg-white px-3 text-sm font-bold text-[#3A2417]">
                <input type="checkbox" checked={form.featured} onChange={(event) => setField("featured", event.target.checked)} />
                Show as featured
              </label>
              <label className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[rgba(122,24,61,0.14)] bg-white px-3 text-sm font-bold text-[#3A2417]">
                <input type="checkbox" checked={form.is_active} onChange={(event) => setField("is_active", event.target.checked)} />
                Category active
              </label>
            </div>
          </section>

          <div className="flex flex-col gap-2 border-t border-[rgba(122,24,61,0.12)] pt-4 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="min-h-11 rounded-lg border border-[rgba(122,24,61,0.14)] bg-white px-5 text-sm font-bold text-[#7A183D]">Cancel</button>
            <button type="submit" disabled={saving || !canManageCategories} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#7A183D] px-5 text-sm font-bold text-white transition hover:bg-[#5f102f] disabled:opacity-70">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {mode === "edit" ? "Save Changes" : "Create Category"}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}

function CampaignFormDrawer({ mode, campaign, categories, saving, error, canManageCampaigns, onClose, onSubmit }) {
  const [form, setForm] = useState(() => (campaign ? campaignToForm(campaign) : emptyCampaignForm));
  const [slugTouched, setSlugTouched] = useState(Boolean(campaign?.slug));
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [jsonError, setJsonError] = useState("");

  useEffect(() => {
    setForm(campaign ? campaignToForm(campaign) : emptyCampaignForm);
    setSlugTouched(Boolean(campaign?.slug));
    setAdvancedOpen(false);
    setJsonError("");
  }, [campaign]);

  const setField = (field, value) => {
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === "name" && !slugTouched) next.slug = generateSlug(value);
      return next;
    });
  };

  const toggleFeaturedCategory = (slug) => {
    setForm((current) => {
      const selected = new Set(current.featured_category_slugs || []);
      if (selected.has(slug)) selected.delete(slug);
      else selected.add(slug);
      return { ...current, featured_category_slugs: [...selected] };
    });
  };

  const submit = (event) => {
    event.preventDefault();
    setJsonError("");

    try {
      onSubmit(campaignFormToPayload(form));
    } catch (submitError) {
      setJsonError(submitError.message || "Unable to save campaign.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#3A2417]/35">
      <aside className="h-full w-full max-w-2xl overflow-y-auto bg-[#FFF8EE] p-5 shadow-boutique">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#C9962D]">Campaign CMS</p>
            <h2 className="mt-2 font-display text-3xl font-semibold text-[#7A183D]">{mode === "edit" ? "Edit Campaign" : "Add Campaign"}</h2>
            <p className="mt-2 text-sm font-semibold text-[#3A2417]/62">Manage festival campaigns, offers and featured collections.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md border border-[rgba(122,24,61,0.14)] bg-white p-2 text-[#7A183D]" aria-label="Close campaign form">
            <X className="h-4 w-4" />
          </button>
        </div>

        {error || jsonError ? <div className="mt-4 rounded-xl border border-[#7A183D]/15 bg-[#FCE7EC] p-3 text-sm font-bold text-[#7A183D]">{error || jsonError}</div> : null}
        {!canManageCampaigns ? <div className="mt-4 rounded-xl border border-[rgba(122,24,61,0.14)] bg-white p-3 text-sm font-bold text-[#7A183D]">Connect Supabase to manage campaigns.</div> : null}

        <form onSubmit={submit} className="mt-6 grid gap-5">
          <section className="rounded-2xl border border-[rgba(122,24,61,0.14)] bg-white/72 p-4">
            <h3 className="font-display text-xl font-semibold text-[#7A183D]">Campaign Details</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-bold text-[#3A2417]">
                Campaign name *
                <input value={form.name} onChange={(event) => setField("name", event.target.value)} className="min-h-11 rounded-lg border border-[rgba(122,24,61,0.14)] bg-white px-3 outline-none focus:border-[#C9962D]" required />
              </label>
              <label className="grid gap-1 text-sm font-bold text-[#3A2417]">
                Theme
                <select value={form.theme} onChange={(event) => setField("theme", event.target.value)} className="min-h-11 rounded-lg border border-[rgba(122,24,61,0.14)] bg-white px-3 outline-none focus:border-[#C9962D]">
                  {campaignThemes.map((theme) => <option key={theme} value={theme}>{theme}</option>)}
                </select>
              </label>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-bold text-[#3A2417]">
                Start date
                <input type="date" value={form.start_date} onChange={(event) => setField("start_date", event.target.value)} className="min-h-11 rounded-lg border border-[rgba(122,24,61,0.14)] bg-white px-3 outline-none focus:border-[#C9962D]" />
              </label>
              <label className="grid gap-1 text-sm font-bold text-[#3A2417]">
                End date
                <input type="date" value={form.end_date} onChange={(event) => setField("end_date", event.target.value)} className="min-h-11 rounded-lg border border-[rgba(122,24,61,0.14)] bg-white px-3 outline-none focus:border-[#C9962D]" />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-[rgba(122,24,61,0.14)] bg-white/72 p-4">
            <h3 className="font-display text-xl font-semibold text-[#7A183D]">Homepage Messaging</h3>
            <div className="mt-4 grid gap-4">
              <label className="grid gap-1 text-sm font-bold text-[#3A2417]">
                Hero title
                <input value={form.hero_title} onChange={(event) => setField("hero_title", event.target.value)} className="min-h-11 rounded-lg border border-[rgba(122,24,61,0.14)] bg-white px-3 outline-none focus:border-[#C9962D]" />
              </label>
              <label className="grid gap-1 text-sm font-bold text-[#3A2417]">
                Hero subtitle
                <input value={form.hero_subtitle} onChange={(event) => setField("hero_subtitle", event.target.value)} className="min-h-11 rounded-lg border border-[rgba(122,24,61,0.14)] bg-white px-3 outline-none focus:border-[#C9962D]" />
              </label>
              <label className="grid gap-1 text-sm font-bold text-[#3A2417]">
                Offer label
                <input value={form.offer_label} onChange={(event) => setField("offer_label", event.target.value)} className="min-h-11 rounded-lg border border-[rgba(122,24,61,0.14)] bg-white px-3 outline-none focus:border-[#C9962D]" />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-[rgba(122,24,61,0.14)] bg-white/72 p-4">
            <h3 className="font-display text-xl font-semibold text-[#7A183D]">Featured Collections</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {categories.map((category) => (
                <label key={category.slug} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[rgba(122,24,61,0.14)] bg-white px-3 text-sm font-bold text-[#7A183D]">
                  <input type="checkbox" checked={(form.featured_category_slugs || []).includes(category.slug)} onChange={() => toggleFeaturedCategory(category.slug)} />
                  {category.name}
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-[rgba(122,24,61,0.14)] bg-white/72 p-4">
            <h3 className="font-display text-xl font-semibold text-[#7A183D]">Visibility</h3>
            <label className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg border border-[rgba(122,24,61,0.14)] bg-white px-3 text-sm font-bold text-[#3A2417]">
              <input type="checkbox" checked={form.is_active} onChange={(event) => setField("is_active", event.target.checked)} />
              Make this campaign active
            </label>
            <p className="mt-2 text-xs font-semibold text-[#3A2417]/52">Only one campaign can be active at a time.</p>
          </section>

          <section className="rounded-2xl border border-[rgba(122,24,61,0.14)] bg-white/72">
            <button type="button" onClick={() => setAdvancedOpen((current) => !current)} className="flex min-h-14 w-full items-center justify-between gap-3 px-4 text-left font-display text-xl font-semibold text-[#7A183D]">
              Advanced visual settings
              <span className="text-sm font-bold text-[#C9962D]">{advancedOpen ? "Hide" : "Show"}</span>
            </button>
            {advancedOpen ? (
              <div className="grid gap-4 border-t border-[rgba(122,24,61,0.1)] p-4">
                <label className="grid gap-1 text-sm font-bold text-[#3A2417]">
                  Slug
                  <input value={form.slug} onChange={(event) => { setSlugTouched(true); setField("slug", event.target.value); }} className="min-h-11 rounded-lg border border-[rgba(122,24,61,0.14)] bg-white px-3 outline-none focus:border-[#C9962D]" required />
                </label>
                <label className="grid gap-1 text-sm font-bold text-[#3A2417]">
                  Config JSON
                  <textarea value={form.config} onChange={(event) => setField("config", event.target.value)} rows={7} className="rounded-lg border border-[rgba(122,24,61,0.14)] bg-white px-3 py-2 font-mono text-xs outline-none focus:border-[#C9962D]" />
                </label>
              </div>
            ) : null}
          </section>

          <div className="flex flex-col gap-2 border-t border-[rgba(122,24,61,0.12)] pt-4 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="min-h-11 rounded-lg border border-[rgba(122,24,61,0.14)] bg-white px-5 text-sm font-bold text-[#7A183D]">Cancel</button>
            <button type="submit" disabled={saving || !canManageCampaigns} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#7A183D] px-5 text-sm font-bold text-white transition hover:bg-[#5f102f] disabled:opacity-70">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {mode === "edit" ? "Save Changes" : "Create Campaign"}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}

function ManagementContent({ resource, admin }) {
  const config = resourceConfig[resource];
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ total: 0, mode: "" });
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({ status: "", category: "", orderType: "" });
  const [sortBy, setSortBy] = useState(config.defaultSort);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedGallery, setSelectedGallery] = useState([]);
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [formState, setFormState] = useState({ open: false, mode: "create", product: null, error: "", saving: false });
  const [categoryFormState, setCategoryFormState] = useState({ open: false, mode: "create", category: null, error: "", saving: false });
  const [campaignFormState, setCampaignFormState] = useState({ open: false, mode: "create", campaign: null, error: "", saving: false });
  const [orderState, setOrderState] = useState({ saving: false, error: "" });
  const [notice, setNotice] = useState("");
  const [state, setState] = useState({ loading: true, error: "" });

  const loadItems = useCallback(() => {
    let mounted = true;

    async function run() {
      if (mounted) setState({ loading: true, error: "" });
      const supabase = createBrowserSupabaseClient();
      if (!supabase) return;
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;

      try {
        const response = await fetch(config.endpoint, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        const result = await response.json();

        if (!response.ok || !result.ok) {
          throw new Error(result.error || "Unable to load admin data.");
        }

        if (mounted) {
          setItems(result.data || []);
          setMeta(result.meta || { total: 0, mode: "" });
          setState({ loading: false, error: "" });
        }

        if (["products", "campaigns"].includes(resource)) {
          const categoryResponse = await fetch("/api/admin/categories", {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          const categoryResult = await categoryResponse.json();
          if (mounted && categoryResponse.ok && categoryResult.ok) {
            setCategoryOptions(categoryResult.data || []);
          }
        }
      } catch (error) {
        if (mounted) setState({ loading: false, error: error.message || "Unable to load admin data." });
      }
    }

    run();

    return () => {
      mounted = false;
    };
  }, [config.endpoint, resource]);

  useEffect(() => {
    const cleanup = loadItems();
    return () => {
      if (typeof cleanup === "function") cleanup();
    };
  }, [loadItems]);

  const categories = useMemo(() => [...new Set(items.map((item) => item.categorySlug).filter(Boolean))], [items]);
  const productCategoryFilterOptions = useMemo(() => {
    const liveOptions = categoryOptions.map((category) => ({
      value: category.slug,
      label: category.name
    }));
    const knownSlugs = new Set(liveOptions.map((category) => category.value));
    const fallbackOptions = categories
      .filter((slug) => !knownSlugs.has(slug))
      .map((slug) => ({ value: slug, label: formatCategoryLabel(slug) }));

    return [{ value: "", label: "All categories" }, ...liveOptions, ...fallbackOptions];
  }, [categories, categoryOptions]);
  const visibleItems = useMemo(() => sortItems(filterItems(items, resource, query, filters), resource, sortBy), [filters, items, query, resource, sortBy]);
  const visibleProductIds = useMemo(() => resource === "products" ? visibleItems.map((item) => item.id).filter(Boolean) : [], [resource, visibleItems]);
  const canManageProducts = resource === "products" && meta.mode === "supabase";
  const canHardDeleteProducts = canManageProducts && admin?.role === "owner";
  const canManageCategories = resource === "categories" && meta.mode === "supabase";
  const canHardDeleteCategories = canManageCategories && admin?.role === "owner";
  const canManageCampaigns = resource === "campaigns" && meta.mode === "supabase";
  const canManageOrders = resource === "orders" && meta.mode === "supabase";
  const canViewCustomers = resource === "customers" && meta.mode === "supabase";
  const allVisibleProductsSelected = Boolean(visibleProductIds.length && visibleProductIds.every((id) => selectedProductIds.includes(id)));

  useEffect(() => {
    if (resource !== "products") {
      setSelectedProductIds([]);
      return;
    }

    setSelectedProductIds((current) => {
      const next = current.filter((id) => visibleProductIds.includes(id));
      return next.length === current.length ? current : next;
    });
  }, [resource, visibleProductIds]);

  const openProductForm = (mode, product = null) => {
    setNotice("");
    setSelectedItem(null);
    setFormState({ open: true, mode, product, error: "", saving: false });
  };

  const openCategoryForm = (mode, category = null) => {
    setNotice("");
    setSelectedItem(null);
    setCategoryFormState({ open: true, mode, category, error: "", saving: false });
  };

  const openCampaignForm = (mode, campaign = null) => {
    setNotice("");
    setSelectedItem(null);
    setCampaignFormState({ open: true, mode, campaign, error: "", saving: false });
  };

  const viewItem = async (item) => {
    setSelectedItem(item);
    setSelectedGallery([]);
    setOrderState({ saving: false, error: "" });

    if (resource === "orders" && item?.id && meta.mode === "supabase") {
      setSelectedItem({ ...item, detailLoading: true });

      try {
        const token = await getAdminToken();
        const response = await fetch(`/api/admin/orders/${item.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const result = await response.json();
        if (!response.ok || !result.ok) throw new Error(result.error || "Unable to load order.");
        setSelectedItem(result.data);
      } catch (error) {
        setSelectedItem({ ...item, detailLoading: false });
        setOrderState({ saving: false, error: error.message || "Unable to load order." });
      }
      return;
    }

    if (resource === "customers" && item?.id && meta.mode === "supabase") {
      setSelectedItem({ ...item, detailLoading: true });

      try {
        const token = await getAdminToken();
        const response = await fetch(`/api/admin/customers/${item.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const result = await response.json();
        if (!response.ok || !result.ok) throw new Error(result.error || "Unable to load customer.");
        setSelectedItem(result.data);
      } catch (error) {
        setSelectedItem({ ...item, detailLoading: false });
        setNotice(error.message || "Unable to load customer.");
      }
      return;
    }

    if (resource !== "products" || !item?.id || meta.mode !== "supabase") return;

    try {
      const token = await getAdminToken();
      const response = await fetch(`/api/admin/products/${item.id}/images`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await response.json();
      if (response.ok && result.ok) setSelectedGallery(result.data || []);
    } catch {
      setSelectedGallery([]);
    }
  };

  const updateOrder = async (order, payload) => {
    if (!canManageOrders) {
      setOrderState({ saving: false, error: "Connect Supabase to manage orders." });
      return;
    }

    setOrderState({ saving: true, error: "" });

    try {
      const token = await getAdminToken();
      const response = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Unable to update order.");

      setSelectedItem(result.data);
      setOrderState({ saving: false, error: "" });
      setNotice("Order updated successfully.");
      loadItems();
    } catch (error) {
      setOrderState({ saving: false, error: error.message || "Unable to update order." });
    }
  };

  const submitProduct = async (payload) => {
    if (!canManageProducts) {
      setFormState((current) => ({ ...current, error: "Connect Supabase to manage products." }));
      return;
    }

    setFormState((current) => ({ ...current, saving: true, error: "" }));

    try {
      const token = await getAdminToken();
      const editing = formState.mode === "edit";
      const endpoint = editing ? `/api/admin/products/${formState.product.id}` : "/api/admin/products";
      const response = await fetch(endpoint, {
        method: editing ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Unable to save product.");

      setNotice(editing ? "Product updated successfully." : "Product created successfully.");
      setFormState({ open: false, mode: "create", product: null, error: "", saving: false });
      loadItems();
    } catch (error) {
      setFormState((current) => ({ ...current, saving: false, error: error.message || "Unable to save product." }));
    }
  };

  const deactivateProduct = async (product) => {
    if (!canManageProducts) {
      setNotice("Connect Supabase to manage products.");
      return;
    }

    const confirmed = window.confirm(`Hide ${product.name} from website?\n\nThis product will no longer appear on the website, but it will remain saved in admin.`);
    if (!confirmed) return;

    try {
      const token = await getAdminToken();
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Unable to deactivate product.");

      setSelectedItem(null);
      setSelectedProductIds((current) => current.filter((id) => id !== product.id));
      setNotice("Product deactivated.");
      loadItems();
    } catch (error) {
      setNotice(error.message || "Unable to deactivate product.");
    }
  };

  const deleteProduct = async (product) => {
    if (!canHardDeleteProducts) {
      setNotice("Only owner can permanently delete products.");
      return;
    }

    const confirmed = window.confirm(`Delete ${product.name} permanently?\n\nThis action cannot be undone. Use this only for dummy or test products.`);
    if (!confirmed) return;

    try {
      const token = await getAdminToken();
      const response = await fetch(`/api/admin/products/${product.id}?mode=hard`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Unable to permanently delete product.");

      setSelectedItem(null);
      setSelectedProductIds((current) => current.filter((id) => id !== product.id));
      setNotice(result.message || "Product permanently deleted.");
      loadItems();
    } catch (error) {
      setNotice(error.message || "Unable to permanently delete product.");
    }
  };

  const toggleProductSelection = (productId) => {
    if (!productId || !canManageProducts) return;
    setSelectedProductIds((current) => current.includes(productId) ? current.filter((id) => id !== productId) : [...current, productId]);
  };

  const toggleAllVisibleProducts = () => {
    if (!canManageProducts || !visibleProductIds.length) return;
    setSelectedProductIds((current) => {
      const allSelected = visibleProductIds.every((id) => current.includes(id));
      if (allSelected) return current.filter((id) => !visibleProductIds.includes(id));
      return [...new Set([...current, ...visibleProductIds])];
    });
  };

  const clearProductSelection = () => {
    setSelectedProductIds([]);
  };

  const runBulkProductAction = async (action) => {
    if (!canManageProducts) {
      setNotice("Connect Supabase to manage products.");
      return;
    }

    if (!selectedProductIds.length) return;

    if (action === "delete" && !canHardDeleteProducts) {
      setNotice("Only owner can permanently delete products.");
      return;
    }

    const confirmed = action === "delete"
      ? window.confirm(`Delete products permanently?\n\nThis action cannot be undone. Use this only for dummy or test products.\n\nSelected products: ${selectedProductIds.length}`)
      : window.confirm(`Hide selected products from website?\n\nThese products will no longer appear on the website, but they will remain saved in admin.\n\nSelected products: ${selectedProductIds.length}`);

    if (!confirmed) return;

    try {
      const token = await getAdminToken();
      const response = await fetch("/api/admin/products/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          action,
          productIds: selectedProductIds
        })
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Unable to manage selected products.");

      setNotice(result.message || "Selected products updated.");
      setSelectedProductIds([]);
      setSelectedItem(null);
      loadItems();
    } catch (error) {
      setNotice(error.message || "Unable to manage selected products.");
    }
  };

  const submitCategory = async (payload) => {
    if (!canManageCategories) {
      setCategoryFormState((current) => ({ ...current, error: "Connect Supabase to manage categories." }));
      return;
    }

    setCategoryFormState((current) => ({ ...current, saving: true, error: "" }));

    try {
      const token = await getAdminToken();
      const editing = categoryFormState.mode === "edit";
      const endpoint = editing ? `/api/admin/categories/${categoryFormState.category.id}` : "/api/admin/categories";
      const response = await fetch(endpoint, {
        method: editing ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Unable to save category.");

      setNotice(editing ? "Category updated successfully." : "Category created successfully.");
      setCategoryFormState({ open: false, mode: "create", category: null, error: "", saving: false });
      loadItems();
    } catch (error) {
      setCategoryFormState((current) => ({ ...current, saving: false, error: error.message || "Unable to save category." }));
    }
  };

  const deactivateCategory = async (category) => {
    if (!canManageCategories) {
      setNotice("Connect Supabase to manage categories.");
      return;
    }

    const confirmed = window.confirm(`Deactivate ${category.name}? The category will be hidden publicly.`);
    if (!confirmed) return;

    try {
      const token = await getAdminToken();
      const response = await fetch(`/api/admin/categories/${category.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Unable to deactivate category.");

      setSelectedItem(null);
      setNotice(result.message || "Category deactivated.");
      loadItems();
    } catch (error) {
      setNotice(error.message || "Unable to deactivate category.");
    }
  };

  const toggleCategoryStatus = async (category, nextActive) => {
    if (!canManageCategories) {
      setNotice("Connect Supabase to manage categories.");
      return;
    }

    if (!nextActive) {
      await deactivateCategory(category);
      return;
    }

    try {
      const token = await getAdminToken();
      const response = await fetch(`/api/admin/categories/${category.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...categoryFormToPayload(categoryToForm(category)),
          is_active: true
        })
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Unable to activate category.");

      setSelectedItem(result.data);
      setNotice("Category activated.");
      loadItems();
    } catch (error) {
      setNotice(error.message || "Unable to activate category.");
    }
  };

  const deleteCategory = async (category) => {
    if (!canHardDeleteCategories) {
      setNotice("Only owner can permanently delete categories.");
      return;
    }

    const confirmed = window.confirm(`Delete ${category.name} permanently?\n\nThis is only for dummy or test categories. Products will not be deleted.`);
    if (!confirmed) return;

    try {
      const token = await getAdminToken();
      const response = await fetch(`/api/admin/categories/${category.id}?mode=hard`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Unable to delete category.");

      setSelectedItem(null);
      setNotice(result.message || "Category permanently deleted.");
      loadItems();
    } catch (error) {
      setNotice(error.message || "Unable to delete category.");
    }
  };

  const submitCampaign = async (payload) => {
    if (!canManageCampaigns) {
      setCampaignFormState((current) => ({ ...current, error: "Connect Supabase to manage campaigns." }));
      return;
    }

    setCampaignFormState((current) => ({ ...current, saving: true, error: "" }));

    try {
      const token = await getAdminToken();
      const editing = campaignFormState.mode === "edit";
      const endpoint = editing ? `/api/admin/campaigns/${campaignFormState.campaign.id}` : "/api/admin/campaigns";
      const response = await fetch(endpoint, {
        method: editing ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Unable to save campaign.");

      setNotice(editing ? "Campaign updated successfully." : "Campaign created successfully.");
      setCampaignFormState({ open: false, mode: "create", campaign: null, error: "", saving: false });
      loadItems();
    } catch (error) {
      setCampaignFormState((current) => ({ ...current, saving: false, error: error.message || "Unable to save campaign." }));
    }
  };

  const activateCampaign = async (campaign) => {
    if (!canManageCampaigns) {
      setNotice("Connect Supabase to manage campaigns.");
      return;
    }

    const confirmed = window.confirm(`Activate ${campaign.name}? Other campaigns will be deactivated.`);
    if (!confirmed) return;

    try {
      const token = await getAdminToken();
      const response = await fetch(`/api/admin/campaigns/${campaign.id}/activate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Unable to activate campaign.");

      setNotice("Campaign activated.");
      loadItems();
    } catch (error) {
      setNotice(error.message || "Unable to activate campaign.");
    }
  };

  const deactivateCampaign = async (campaign) => {
    if (!canManageCampaigns) {
      setNotice("Connect Supabase to manage campaigns.");
      return;
    }

    const confirmed = window.confirm(`Deactivate ${campaign.name}? The homepage will use the normal fallback if no campaign is active.`);
    if (!confirmed) return;

    try {
      const token = await getAdminToken();
      const response = await fetch(`/api/admin/campaigns/${campaign.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Unable to deactivate campaign.");

      setNotice(result.message || "Campaign deactivated.");
      loadItems();
    } catch (error) {
      setNotice(error.message || "Unable to deactivate campaign.");
    }
  };

  return (
    <div className="mx-auto max-w-7xl">
      <section className="rounded-3xl border border-[rgba(122,24,61,0.14)] bg-white/74 p-5 shadow-boutique sm:p-7">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#C9962D]">Admin Management</p>
            <h1 className="mt-3 font-display text-3xl font-semibold text-[#7A183D] sm:text-5xl">{config.title}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[#3A2417]/68">{config.description}</p>
            {resource === "products" && !canManageProducts ? <p className="mt-2 text-sm font-bold text-[#7A183D]">Connect Supabase to manage products. Local fallback catalog can be viewed safely.</p> : null}
            {resource === "categories" && !canManageCategories ? <p className="mt-2 text-sm font-bold text-[#7A183D]">Connect Supabase to manage categories. Local fallback categories can be viewed safely.</p> : null}
            {resource === "campaigns" && !canManageCampaigns ? <p className="mt-2 text-sm font-bold text-[#7A183D]">Connect Supabase to manage campaigns. Fallback campaigns stay read-only.</p> : null}
            {resource === "orders" && !canManageOrders ? <p className="mt-2 text-sm font-bold text-[#7A183D]">Connect Supabase to manage live orders. Fallback mode does not show customer orders.</p> : null}
            {resource === "customers" && !canViewCustomers ? <p className="mt-2 text-sm font-bold text-[#7A183D]">Connect Supabase to view customers. Fallback mode does not show customer profiles.</p> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <AdminBadge tone={meta.mode === "supabase" ? "green" : meta.mode === "fallback" ? "gold" : "muted"}>{meta.mode === "supabase" ? "Live database" : meta.mode === "fallback" ? "Local fallback" : meta.mode || "loading"}</AdminBadge>
            <AdminBadge tone="wine">{visibleItems.length} {visibleItems.length === 1 ? "item" : "items"}</AdminBadge>
            {resource === "products" ? (
              <button type="button" onClick={() => openProductForm("create")} disabled={!canManageProducts} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#7A183D] px-4 text-sm font-bold text-white transition hover:bg-[#5f102f] disabled:cursor-not-allowed disabled:opacity-55">
                <Plus className="h-4 w-4" />
                Add Product
              </button>
            ) : null}
            {resource === "categories" ? (
              <button type="button" onClick={() => openCategoryForm("create")} disabled={!canManageCategories} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#7A183D] px-4 text-sm font-bold text-white transition hover:bg-[#5f102f] disabled:cursor-not-allowed disabled:opacity-55">
                <Plus className="h-4 w-4" />
                Add Category
              </button>
            ) : null}
            {resource === "campaigns" ? (
              <button type="button" onClick={() => openCampaignForm("create")} disabled={!canManageCampaigns} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#7A183D] px-4 text-sm font-bold text-white transition hover:bg-[#5f102f] disabled:cursor-not-allowed disabled:opacity-55">
                <Plus className="h-4 w-4" />
                Add Campaign
              </button>
            ) : null}
          </div>
        </div>
      </section>

      {notice ? <div className="mt-4 rounded-xl border border-[rgba(122,24,61,0.14)] bg-[#FFF8EE] p-3 text-sm font-bold text-[#7A183D] shadow-soft">{notice}</div> : null}

      <section className="mt-5 rounded-2xl border border-[rgba(122,24,61,0.14)] bg-white/74 p-4 shadow-soft">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
          <label className="flex min-h-11 items-center gap-2 rounded-lg border border-[rgba(122,24,61,0.14)] bg-[#FFF8EE] px-3">
            <Search className="h-4 w-4 text-[#C9962D]" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={config.searchPlaceholder} className="h-full min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-[#3A2417]/38" />
          </label>

          {resource === "products" ? (
            <AdminSelect
              value={filters.category}
              options={productCategoryFilterOptions}
              placeholder="All categories"
              onChange={(value) => setFilters((current) => ({ ...current, category: value }))}
            />
          ) : null}

          {["products", "categories", "campaigns"].includes(resource) ? (
            <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} className="min-h-11 rounded-lg border border-[rgba(122,24,61,0.14)] bg-[#FFF8EE] px-3 text-sm font-bold text-[#3A2417]">
              <option value="">All status</option>
              <option value="active">Active</option>
              {resource !== "campaigns" ? <option value="featured">Featured</option> : <option value="inactive">Inactive</option>}
            </select>
          ) : null}

          {resource === "orders" ? (
            <>
              <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} className="min-h-11 rounded-lg border border-[rgba(122,24,61,0.14)] bg-[#FFF8EE] px-3 text-sm font-bold text-[#3A2417]">
                <option value="">All status</option>
                {orderStatusOptions.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
              </select>
              <select value={filters.orderType} onChange={(event) => setFilters((current) => ({ ...current, orderType: event.target.value }))} className="min-h-11 rounded-lg border border-[rgba(122,24,61,0.14)] bg-[#FFF8EE] px-3 text-sm font-bold text-[#3A2417]">
                <option value="">All types</option>
                <option value="domestic">Domestic</option>
                <option value="international">International</option>
              </select>
            </>
          ) : null}

          <label className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[rgba(122,24,61,0.14)] bg-[#FFF8EE] px-3">
            <ArrowUpDown className="h-4 w-4 text-[#C9962D]" />
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="bg-transparent text-sm font-bold text-[#3A2417] outline-none">
              <option value="newest">Newest</option>
              {!["orders", "customers"].includes(resource) ? <option value="name">Name</option> : null}
              {resource === "products" ? <option value="price-low">Price low</option> : null}
              {resource === "products" ? <option value="price-high">Price high</option> : null}
              {resource === "categories" ? <option value="sort-order">Sort order</option> : null}
              {resource === "orders" ? <option value="oldest">Oldest</option> : null}
              {resource === "orders" ? <option value="total-high">Total high to low</option> : null}
              {resource === "orders" ? <option value="total-low">Total low to high</option> : null}
              {resource === "customers" ? <option value="oldest">Oldest</option> : null}
              {resource === "customers" ? <option value="most-orders">Most orders</option> : null}
              {resource === "customers" ? <option value="highest-spent">Highest spent</option> : null}
              {resource === "customers" ? <option value="recently-ordered">Recently ordered</option> : null}
            </select>
          </label>
        </div>
      </section>

      <section className="mt-5">
        {state.loading ? (
          <div className="rounded-2xl border border-[rgba(122,24,61,0.14)] bg-white/82 p-8 text-center text-sm font-bold text-[#7A183D] shadow-soft">Loading {config.title.toLowerCase()}...</div>
        ) : state.error ? (
          <div className="rounded-2xl border border-[rgba(122,24,61,0.14)] bg-white/82 p-8 text-center shadow-soft">
            <p className="font-display text-2xl font-semibold text-[#7A183D]">Unable to load {config.title.toLowerCase()}</p>
            <p className="mt-3 text-sm font-semibold text-[#3A2417]/64">{state.error}</p>
          </div>
        ) : visibleItems.length ? (
          <Table
            resource={resource}
            items={visibleItems}
            selectedProductIds={selectedProductIds}
            allVisibleProductsSelected={allVisibleProductsSelected}
            onToggleAllVisibleProducts={toggleAllVisibleProducts}
            onToggleProductSelection={toggleProductSelection}
            onView={viewItem}
            onEditProduct={(product) => openProductForm("edit", product)}
            onDeactivateProduct={deactivateProduct}
            onDeleteProduct={deleteProduct}
            canManageProducts={canManageProducts}
            canHardDeleteProducts={canHardDeleteProducts}
            onEditCategory={(category) => openCategoryForm("edit", category)}
            onDeactivateCategory={deactivateCategory}
            onDeleteCategory={deleteCategory}
            canManageCategories={canManageCategories}
            canHardDeleteCategories={canHardDeleteCategories}
            onEditCampaign={(campaign) => openCampaignForm("edit", campaign)}
            onActivateCampaign={activateCampaign}
            onDeactivateCampaign={deactivateCampaign}
            canManageCampaigns={canManageCampaigns}
          />
        ) : (
          <div className="rounded-2xl border border-[rgba(122,24,61,0.14)] bg-white/82 p-8 text-center shadow-soft">
            <p className="font-display text-2xl font-semibold text-[#7A183D]">{config.emptyTitle}</p>
            <p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-6 text-[#3A2417]/64">{config.emptyText}</p>
            {["orders", "customers"].includes(resource) ? <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-[#C9962D]">Demo/fallback mode does not show fake customer data.</p> : null}
          </div>
        )}
      </section>

      {resource === "products" && selectedProductIds.length ? (
        <div className="sticky bottom-4 z-30 mt-5 rounded-2xl border border-[rgba(122,24,61,0.14)] bg-white/95 p-3 shadow-boutique backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-bold text-[#3A2417]">{selectedProductIds.length} selected</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => runBulkProductAction("deactivate")} disabled={!canManageProducts} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[rgba(122,24,61,0.14)] bg-[#FFF8EE] px-4 text-sm font-bold text-[#7A183D] disabled:cursor-not-allowed disabled:opacity-55">
                <Power className="h-4 w-4" />
                Hide from website
              </button>
              <button type="button" onClick={() => runBulkProductAction("delete")} disabled={!canHardDeleteProducts} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-rose-500/25 bg-rose-50 px-4 text-sm font-bold text-rose-700 disabled:cursor-not-allowed disabled:opacity-55">
                <Trash2 className="h-4 w-4" />
                Delete permanently
              </button>
              <button type="button" onClick={clearProductSelection} className="inline-flex min-h-10 items-center rounded-lg border border-[rgba(122,24,61,0.14)] bg-white px-4 text-sm font-bold text-[#3A2417]/70">
                Clear
              </button>
            </div>
          </div>
          {!canHardDeleteProducts ? <p className="mt-2 text-xs font-bold text-[#3A2417]/56">Permanent delete is owner-only.</p> : null}
        </div>
      ) : null}

      {resource === "orders" ? (
        <OrderDetailDrawer
          order={selectedItem}
          saving={orderState.saving}
          error={orderState.error}
          canManageOrders={canManageOrders}
          onClose={() => setSelectedItem(null)}
          onSave={updateOrder}
        />
      ) : resource === "customers" ? (
        <CustomerDetailDrawer
          customer={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      ) : (
        <DetailsDrawer
          item={selectedItem}
          resource={resource}
          gallery={selectedGallery}
          onClose={() => setSelectedItem(null)}
          onEdit={(product) => openProductForm("edit", product)}
          onDeactivate={deactivateProduct}
          onDelete={deleteProduct}
          canManageProducts={canManageProducts}
          canHardDeleteProducts={canHardDeleteProducts}
          onEditCategory={(category) => openCategoryForm("edit", category)}
          onToggleCategoryStatus={toggleCategoryStatus}
          onDeleteCategory={deleteCategory}
          canManageCategories={canManageCategories}
          canHardDeleteCategories={canHardDeleteCategories}
        />
      )}
      {formState.open ? (
        <ProductFormDrawer
          mode={formState.mode}
          product={formState.product}
          products={items}
          categories={categoryOptions}
          canManageProducts={canManageProducts}
          saving={formState.saving}
          error={formState.error}
          onClose={() => setFormState({ open: false, mode: "create", product: null, error: "", saving: false })}
          onSubmit={submitProduct}
        />
      ) : null}
      {categoryFormState.open ? (
        <CategoryFormDrawer
          mode={categoryFormState.mode}
          category={categoryFormState.category}
          saving={categoryFormState.saving}
          error={categoryFormState.error}
          canManageCategories={canManageCategories}
          onClose={() => setCategoryFormState({ open: false, mode: "create", category: null, error: "", saving: false })}
          onSubmit={submitCategory}
        />
      ) : null}
      {campaignFormState.open ? (
        <CampaignFormDrawer
          mode={campaignFormState.mode}
          campaign={campaignFormState.campaign}
          categories={categoryOptions}
          saving={campaignFormState.saving}
          error={campaignFormState.error}
          canManageCampaigns={canManageCampaigns}
          onClose={() => setCampaignFormState({ open: false, mode: "create", campaign: null, error: "", saving: false })}
          onSubmit={submitCampaign}
        />
      ) : null}
    </div>
  );
}

export default function AdminManagementExperience({ resource }) {
  return (
    <AdminAuthGate>
      {(admin) => (
        <AdminLayoutShell admin={admin}>
          <ManagementContent resource={resource} admin={admin} />
        </AdminLayoutShell>
      )}
    </AdminAuthGate>
  );
}
