"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, LockKeyhole, Mail, ShieldCheck, Sparkles } from "lucide-react";
import AdminSetupRequired from "@/components/admin/AdminSetupRequired";
import { createBrowserSupabaseClient, isSupabasePublicConfigured } from "@/lib/supabase/browser";

export default function AdminLoginExperience() {
  const router = useRouter();
  const configured = isSupabasePublicConfigured();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      setError("Admin login requires Supabase configuration.");
      return;
    }

    if (!email.trim() || !password) {
      setError("Enter your admin email and password.");
      return;
    }

    setLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (signInError || !data.session?.access_token) {
        throw new Error("Unable to sign in. Please check your admin credentials.");
      }

      const response = await fetch("/api/admin/me", {
        headers: {
          Authorization: `Bearer ${data.session.access_token}`
        }
      });
      const result = await response.json();

      if (!response.ok || !result.ok) {
        await supabase.auth.signOut();
        throw new Error(result.reason === "access_denied" ? "This account is not an active Karari Beauty admin." : "Admin access could not be verified.");
      }

      router.replace("/admin");
      router.refresh();
    } catch (caughtError) {
      setError(caughtError.message || "Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(201,150,45,0.16),transparent_30%),linear-gradient(135deg,#FFF8EE_0%,#FCE7EC_52%,#FFF8EE_100%)] px-3 py-6 text-[#3A2417] sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-5xl items-center gap-5 lg:grid-cols-[1fr_420px]">
        <section className="rounded-3xl border border-[rgba(122,24,61,0.14)] bg-white/64 p-5 shadow-boutique backdrop-blur sm:p-8">
          <Link href="/" className="inline-flex items-center gap-3" aria-label="Go to Karari Beauty home">
            <Image src="/logo.png" alt="Karari Beauty logo" width={52} height={52} priority className="h-12 w-12 rounded-full border border-[rgba(201,150,45,0.32)] bg-white object-cover shadow-soft" />
            <span>
              <span className="block font-display text-2xl font-semibold text-[#3A2417]">Karari Beauty</span>
              <span className="mt-1 block text-xs font-bold uppercase tracking-[0.2em] text-[#C9962D]">Admin Studio</span>
            </span>
          </Link>

          <div className="mt-10 max-w-xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-[rgba(201,150,45,0.3)] bg-[#FFF8EE] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-[#7A183D]">
              <Sparkles className="h-3.5 w-3.5 text-[#C9962D]" />
              Admin access only
            </p>
            <h1 className="mt-4 font-display text-4xl font-semibold leading-tight text-[#7A183D] sm:text-5xl">Karari Beauty Admin</h1>
            <p className="mt-4 text-base leading-7 text-[#3A2417]/70">Manage products, orders and seasonal campaigns securely.</p>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {["Secure login", "Admin profiles", "Future-ready"].map((item) => (
              <div key={item} className="rounded-2xl border border-[rgba(122,24,61,0.12)] bg-[#FFF8EE]/82 p-4 text-sm font-bold text-[#7A183D]">
                <ShieldCheck className="mb-3 h-4 w-4 text-[#C9962D]" />
                {item}
              </div>
            ))}
          </div>
        </section>

        {configured ? (
          <section className="rounded-3xl border border-[rgba(122,24,61,0.14)] bg-white/90 p-5 shadow-boutique sm:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#C9962D]">Admin Login</p>
            <h2 className="mt-2 font-display text-3xl font-semibold text-[#7A183D]">Sign in securely</h2>
            <p className="mt-2 text-sm leading-6 text-[#3A2417]/62">Use your Karari Beauty admin email and password.</p>

            <form onSubmit={submit} className="mt-5 space-y-4">
              <label className="block text-sm font-bold text-[#3A2417]">
                Email
                <span className="mt-2 flex min-h-11 items-center gap-3 rounded-lg border border-[rgba(122,24,61,0.14)] bg-[#FFF8EE] px-3 focus-within:border-[#C9962D]">
                  <Mail className="h-4 w-4 text-[#C9962D]" />
                  <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" className="h-full min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none" />
                </span>
              </label>
              <label className="block text-sm font-bold text-[#3A2417]">
                Password
                <span className="mt-2 flex min-h-11 items-center gap-3 rounded-lg border border-[rgba(122,24,61,0.14)] bg-[#FFF8EE] px-3 focus-within:border-[#C9962D]">
                  <LockKeyhole className="h-4 w-4 text-[#C9962D]" />
                  <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" className="h-full min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none" />
                </span>
              </label>

              {error ? <p className="rounded-lg border border-[rgba(122,24,61,0.14)] bg-[#FCE7EC] p-3 text-sm font-bold text-[#7A183D]">{error}</p> : null}

              <button type="submit" disabled={loading} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#7A183D] px-5 text-sm font-bold text-white shadow-soft transition hover:bg-[#3A2417] disabled:cursor-not-allowed disabled:opacity-70">
                {loading ? "Signing in..." : "Sign In"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </section>
        ) : (
          <AdminSetupRequired />
        )}
      </div>
    </main>
  );
}
