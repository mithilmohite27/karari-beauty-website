"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Eye, EyeOff, LockKeyhole, ShieldAlert, Sparkles } from "lucide-react";
import { getPasswordProblem, MIN_PASSWORD_LENGTH } from "@/lib/passwordPolicy";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

const RECOVERY_WAIT_MS = 6000;

/**
 * Supabase sends the recovery tokens in the URL fragment (implicit flow), which
 * the browser client consumes on construction. Failures come back in the same
 * fragment as `error` / `error_description`.
 */
function readRecoveryHash() {
  if (typeof window === "undefined") return { error: "", errorCode: "" };
  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
  const fromHash = new URLSearchParams(hash);
  const fromQuery = new URLSearchParams(window.location.search);
  return {
    error: fromHash.get("error") || fromQuery.get("error") || "",
    errorCode: fromHash.get("error_code") || fromQuery.get("error_code") || ""
  };
}

function friendlyResetError(error) {
  const code = String(error?.code || "").toLowerCase();
  const message = String(error?.message || "").toLowerCase();
  const status = Number(error?.status) || 0;
  const has = (...needles) => needles.some((needle) => message.includes(needle));

  if (status >= 500 || has("database error", "internal server error")) {
    return "Something went wrong on our side. Please try again in a moment.";
  }
  if (error?.name === "AuthRetryableFetchError" || has("failed to fetch", "networkerror", "network request failed", "load failed")) {
    return "We could not reach Karari Beauty. Please check your internet connection and try again.";
  }
  if (code === "same_password" || has("should be different from the old password")) {
    return "Your new password must be different from your current password.";
  }
  if (code === "weak_password" || has("password should be", "password is too weak", "password should contain")) {
    return `Please choose a stronger password - at least ${MIN_PASSWORD_LENGTH} characters with letters and numbers.`;
  }
  if (code === "session_not_found" || code === "session_expired" || status === 401 || has("session", "token has expired", "invalid claim")) {
    return "This password reset link has expired. Please request a new one.";
  }
  if (status === 429 || has("rate limit", "too many requests", "for security purposes")) {
    return "Too many attempts from this device. Please wait a minute and try again.";
  }
  return "We could not update your password right now. Please try again.";
}

function BrandMark() {
  return (
    <Link href="/" aria-label="Go to Karari Beauty home" className="inline-flex flex-col items-center rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C9962D]">
      <Image
        src="/logo.png"
        alt="Karari Beauty logo"
        width={58}
        height={58}
        priority
        className="h-14 w-14 rounded-full border border-[rgba(201,150,45,0.34)] object-cover shadow-soft"
      />
      <span className="mt-2 font-display text-2xl font-semibold leading-none text-[#7A183D]">Karari Beauty</span>
      <span className="mt-1.5 text-[0.58rem] font-bold uppercase tracking-[0.28em] text-[#C9962D]">Boutique for you</span>
    </Link>
  );
}

function Shell({ children }) {
  return (
    <main className="flex min-h-screen min-w-0 items-center justify-center overflow-x-hidden bg-[radial-gradient(circle_at_50%_0%,#FFFFFF_0%,#FFF8EE_32%,#FCE7EC_100%)] px-3 py-8 text-[#3A2417] sm:px-6">
      <section className="w-full min-w-0 max-w-[460px] rounded-[24px] border border-[#7A183D]/14 bg-white p-6 text-center shadow-boutique sm:p-8">
        {children}
      </section>
    </main>
  );
}

function PasswordInput({ label, value, onChange, autoComplete, placeholder }) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="block text-left">
      <span className="sr-only">{label}</span>
      <div className="flex h-12 w-full min-w-0 items-center gap-3 rounded-md border border-[#3A2417]/14 bg-white px-3.5 shadow-[0_2px_8px_rgba(58,36,23,0.025)] transition focus-within:border-[#C9962D] focus-within:ring-2 focus-within:ring-[#C9962D]/10">
        <LockKeyhole className="h-[1.05rem] w-[1.05rem] shrink-0 text-[#3A2417]/64" strokeWidth={1.7} />
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="h-full min-w-0 flex-1 bg-transparent text-[0.92rem] font-medium text-[#3A2417] outline-none placeholder:text-[#3A2417]/42"
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          className="-mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#3A2417]/54 transition hover:bg-[#FCE7EC] hover:text-[#7A183D] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C9962D]"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </label>
  );
}

export default function ResetPasswordExperience() {
  const [status, setStatus] = useState("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    let subscription = null;
    let timer = 0;

    const start = async () => {
      const hashError = readRecoveryHash();

      const supabase = createBrowserSupabaseClient();
      if (!supabase) {
        if (active) setStatus("unavailable");
        return;
      }

      if (hashError.error) {
        if (active) setStatus("invalid");
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (!active) return;

      if (data.session) {
        setStatus("ready");
        return;
      }

      // The client may still be exchanging the fragment for a session.
      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!active || !session) return;
        window.clearTimeout(timer);
        listener.subscription.unsubscribe();
        subscription = null;
        setStatus("ready");
      });
      subscription = listener.subscription;

      timer = window.setTimeout(() => {
        if (!active) return;
        subscription?.unsubscribe();
        subscription = null;
        setStatus("invalid");
      }, RECOVERY_WAIT_MS);
    };

    start();

    return () => {
      active = false;
      window.clearTimeout(timer);
      subscription?.unsubscribe();
    };
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setNotice("");

    const problem = getPasswordProblem(password);
    if (problem) {
      setFieldError(problem);
      return;
    }
    if (password !== confirmPassword) {
      setFieldError("Your passwords do not match.");
      return;
    }
    setFieldError("");

    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      setNotice("Password reset is temporarily unavailable. Please try again shortly.");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      // The recovery session is single-purpose, so it is ended and the customer
      // signs in again with the new password.
      await supabase.auth.signOut();
      window.dispatchEvent(new Event("customerAuth:updated"));
      setStatus("done");
    } catch (error) {
      setNotice(friendlyResetError(error));
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "checking") {
    return (
      <Shell>
        <BrandMark />
        <p className="mt-6 text-sm font-semibold leading-6 text-[#3A2417]/72">Checking your reset link...</p>
      </Shell>
    );
  }

  if (status === "unavailable") {
    return (
      <Shell>
        <BrandMark />
        <h1 className="mt-6 font-display text-3xl font-semibold text-[#7A183D]">Password reset unavailable</h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-[#3A2417]/72">
          Password reset is temporarily unavailable. Please try again shortly.
        </p>
        <Link href="/sign-in" className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-md bg-[#7A183D] px-5 text-sm font-bold text-[#FFF8EE] shadow-soft transition hover:bg-[#621330]">
          Back to Sign In
        </Link>
      </Shell>
    );
  }

  if (status === "invalid") {
    return (
      <Shell>
        <BrandMark />
        <span className="mx-auto mt-6 flex h-12 w-12 items-center justify-center rounded-full bg-[#FCE7EC] text-[#7A183D]">
          <ShieldAlert className="h-6 w-6" />
        </span>
        <h1 className="mt-4 font-display text-3xl font-semibold text-[#7A183D]">Link expired</h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-[#3A2417]/72">
          This password reset link is invalid or has already been used.
        </p>
        <p className="mt-2 text-sm leading-6 text-[#3A2417]/62">
          Reset links can only be opened once and expire after a short while. Please request a new one.
        </p>
        <Link href="/sign-in" className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-md bg-[#7A183D] px-5 text-sm font-bold text-[#FFF8EE] shadow-soft transition hover:bg-[#621330]">
          Request a New Link
        </Link>
      </Shell>
    );
  }

  if (status === "done") {
    return (
      <Shell>
        <BrandMark />
        <span className="mx-auto mt-6 flex h-12 w-12 items-center justify-center rounded-full bg-[#FCE7EC] text-[#7A183D]">
          <CheckCircle2 className="h-6 w-6" />
        </span>
        <h1 className="mt-4 font-display text-3xl font-semibold text-[#7A183D]">Password updated</h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-[#3A2417]/72">
          Your password has been changed. Please sign in with your new password.
        </p>
        <Link href="/sign-in?reset=success" className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-md bg-[#7A183D] px-5 text-sm font-bold text-[#FFF8EE] shadow-soft transition hover:bg-[#621330]">
          Go to Sign In
        </Link>
      </Shell>
    );
  }

  return (
    <Shell>
      <BrandMark />
      <h1 className="mt-6 font-display text-[2rem] font-semibold leading-tight text-[#7A183D]">Set a New Password</h1>
      <div aria-hidden="true" className="mt-3 flex items-center justify-center gap-2 text-[#C9962D]">
        <span className="h-px w-12 bg-gradient-to-r from-transparent to-[#C9962D]/65" />
        <Sparkles className="h-3.5 w-3.5" />
        <span className="h-px w-12 bg-gradient-to-l from-transparent to-[#C9962D]/65" />
      </div>
      <p className="mx-auto mt-3 max-w-sm text-sm font-medium leading-6 text-[#3A2417]/66">
        Choose a password of at least {MIN_PASSWORD_LENGTH} characters, including letters and numbers.
      </p>

      <form onSubmit={submit} className="mt-6 w-full min-w-0 space-y-3">
        <PasswordInput
          label="New password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            setFieldError("");
          }}
          placeholder="New password"
          autoComplete="new-password"
        />
        <PasswordInput
          label="Confirm new password"
          value={confirmPassword}
          onChange={(event) => {
            setConfirmPassword(event.target.value);
            setFieldError("");
          }}
          placeholder="Confirm new password"
          autoComplete="new-password"
        />

        {fieldError ? <p className="text-left text-xs font-semibold text-[#7A183D]">{fieldError}</p> : null}

        <button type="submit" disabled={submitting} className="h-12 w-full rounded-md bg-[#7A183D] px-5 text-sm font-bold text-[#FFF8EE] shadow-[0_10px_24px_rgba(122,24,61,0.18)] transition hover:bg-[#621330] disabled:cursor-not-allowed disabled:opacity-60">
          {submitting ? "Updating Password..." : "Update Password"}
        </button>
      </form>

      {notice ? (
        <p role="alert" className="mt-4 rounded-md border border-[#7A183D]/14 bg-[#FCE7EC] p-3 text-sm font-semibold text-[#7A183D]">
          {notice}
        </p>
      ) : null}

      <Link href="/sign-in" className="mt-5 block text-center text-xs font-semibold text-[#3A2417]/55 underline-offset-4 transition hover:text-[#7A183D] hover:underline">
        Back to Sign In
      </Link>
    </Shell>
  );
}
