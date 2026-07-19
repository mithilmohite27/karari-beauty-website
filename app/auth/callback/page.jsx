"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

function getSafeNext(value) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export default function AuthCallbackPage() {
  const [message, setMessage] = useState("Completing your sign-in...");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const finishSignIn = async () => {
      const supabase = createBrowserSupabaseClient();
      const params = new URLSearchParams(window.location.search);
      const next = getSafeNext(params.get("next"));
      const code = params.get("code");

      if (!supabase || !code) {
        setFailed(true);
        setMessage("Google sign-in could not be completed. Please try again.");
        return;
      }

      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        setFailed(true);
        setMessage("Google sign-in could not be completed. Please try again.");
        return;
      }

      window.dispatchEvent(new Event("customerAuth:updated"));
      window.location.replace(next);
    };

    finishSignIn();
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_50%_0%,#FFFFFF_0%,#FFF8EE_32%,#FCE7EC_100%)] px-4 text-[#3A2417]">
      <section className="w-full max-w-md rounded-[24px] border border-[#7A183D]/14 bg-white p-6 text-center shadow-boutique sm:p-8">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#FCE7EC] text-[#7A183D]">
          <CheckCircle2 className="h-6 w-6" />
        </span>
        <h1 className="mt-4 font-display text-3xl font-semibold text-[#7A183D]">Karari Beauty</h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-[#3A2417]/68">{message}</p>
        {failed ? (
          <Link href="/sign-in" className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-md bg-[#7A183D] px-5 text-sm font-bold text-[#FFF8EE] transition hover:bg-[#621330]">
            Back to Sign In
          </Link>
        ) : null}
      </section>
    </main>
  );
}
