import { Database, ShieldCheck } from "lucide-react";

export default function AdminSetupRequired({ compact = false }) {
  return (
    <div className={`rounded-2xl border border-[rgba(122,24,61,0.14)] bg-white/82 shadow-boutique ${compact ? "p-5" : "p-6 sm:p-8"}`}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[rgba(201,150,45,0.32)] bg-[#FFF8EE] text-[#C9962D]">
        <Database className="h-5 w-5" />
      </div>
      <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-[#C9962D]">Setup Required</p>
      <h2 className="mt-2 font-display text-2xl font-semibold text-[#7A183D]">Admin login requires Supabase configuration.</h2>
      <p className="mt-3 text-sm leading-6 text-[#3A2417]/68">
        Add the Supabase URL, anon key and server-only service role key before accessing the Karari Beauty admin panel.
      </p>
      <div className="mt-5 rounded-xl border border-[rgba(122,24,61,0.12)] bg-[#FFF8EE] p-4 text-sm font-semibold leading-6 text-[#3A2417]/72">
        <p className="flex items-center gap-2 font-bold text-[#7A183D]">
          <ShieldCheck className="h-4 w-4 text-[#C9962D]" />
          Required env vars
        </p>
        <ul className="mt-3 space-y-1">
          <li>NEXT_PUBLIC_SUPABASE_URL</li>
          <li>NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
          <li>SUPABASE_SERVICE_ROLE_KEY</li>
        </ul>
      </div>
    </div>
  );
}
