"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CheckCircle2, LockKeyhole, Mail, Phone, ShieldCheck, User } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

const initialErrors = {};

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function isValidMobile(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length >= 10;
}

function getSafeRedirect(value) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

function friendlyAuthError(error) {
  const message = String(error?.message || "").toLowerCase();
  if (message.includes("invalid login credentials")) return "Invalid email or password.";
  if (message.includes("already registered") || message.includes("already exists") || message.includes("user already registered")) {
    return "This email is already registered. Please sign in.";
  }
  if (message.includes("email not confirmed")) return "Please verify your email, then sign in.";
  if (message.includes("password")) return "Password must be at least 6 characters.";
  return "Unable to continue. Please try again.";
}

function Field({ label, error, children }) {
  return (
    <label className="block">
      <span className="text-[0.68rem] font-bold uppercase tracking-[0.15em] text-[#C9962D]">{label}</span>
      <div className="mt-1.5">{children}</div>
      {error ? <p className="mt-2 text-xs font-semibold text-[#7A183D]">{error}</p> : null}
    </label>
  );
}

function TextInput({ icon: Icon, ...props }) {
  return (
    <div className="flex min-h-11 items-center gap-3 rounded-lg border border-[rgba(122,24,61,0.14)] bg-[#FFF8EE] px-3 transition focus-within:border-[#C9962D] focus-within:bg-white">
      {Icon ? <Icon className="h-4 w-4 shrink-0 text-[#C9962D]" /> : null}
      <input
        {...props}
        className="h-full min-w-0 flex-1 bg-transparent text-base font-semibold text-[#3A2417] outline-none placeholder:text-[#3A2417]/38 sm:text-sm"
      />
    </div>
  );
}

export default function SignInExperience() {
  const [mode, setMode] = useState("sign-in");
  const [notice, setNotice] = useState("");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [errors, setErrors] = useState(initialErrors);
  const [submitting, setSubmitting] = useState(false);
  const [redirectTo, setRedirectTo] = useState("/");
  const [form, setForm] = useState({
    email: "",
    password: "",
    fullName: "",
    registerMobile: "",
    registerEmail: "",
    registerPassword: "",
    confirmPassword: ""
  });

  const isRegister = mode === "register";
  const isCheckoutRedirect = redirectTo.startsWith("/checkout");
  const title = isRegister ? "Create your Karari Beauty account" : "Sign in to Karari Beauty";
  const subtitle = isRegister
    ? "Save your details for faster festive shopping."
    : isCheckoutRedirect
      ? "Sign in to continue secure checkout."
      : "Access your account, orders and saved details.";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setRedirectTo(getSafeRedirect(params.get("redirect")));
    if (params.get("mode") === "register") {
      setMode("register");
    }
  }, []);

  const benefits = useMemo(
    () => ["Secure checkout", "Saved contact details", "Order support"],
    []
  );

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setErrors(initialErrors);
    setNotice("");
    setVerificationEmail("");
  };

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
    setNotice("");
  };

  const validate = () => {
    const nextErrors = {};

    if (isRegister) {
      if (!form.fullName.trim()) nextErrors.fullName = "Full name is required.";
      if (!form.registerMobile.trim()) nextErrors.registerMobile = "Mobile number is required.";
      else if (!isValidMobile(form.registerMobile)) nextErrors.registerMobile = "Please enter a valid mobile number.";
      if (!form.registerEmail.trim()) nextErrors.registerEmail = "Email is required.";
      else if (!isValidEmail(form.registerEmail)) nextErrors.registerEmail = "Please enter a valid email.";
      if (!form.registerPassword) nextErrors.registerPassword = "Password is required.";
      else if (form.registerPassword.length < 6) nextErrors.registerPassword = "Password must be at least 6 characters.";
      if (!form.confirmPassword) nextErrors.confirmPassword = "Confirm password is required.";
      if (form.registerPassword && form.confirmPassword && form.registerPassword !== form.confirmPassword) {
        nextErrors.confirmPassword = "Passwords do not match.";
      }
    } else {
      if (!form.email.trim()) nextErrors.email = "Email is required.";
      else if (!isValidEmail(form.email)) nextErrors.email = "Please enter a valid email.";
      if (!form.password) nextErrors.password = "Password is required.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      setNotice("Customer login requires Supabase setup.");
      return;
    }

    setSubmitting(true);
    setNotice("");
    setVerificationEmail("");

    try {
      const result = isRegister
        ? await supabase.auth.signUp({
            email: form.registerEmail.trim(),
            password: form.registerPassword,
            options: {
              data: {
                full_name: form.fullName.trim(),
                phone: form.registerMobile.trim(),
                mobile: form.registerMobile.trim()
              }
            }
          })
        : await supabase.auth.signInWithPassword({
            email: form.email.trim(),
            password: form.password
          });

      if (result.error) throw result.error;

      if (isRegister && !result.data?.session) {
        setVerificationEmail(form.registerEmail.trim());
        setNotice("");
        return;
      }

      setNotice(isRegister ? "Account created successfully. Redirecting..." : "Signed in successfully. Redirecting...");
      window.dispatchEvent(new Event("customerAuth:updated"));
      window.setTimeout(() => {
        window.location.assign(redirectTo);
      }, 450);
    } catch (error) {
      setNotice(friendlyAuthError(error));
    } finally {
      setSubmitting(false);
    }
  };

  if (verificationEmail) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,#FFF8EE_0%,#FCE7EC_54%,#FFF8EE_100%)] px-3 py-6 text-[#3A2417] sm:px-6">
        <section className="w-full max-w-[440px] rounded-2xl border border-[rgba(122,24,61,0.14)] bg-white/92 p-5 text-center shadow-boutique sm:p-7">
          <Image src="/logo.png" alt="Karari Beauty logo" width={64} height={64} priority className="mx-auto h-14 w-14 rounded-full border border-[rgba(201,150,45,0.34)] object-cover shadow-soft" />
          <span className="mx-auto mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-[#FFF8EE] text-[#C9962D] shadow-soft">
            <CheckCircle2 className="h-6 w-6" />
          </span>
          <h1 className="mt-4 font-display text-3xl font-semibold text-[#7A183D]">Account created</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-[#3A2417]/72">Please verify your email to continue.</p>
          <p className="mt-2 text-sm leading-6 text-[#3A2417]/62">
            We have sent a verification link to {verificationEmail}. After verifying, sign in to continue checkout.
          </p>
          <button
            type="button"
            onClick={() => switchMode("sign-in")}
            className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#7A183D] px-5 text-sm font-bold text-white shadow-soft transition hover:bg-[#3A2417]"
          >
            Back to Sign In
            <ArrowRight className="h-4 w-4" />
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,#FFF8EE_0%,#FCE7EC_54%,#FFF8EE_100%)] px-3 py-6 text-[#3A2417] sm:px-6">
      <section className="w-full max-w-[460px] rounded-2xl border border-[rgba(122,24,61,0.14)] bg-white/92 p-4 shadow-boutique sm:p-6">
        <div className="text-center">
          <Link href="/" aria-label="Go to Karari Beauty home" className="inline-flex flex-col items-center">
            <Image src="/logo.png" alt="Karari Beauty logo" width={64} height={64} priority className="h-14 w-14 rounded-full border border-[rgba(201,150,45,0.34)] object-cover shadow-soft" />
            <span className="mt-3 font-display text-2xl font-semibold text-[#3A2417]">Karari Beauty</span>
            <span className="mt-1 text-[0.68rem] font-bold uppercase tracking-[0.22em] text-[#C9962D]">Boutique Gifts</span>
          </Link>
          <h1 className="mt-5 font-display text-3xl font-semibold text-[#7A183D]">{title}</h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-[#3A2417]/64">{subtitle}</p>
        </div>

        <div className="mt-5 flex rounded-xl bg-[#FFF8EE] p-1">
          <button
            type="button"
            onClick={() => switchMode("sign-in")}
            className={`min-h-10 flex-1 rounded-lg text-sm font-bold transition ${!isRegister ? "bg-[#7A183D] text-white shadow-soft" : "text-[#3A2417]/62 hover:bg-white/64 hover:text-[#7A183D]"}`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => switchMode("register")}
            className={`min-h-10 flex-1 rounded-lg text-sm font-bold transition ${isRegister ? "bg-[#7A183D] text-white shadow-soft" : "text-[#3A2417]/62 hover:bg-white/64 hover:text-[#7A183D]"}`}
          >
            Create Account
          </button>
        </div>

        <form onSubmit={submit} className="mt-5 space-y-3.5">
          {isRegister ? (
            <>
              <Field label="Full name" error={errors.fullName}>
                <TextInput icon={User} name="fullName" value={form.fullName} onChange={(event) => updateField("fullName", event.target.value)} placeholder="Your full name" autoComplete="name" />
              </Field>
              <Field label="Mobile number" error={errors.registerMobile}>
                <TextInput icon={Phone} name="registerMobile" value={form.registerMobile} onChange={(event) => updateField("registerMobile", event.target.value)} placeholder="+91 98765 43210" autoComplete="tel" />
              </Field>
              <Field label="Email" error={errors.registerEmail}>
                <TextInput icon={Mail} name="registerEmail" type="email" value={form.registerEmail} onChange={(event) => updateField("registerEmail", event.target.value)} placeholder="you@example.com" autoComplete="email" />
              </Field>
              <Field label="Password" error={errors.registerPassword}>
                <TextInput icon={LockKeyhole} name="registerPassword" type="password" value={form.registerPassword} onChange={(event) => updateField("registerPassword", event.target.value)} placeholder="Create password" autoComplete="new-password" />
              </Field>
              <Field label="Confirm password" error={errors.confirmPassword}>
                <TextInput icon={LockKeyhole} name="confirmPassword" type="password" value={form.confirmPassword} onChange={(event) => updateField("confirmPassword", event.target.value)} placeholder="Confirm password" autoComplete="new-password" />
              </Field>
              <button type="submit" disabled={submitting} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#7A183D] px-5 text-sm font-bold text-white shadow-soft transition hover:bg-[#3A2417] disabled:cursor-not-allowed disabled:opacity-65">
                {submitting ? "Creating Account..." : "Create Account"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <Field label="Email" error={errors.email}>
                <TextInput icon={Mail} name="email" type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} placeholder="you@example.com" autoComplete="email" />
              </Field>
              <Field label="Password" error={errors.password}>
                <TextInput icon={LockKeyhole} name="password" type="password" value={form.password} onChange={(event) => updateField("password", event.target.value)} placeholder="Password" autoComplete="current-password" />
              </Field>
              <button type="submit" disabled={submitting} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#7A183D] px-5 text-sm font-bold text-white shadow-soft transition hover:bg-[#3A2417] disabled:cursor-not-allowed disabled:opacity-65">
                {submitting ? "Signing In..." : "Sign In"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </>
          )}
        </form>

        <AnimatePresence>
          {notice ? (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="mt-4 rounded-lg border border-[rgba(122,24,61,0.14)] bg-[#FCE7EC] p-3 text-sm font-bold text-[#7A183D]"
            >
              {notice}
            </motion.p>
          ) : null}
        </AnimatePresence>

        <div className="mt-5 space-y-3 border-t border-[rgba(122,24,61,0.12)] pt-4 text-sm font-bold">
          <button type="button" onClick={() => switchMode(isRegister ? "sign-in" : "register")} className="w-full text-center text-[#7A183D] transition hover:text-[#C9962D]">
            {isRegister ? "Already have an account? Sign in" : "New to Karari Beauty? Create an account"}
          </button>
          {!isCheckoutRedirect ? (
            <Link href="/" className="block text-center text-[#3A2417]/58 underline-offset-4 transition hover:text-[#7A183D] hover:underline">
              Continue shopping
            </Link>
          ) : null}
        </div>

        <div className="mt-5 grid gap-2 rounded-xl border border-[rgba(201,150,45,0.22)] bg-[#FFF8EE]/86 p-3 sm:grid-cols-3">
          {benefits.map((benefit) => (
            <span key={benefit} className="inline-flex items-center justify-center gap-1.5 text-center text-[0.68rem] font-bold text-[#3A2417]/64">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[#C9962D]" />
              {benefit}
            </span>
          ))}
        </div>
      </section>
    </main>
  );
}
