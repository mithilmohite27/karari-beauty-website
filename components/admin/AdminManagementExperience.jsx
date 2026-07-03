"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ArrowUpDown, Eye, Loader2, Pencil, Plus, Power, Search, X } from "lucide-react";
import AdminAuthGate from "@/components/admin/AdminAuthGate";
import AdminBadge from "@/components/admin/AdminBadge";
import AdminLayoutShell from "@/components/admin/AdminLayoutShell";
import { generateSku, generateSlug } from "@/lib/productIdentifiers";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

const resourceConfig = {
  products: {
    title: "Products",
    description: "Manage boutique products with image URL fields. Uploads come in the next phase.",
    endpoint: "/api/admin/products",
    searchPlaceholder: "Search product name, slug or SKU",
    emptyTitle: "No products found",
    emptyText: "Products will appear here after the catalog is seeded or connected.",
    defaultSort: "newest"
  },
  categories: {
    title: "Categories",
    description: "Read-only category overview for storefront collections.",
    endpoint: "/api/admin/categories",
    searchPlaceholder: "Search category name or slug",
    emptyTitle: "No categories found",
    emptyText: "Categories will appear here after setup.",
    defaultSort: "sort-order"
  },
  orders: {
    title: "Orders",
    description: "Read-only customer order requests. Status updates come in a future phase.",
    endpoint: "/api/admin/orders",
    searchPlaceholder: "Search order number, customer or phone",
    emptyTitle: "No live orders yet",
    emptyText: "Customer order requests will appear here after checkout is connected to Supabase.",
    defaultSort: "newest"
  },
  campaigns: {
    title: "Campaigns",
    description: "Read-only seasonal campaign view. Campaign editing and activation come next.",
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
  sort_order: 0
};

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
    sort_order: product.sortOrder || 0
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
    category_id: form.category_id || null,
    category_slug: form.category_slug || null,
    category_name: form.category_name || null
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

function boolBadge(value, trueLabel = "Yes", falseLabel = "No") {
  return <AdminBadge tone={value ? "green" : "muted"}>{value ? trueLabel : falseLabel}</AdminBadge>;
}

function textForSearch(item, resource) {
  if (resource === "products") return [item.name, item.slug, item.sku, item.category, item.categorySlug].join(" ");
  if (resource === "categories") return [item.name, item.slug, item.description].join(" ");
  if (resource === "orders") return [item.orderNumber, item.customerName, item.customerPhone, item.customerEmail, item.status].join(" ");
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

function DetailsDrawer({ item, resource, gallery = [], onClose, onEdit, onDeactivate, canManageProducts }) {
  if (!item) return null;

  const entries = Object.entries(item).filter(([, value]) => value !== undefined && value !== null && value !== "");

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#3A2417]/35">
      <aside className="h-full w-full max-w-md overflow-y-auto bg-[#FFF8EE] p-5 shadow-boutique">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#C9962D]">Read-only Details</p>
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
              Deactivate
            </button>
          </div>
        ) : (
          <p className="mt-5 rounded-xl bg-[#FCE7EC] p-3 text-sm font-bold text-[#7A183D]">Editing comes in the next admin phase.</p>
        )}
      </aside>
    </div>
  );
}

function ProductRows({ items, onView, onEdit, onDeactivate, canManageProducts }) {
  return items.map((item) => (
    <tr key={item.id || item.slug} className="border-b border-[rgba(122,24,61,0.08)]">
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
          <button type="button" onClick={() => onDeactivate(item)} disabled={!canManageProducts || item.isActive === false} className="inline-flex items-center gap-1 rounded-md border border-[rgba(122,24,61,0.14)] bg-white px-3 py-2 text-xs font-bold text-[#7A183D] disabled:cursor-not-allowed disabled:opacity-50"><Power className="h-3.5 w-3.5" />Off</button>
        </div>
      </td>
    </tr>
  ));
}

function CategoryRows({ items, onView }) {
  return items.map((item) => (
    <tr key={item.id || item.slug} className="border-b border-[rgba(122,24,61,0.08)]">
      <td className="px-3 py-3">
        <span className="relative block h-12 w-12 overflow-hidden rounded-lg bg-[#FFF8EE]">
          {item.image ? <Image src={item.image} alt={item.name} fill sizes="3rem" className="object-cover" /> : null}
        </span>
      </td>
      <td className="px-3 py-3 font-bold text-[#3A2417]">{item.name}</td>
      <td className="px-3 py-3">{item.slug}</td>
      <td className="max-w-xs px-3 py-3 text-[#3A2417]/62">{item.description}</td>
      <td className="px-3 py-3">{boolBadge(item.featured, "Featured", "No")}</td>
      <td className="px-3 py-3">{boolBadge(item.isActive !== false, "Active", "Inactive")}</td>
      <td className="px-3 py-3">{item.sortOrder ?? 0}</td>
      <td className="px-3 py-3 font-bold text-[#7A183D]">{item.productCount ?? 0}</td>
      <td className="px-3 py-3"><button type="button" onClick={() => onView(item)} className="rounded-md border border-[rgba(122,24,61,0.14)] bg-white px-3 py-2 text-xs font-bold text-[#7A183D]">View</button></td>
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

function CampaignRows({ items, onView }) {
  return items.map((item) => (
    <tr key={item.id || item.slug || item.name} className="border-b border-[rgba(122,24,61,0.08)]">
      <td className="px-3 py-3 font-bold text-[#3A2417]">{item.name}</td>
      <td className="px-3 py-3">{item.slug || "—"}</td>
      <td className="px-3 py-3"><AdminBadge tone="gold">{item.theme || "campaign"}</AdminBadge></td>
      <td className="px-3 py-3">{boolBadge(item.active || item.isActive, "Active", "Inactive")}</td>
      <td className="px-3 py-3">{formatDate(item.startDate)}</td>
      <td className="px-3 py-3">{formatDate(item.endDate)}</td>
      <td className="px-3 py-3">{item.offerLabel || item.offer || "—"}</td>
      <td className="px-3 py-3">{(item.featuredCategorySlugs || item.featuredCategories || []).join(", ") || "—"}</td>
      <td className="px-3 py-3"><button type="button" onClick={() => onView(item)} className="rounded-md border border-[rgba(122,24,61,0.14)] bg-white px-3 py-2 text-xs font-bold text-[#7A183D]">View</button></td>
    </tr>
  ));
}

function Table({ resource, items, onView, onEditProduct, onDeactivateProduct, canManageProducts }) {
  const headers = {
    products: ["Image", "Product", "Category", "Price", "Original", "Discount", "Featured", "Active", "Stock", "Created", "Action"],
    categories: ["Image", "Name", "Slug", "Description", "Featured", "Active", "Sort", "Products", "Action"],
    orders: ["Order", "Customer", "Contact", "Type", "Payment", "Total", "Status", "Created", "Items", "Action"],
    campaigns: ["Campaign", "Slug", "Theme", "Active", "Start", "End", "Offer", "Featured Categories", "Action"]
  };

  const rows = {
    products: <ProductRows items={items} onView={onView} onEdit={onEditProduct} onDeactivate={onDeactivateProduct} canManageProducts={canManageProducts} />,
    categories: <CategoryRows items={items} onView={onView} />,
    orders: <OrderRows items={items} onView={onView} />,
    campaigns: <CampaignRows items={items} onView={onView} />
  };

  return (
    <div className="overflow-x-auto rounded-2xl border border-[rgba(122,24,61,0.14)] bg-white/82 shadow-soft">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-[#FFF8EE] text-xs font-bold uppercase tracking-[0.14em] text-[#C9962D]">
          <tr>
            {headers[resource].map((header) => (
              <th key={header} className="whitespace-nowrap px-3 py-3">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="text-[#3A2417]/72">{rows[resource]}</tbody>
      </table>
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

  const selectCategory = (categoryId) => {
    const category = categories.find((item) => item.id === categoryId);
    setForm((current) => {
      const next = {
        ...current,
        category_id: category?.id || "",
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
                <select value={form.category_id} onChange={(event) => selectCategory(event.target.value)} className="min-h-11 rounded-lg border border-[rgba(122,24,61,0.14)] bg-white px-3 outline-none focus:border-[#C9962D]">
                  <option value="">Select category</option>
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
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
                {form.image_url ? <img src={form.image_url} alt="Product preview" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center px-3 text-center text-xs font-bold text-[#3A2417]/42">No image</div>}
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

function ManagementContent({ resource }) {
  const config = resourceConfig[resource];
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ total: 0, mode: "" });
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({ status: "", category: "", orderType: "" });
  const [sortBy, setSortBy] = useState(config.defaultSort);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedGallery, setSelectedGallery] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [formState, setFormState] = useState({ open: false, mode: "create", product: null, error: "", saving: false });
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

        if (resource === "products") {
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
  const statuses = useMemo(() => [...new Set(items.map((item) => item.status).filter(Boolean))], [items]);
  const visibleItems = useMemo(() => sortItems(filterItems(items, resource, query, filters), resource, sortBy), [filters, items, query, resource, sortBy]);
  const canManageProducts = resource === "products" && meta.mode === "supabase";

  const openProductForm = (mode, product = null) => {
    setNotice("");
    setSelectedItem(null);
    setFormState({ open: true, mode, product, error: "", saving: false });
  };

  const viewItem = async (item) => {
    setSelectedItem(item);
    setSelectedGallery([]);

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

    const confirmed = window.confirm(`Deactivate ${product.name}? This will hide it from the public storefront.`);
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
      setNotice("Product deactivated.");
      loadItems();
    } catch (error) {
      setNotice(error.message || "Unable to deactivate product.");
    }
  };

  return (
    <div className="mx-auto max-w-7xl">
      <section className="rounded-3xl border border-[rgba(122,24,61,0.14)] bg-white/74 p-5 shadow-boutique sm:p-7">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#C9962D]">Read-only Management</p>
            <h1 className="mt-3 font-display text-3xl font-semibold text-[#7A183D] sm:text-5xl">{config.title}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[#3A2417]/68">{config.description}</p>
            {resource === "products" && !canManageProducts ? <p className="mt-2 text-sm font-bold text-[#7A183D]">Connect Supabase to manage products. Fallback catalog stays read-only.</p> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <AdminBadge tone={meta.mode === "supabase" ? "green" : meta.mode === "fallback" ? "gold" : "muted"}>{meta.mode || "loading"}</AdminBadge>
            <AdminBadge tone="wine">{visibleItems.length} {visibleItems.length === 1 ? "item" : "items"}</AdminBadge>
            {resource === "products" ? (
              <button type="button" onClick={() => openProductForm("create")} disabled={!canManageProducts} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#7A183D] px-4 text-sm font-bold text-white transition hover:bg-[#5f102f] disabled:cursor-not-allowed disabled:opacity-55">
                <Plus className="h-4 w-4" />
                Add Product
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
            <select value={filters.category} onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))} className="min-h-11 rounded-lg border border-[rgba(122,24,61,0.14)] bg-[#FFF8EE] px-3 text-sm font-bold text-[#3A2417]">
              <option value="">All categories</option>
              {categories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
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
                {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
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
              <option value="name">Name</option>
              {resource === "products" ? <option value="price-low">Price low</option> : null}
              {resource === "products" ? <option value="price-high">Price high</option> : null}
              {resource === "categories" ? <option value="sort-order">Sort order</option> : null}
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
          <Table resource={resource} items={visibleItems} onView={viewItem} onEditProduct={(product) => openProductForm("edit", product)} onDeactivateProduct={deactivateProduct} canManageProducts={canManageProducts} />
        ) : (
          <div className="rounded-2xl border border-[rgba(122,24,61,0.14)] bg-white/82 p-8 text-center shadow-soft">
            <p className="font-display text-2xl font-semibold text-[#7A183D]">{config.emptyTitle}</p>
            <p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-6 text-[#3A2417]/64">{config.emptyText}</p>
            {resource === "orders" ? <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-[#C9962D]">Demo/fallback mode does not show fake customer orders.</p> : null}
          </div>
        )}
      </section>

      <DetailsDrawer item={selectedItem} resource={resource} gallery={selectedGallery} onClose={() => setSelectedItem(null)} onEdit={(product) => openProductForm("edit", product)} onDeactivate={deactivateProduct} canManageProducts={canManageProducts} />
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
    </div>
  );
}

export default function AdminManagementExperience({ resource }) {
  return (
    <AdminAuthGate>
      {(admin) => (
        <AdminLayoutShell admin={admin}>
          <ManagementContent resource={resource} />
        </AdminLayoutShell>
      )}
    </AdminAuthGate>
  );
}
