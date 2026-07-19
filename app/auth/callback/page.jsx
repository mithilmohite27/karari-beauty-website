"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

function getSafeNext(value) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

const CANONICAL_ORIGIN = "https://kararibeauty.com";

function getCanonicalUrl(path) {
  return `${CANONICAL_ORIGIN}${getSafeNext(path)}`;
}

export default function AuthCallbackPage() {
  const [message, setMessage] = useState("Completing your sign-in...");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const finishSignIn = async () => {
      const supabase = createBrowserSupabaseClient();
      const params = new URLSearchParams(window.location.search);
      const next = getSafeNext(params.get("next"));

      if (!supabase) {
        setFailed(true);
        setMessage("Google sign-in could not be completed. Please try again.");
        return;
      }

      const finishWithSession = (session) => {
        window.dispatchEvent(new Event("customerAuth:updated"));
        window.location.replace(getCanonicalUrl(next));
      };

      const { data } = await supabase.auth.getSession();
      if (data.session) {
        finishWithSession(data.session);
        return;
      }

      let resolved = false;
      let authSubscription = null;
      const timeout = window.setTimeout(() => {
        if (resolved) return;
        resolved = true;
        authSubscription?.unsubscribe();
        setFailed(true);
        setMessage("Google sign-in could not be completed. Please try again.");
      }, 3500);

      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (resolved || !session) return;
        resolved = true;
        window.clearTimeout(timeout);
        listener.subscription.unsubscribe();
        finishWithSession(session);
      });

      authSubscription = listener.subscription;
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
