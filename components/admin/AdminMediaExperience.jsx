"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpDown, Copy, ExternalLink, ImagePlus, Loader2, Search, Trash2, Upload } from "lucide-react";
import AdminAuthGate from "@/components/admin/AdminAuthGate";
import AdminBadge from "@/components/admin/AdminBadge";
import AdminLayoutShell from "@/components/admin/AdminLayoutShell";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

async function getAdminToken() {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) return "";
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || "";
}

function formatFileSize(size) {
  const value = Number(size || 0);
  if (!value) return "Size not available";
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value) {
  if (!value) return "Date not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date not available";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function MediaCard({ item, onCopy, onDelete }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-[rgba(122,24,61,0.14)] bg-white/82 shadow-soft">
      <div className="aspect-[4/3] bg-[#FFF8EE]">
        <img src={item.publicUrl} alt={item.name} className="h-full w-full object-cover" loading="lazy" />
      </div>
      <div className="space-y-3 p-4">
        <div>
          <p className="truncate text-sm font-bold text-[#3A2417]" title={item.name}>{item.name}</p>
          <p className="mt-1 text-xs font-semibold text-[#3A2417]/54">{formatFileSize(item.size)} - {formatDate(item.createdAt)}</p>
        </div>
        <AdminBadge tone="gold">Uploaded media</AdminBadge>
        <div className="grid grid-cols-3 gap-2">
          <button type="button" onClick={() => onCopy(item.publicUrl)} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[rgba(122,24,61,0.14)] bg-[#FFF8EE] text-[#7A183D] transition hover:border-[#C9962D]" aria-label="Copy image link">
            <Copy className="h-4 w-4" />
          </button>
          <a href={item.publicUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[rgba(122,24,61,0.14)] bg-[#FFF8EE] text-[#7A183D] transition hover:border-[#C9962D]" aria-label="Open image">
            <ExternalLink className="h-4 w-4" />
          </a>
          <button type="button" onClick={() => onDelete(item)} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-rose-500/20 bg-rose-50 text-rose-700 transition hover:border-rose-500/40" aria-label="Delete image">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}

function MediaContent() {
  const fileInputRef = useRef(null);
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [state, setState] = useState({ loading: true, uploading: false, error: "", notice: "", mode: "" });

  const loadMedia = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: "" }));

    try {
      const token = await getAdminToken();
      if (!token) throw new Error("Admin sign-in required.");

      const response = await fetch(`/api/admin/media?search=${encodeURIComponent(query)}&sort=${encodeURIComponent(sortBy)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Unable to load media library.");

      setItems(result.data || []);
      setState((current) => ({ ...current, loading: false, error: "", mode: result.meta?.mode || "" }));
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error.message || "Unable to load media library." }));
    }
  }, [query, sortBy]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadMedia();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [loadMedia]);

  const uploadFile = async (file) => {
    if (!file) return;

    setState((current) => ({ ...current, uploading: true, error: "", notice: "" }));

    try {
      const token = await getAdminToken();
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/admin/media", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Unable to upload image.");

      setState((current) => ({ ...current, uploading: false, notice: "Image uploaded successfully." }));
      setItems((current) => [result.data, ...current]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      setState((current) => ({ ...current, uploading: false, error: error.message || "Unable to upload image." }));
    }
  };

  const copyUrl = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      setState((current) => ({ ...current, notice: "Image link copied." }));
    } catch {
      setState((current) => ({ ...current, error: "Unable to copy image link." }));
    }
  };

  const deleteMedia = async (item) => {
    const confirmed = window.confirm("Delete this uploaded image? If it is used on a product, category or campaign, that image may stop showing.");
    if (!confirmed) return;

    try {
      const token = await getAdminToken();
      const response = await fetch("/api/admin/media/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ storagePath: item.storagePath })
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Unable to delete image.");

      setItems((current) => current.filter((media) => media.storagePath !== item.storagePath));
      setState((current) => ({ ...current, notice: "Image deleted." }));
    } catch (error) {
      setState((current) => ({ ...current, error: error.message || "Unable to delete image." }));
    }
  };

  const visibleItems = useMemo(() => items, [items]);

  return (
    <div className="mx-auto max-w-7xl">
      <section className="rounded-3xl border border-[rgba(122,24,61,0.14)] bg-white/74 p-5 shadow-boutique sm:p-7">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#C9962D]">Media Library</p>
            <h1 className="mt-3 font-display text-3xl font-semibold text-[#7A183D] sm:text-5xl">Media Library</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[#3A2417]/68">Upload and manage product, category and campaign images.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <AdminBadge tone={state.mode === "supabase" ? "green" : "muted"}>{state.mode === "supabase" ? "Live database" : state.mode || "loading"}</AdminBadge>
            <AdminBadge tone="wine">{visibleItems.length} images</AdminBadge>
          </div>
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-[rgba(122,24,61,0.14)] bg-white/78 p-4 shadow-soft">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="rounded-2xl border border-dashed border-[#C9962D]/45 bg-[#FFF8EE] p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#C9962D]">
                  <ImagePlus className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-display text-2xl font-semibold text-[#7A183D]">Upload Panel</h2>
                  <p className="mt-1 text-sm font-semibold text-[#3A2417]/62">JPG, PNG or WebP. Maximum 5MB.</p>
                </div>
              </div>
              <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#7A183D] px-5 text-sm font-bold text-white transition hover:bg-[#5f102f]">
                {state.uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {state.uploading ? "Uploading..." : "Upload Image"}
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" disabled={state.uploading} onChange={(event) => uploadFile(event.target.files?.[0])} className="hidden" />
              </label>
            </div>
          </div>

          <div className="grid gap-2">
            <label className="flex min-h-11 items-center gap-2 rounded-lg border border-[rgba(122,24,61,0.14)] bg-[#FFF8EE] px-3">
              <Search className="h-4 w-4 text-[#C9962D]" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search image name" className="h-full min-w-0 bg-transparent text-sm font-semibold outline-none placeholder:text-[#3A2417]/38" />
            </label>
            <label className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[rgba(122,24,61,0.14)] bg-[#FFF8EE] px-3">
              <ArrowUpDown className="h-4 w-4 text-[#C9962D]" />
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="bg-transparent text-sm font-bold text-[#3A2417] outline-none">
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </label>
          </div>
        </div>

        {state.notice ? <p className="mt-4 rounded-xl border border-[rgba(122,24,61,0.14)] bg-[#FFF8EE] p-3 text-sm font-bold text-[#7A183D]">{state.notice}</p> : null}
        {state.error ? <p className="mt-4 rounded-xl border border-rose-500/20 bg-rose-50 p-3 text-sm font-bold text-rose-700">{state.error}</p> : null}
      </section>

      <section className="mt-5">
        {state.loading ? (
          <div className="rounded-2xl border border-[rgba(122,24,61,0.14)] bg-white/82 p-8 text-center text-sm font-bold text-[#7A183D] shadow-soft">Loading media library...</div>
        ) : visibleItems.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {visibleItems.map((item) => <MediaCard key={item.storagePath} item={item} onCopy={copyUrl} onDelete={deleteMedia} />)}
          </div>
        ) : (
          <div className="rounded-2xl border border-[rgba(122,24,61,0.14)] bg-white/82 p-8 text-center shadow-soft">
            <ImagePlus className="mx-auto h-10 w-10 text-[#C9962D]" />
            <p className="mt-4 font-display text-2xl font-semibold text-[#7A183D]">No media uploaded yet.</p>
            <p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-6 text-[#3A2417]/64">Upload your first product, category or campaign image to start building the media library.</p>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-[#7A183D] px-5 text-sm font-bold text-white">Upload first image</button>
          </div>
        )}
      </section>
    </div>
  );
}

export default function AdminMediaExperience() {
  return (
    <AdminAuthGate>
      {(admin) => (
        <AdminLayoutShell admin={admin}>
          <MediaContent />
        </AdminLayoutShell>
      )}
    </AdminAuthGate>
  );
}
