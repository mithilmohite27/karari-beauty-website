"use client";

import { useEffect, useState } from "react";
import { Loader2, RotateCcw, Save } from "lucide-react";
import AdminAuthGate from "@/components/admin/AdminAuthGate";
import AdminBadge from "@/components/admin/AdminBadge";
import AdminLayoutShell from "@/components/admin/AdminLayoutShell";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

const emptySettings = {
  business: { name: "", tagline: "", shortDescription: "", logoUrl: "", faviconUrl: "" },
  contact: { whatsappNumber: "", phoneNumber: "", email: "", address: "", city: "", state: "", country: "", mapsUrl: "", timings: "" },
  social: { instagramUrl: "", facebookUrl: "", youtubeUrl: "" },
  website: { defaultCountry: "", defaultCurrency: "", announcementLine: "", internationalInquiryMessage: "" },
  ordering: { checkoutEnabled: true, whatsappSupportEnabled: true, upiDisplayText: "" },
  seo: { siteTitle: "", metaDescription: "", ogImageUrl: "" }
};

async function getAdminToken() {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) return "";
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || "";
}

function cloneSettings(settings) {
  return JSON.parse(JSON.stringify(settings || emptySettings));
}

function getValue(settings, path) {
  const [section, field] = path.split(".");
  return settings?.[section]?.[field] ?? "";
}

function setValue(settings, path, value) {
  const [section, field] = path.split(".");
  return {
    ...settings,
    [section]: {
      ...(settings[section] || {}),
      [field]: value
    }
  };
}

function Field({ label, path, value, onChange, type = "text", as = "input", rows = 3, placeholder = "" }) {
  const Input = as;

  return (
    <label className="grid gap-1.5 text-sm font-bold text-[#3A2417]">
      {label}
      <Input
        type={as === "input" ? type : undefined}
        rows={as === "textarea" ? rows : undefined}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(path, event.target.value)}
        className="min-h-11 rounded-lg border border-[rgba(122,24,61,0.14)] bg-[#FFF8EE] px-3 py-2 text-sm font-semibold text-[#3A2417] outline-none transition placeholder:text-[#3A2417]/34 focus:border-[#C9962D]"
      />
    </label>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex min-h-12 items-center justify-between gap-4 rounded-lg border border-[rgba(122,24,61,0.14)] bg-[#FFF8EE] px-3 text-left text-sm font-bold text-[#3A2417]"
    >
      <span>{label}</span>
      <span className={`relative h-6 w-11 rounded-full transition ${checked ? "bg-[#7A183D]" : "bg-[#3A2417]/18"}`}>
        <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${checked ? "left-6" : "left-1"}`} />
      </span>
    </button>
  );
}

function SettingsCard({ title, children }) {
  return (
    <section className="rounded-2xl border border-[rgba(122,24,61,0.14)] bg-white/78 p-4 shadow-soft sm:p-5">
      <h2 className="font-display text-2xl font-semibold text-[#7A183D]">{title}</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

function SettingsContent() {
  const [settings, setSettings] = useState(emptySettings);
  const [savedSettings, setSavedSettings] = useState(emptySettings);
  const [state, setState] = useState({ loading: true, saving: false, error: "", notice: "", mode: "" });

  useEffect(() => {
    let mounted = true;

    async function loadSettings() {
      setState((current) => ({ ...current, loading: true, error: "", notice: "" }));

      try {
        const token = await getAdminToken();
        if (!token) throw new Error("Admin sign-in required.");

        const response = await fetch("/api/admin/settings", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const result = await response.json();
        if (!response.ok || !result.ok) throw new Error(result.error || "Unable to load settings.");

        if (mounted) {
          const next = cloneSettings(result.data);
          setSettings(next);
          setSavedSettings(next);
          setState({ loading: false, saving: false, error: "", notice: "", mode: result.meta?.mode || "" });
        }
      } catch (error) {
        if (mounted) setState({ loading: false, saving: false, error: error.message || "Unable to load settings.", notice: "", mode: "" });
      }
    }

    loadSettings();

    return () => {
      mounted = false;
    };
  }, []);

  const updateField = (path, value) => {
    setSettings((current) => setValue(current, path, value));
  };

  const updateToggle = (path, value) => {
    setSettings((current) => setValue(current, path, value));
  };

  const resetChanges = () => {
    setSettings(cloneSettings(savedSettings));
    setState((current) => ({ ...current, error: "", notice: "Changes reset." }));
  };

  const saveSettings = async () => {
    setState((current) => ({ ...current, saving: true, error: "", notice: "" }));

    try {
      const token = await getAdminToken();
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Unable to save settings.");

      const next = cloneSettings(result.data);
      setSettings(next);
      setSavedSettings(next);
      setState({ loading: false, saving: false, error: "", notice: "Settings saved successfully.", mode: result.meta?.mode || "supabase" });
    } catch (error) {
      setState((current) => ({ ...current, saving: false, error: error.message || "Unable to save settings." }));
    }
  };

  const field = (label, path, options = {}) => (
    <Field label={label} path={path} value={getValue(settings, path)} onChange={updateField} {...options} />
  );

  return (
    <div className="mx-auto max-w-7xl">
      <section className="rounded-3xl border border-[rgba(122,24,61,0.14)] bg-white/74 p-5 shadow-boutique sm:p-7">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#C9962D]">Admin Settings</p>
            <h1 className="mt-3 font-display text-3xl font-semibold text-[#7A183D] sm:text-5xl">Settings</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[#3A2417]/68">Manage Karari Beauty business details, contact information and website defaults.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <AdminBadge tone={state.mode === "supabase" ? "green" : "muted"}>{state.mode === "supabase" ? "Live database" : state.mode || "loading"}</AdminBadge>
          </div>
        </div>
      </section>

      {state.notice ? <div className="mt-4 rounded-xl border border-[rgba(122,24,61,0.14)] bg-[#FFF8EE] p-3 text-sm font-bold text-[#7A183D] shadow-soft">{state.notice}</div> : null}
      {state.error ? <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-50 p-3 text-sm font-bold text-rose-700 shadow-soft">{state.error}</div> : null}

      {state.loading ? (
        <div className="mt-5 rounded-2xl border border-[rgba(122,24,61,0.14)] bg-white/82 p-8 text-center text-sm font-bold text-[#7A183D] shadow-soft">Loading settings...</div>
      ) : (
        <div className="mt-5 grid gap-5">
          <SettingsCard title="Business Profile">
            {field("Business name", "business.name")}
            {field("Tagline", "business.tagline")}
            {field("Short description", "business.shortDescription", { as: "textarea", rows: 4 })}
            {field("Logo URL", "business.logoUrl")}
            {field("Favicon URL", "business.faviconUrl")}
          </SettingsCard>

          <SettingsCard title="Contact Details">
            {field("WhatsApp number", "contact.whatsappNumber")}
            {field("Phone number", "contact.phoneNumber")}
            {field("Email", "contact.email", { type: "email" })}
            {field("Address", "contact.address", { as: "textarea", rows: 3 })}
            {field("City", "contact.city")}
            {field("State", "contact.state")}
            {field("Country", "contact.country")}
            {field("Google Maps URL", "contact.mapsUrl")}
            {field("Business timings", "contact.timings")}
          </SettingsCard>

          <SettingsCard title="Social Links">
            {field("Instagram URL", "social.instagramUrl")}
            {field("Facebook URL", "social.facebookUrl")}
            {field("YouTube URL", "social.youtubeUrl")}
          </SettingsCard>

          <SettingsCard title="Website Defaults">
            {field("Default country", "website.defaultCountry")}
            {field("Default currency", "website.defaultCurrency")}
            {field("Announcement line", "website.announcementLine", { as: "textarea", rows: 3 })}
            {field("International inquiry message", "website.internationalInquiryMessage", { as: "textarea", rows: 3, placeholder: "Use {country} for selected country name" })}
          </SettingsCard>

          <SettingsCard title="Ordering Settings">
            <Toggle label="Enable checkout/order requests" checked={Boolean(settings.ordering.checkoutEnabled)} onChange={(value) => updateToggle("ordering.checkoutEnabled", value)} />
            <Toggle label="Enable WhatsApp support" checked={Boolean(settings.ordering.whatsappSupportEnabled)} onChange={(value) => updateToggle("ordering.whatsappSupportEnabled", value)} />
            {field("UPI/GPay display text", "ordering.upiDisplayText", { as: "textarea", rows: 3 })}
          </SettingsCard>

          <SettingsCard title="SEO Basics">
            {field("Site title", "seo.siteTitle")}
            {field("Meta description", "seo.metaDescription", { as: "textarea", rows: 4 })}
            {field("Open Graph image URL", "seo.ogImageUrl")}
          </SettingsCard>

          <div className="sticky bottom-4 z-20 rounded-2xl border border-[rgba(122,24,61,0.14)] bg-white/95 p-3 shadow-boutique backdrop-blur">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <button type="button" onClick={resetChanges} disabled={state.saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[rgba(122,24,61,0.14)] bg-[#FFF8EE] px-4 text-sm font-bold text-[#7A183D] disabled:opacity-55">
                <RotateCcw className="h-4 w-4" />
                Reset changes
              </button>
              <button type="button" onClick={saveSettings} disabled={state.saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#7A183D] px-5 text-sm font-bold text-white transition hover:bg-[#5f102f] disabled:opacity-55">
                {state.saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {state.saving ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminSettingsExperience() {
  return (
    <AdminAuthGate>
      {(admin) => (
        <AdminLayoutShell admin={admin}>
          <SettingsContent />
        </AdminLayoutShell>
      )}
    </AdminAuthGate>
  );
}
