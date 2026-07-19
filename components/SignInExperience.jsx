"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  User
} from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

const initialErrors = {};

const phoneCountries = [
  { code: "IN", name: "India", flag: "IN", dialCode: "91", min: 10, max: 10 },
  { code: "US", name: "United States", flag: "US", dialCode: "1", min: 10, max: 10 },
  { code: "CA", name: "Canada", flag: "CA", dialCode: "1", min: 10, max: 10 },
  { code: "GB", name: "United Kingdom", flag: "GB", dialCode: "44", min: 10, max: 11 },
  { code: "AU", name: "Australia", flag: "AU", dialCode: "61", min: 9, max: 9 },
  { code: "AE", name: "UAE", flag: "AE", dialCode: "971", min: 9, max: 9 }
];

function countryFlag(code) {
  return code.replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function getPhoneCountry(code) {
  return phoneCountries.find((country) => country.code === code) || phoneCountries[0];
}

function getPhoneDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function getInternationalPhone(value, countryCode) {
  const country = getPhoneCountry(countryCode);
  const digits = getPhoneDigits(value).replace(/^0+/, "");
  return digits ? `+${country.dialCode}${digits}` : "";
}

function isValidMobile(value, countryCode = "IN") {
  const country = getPhoneCountry(countryCode);
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length >= country.min && digits.length <= country.max;
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

function BrandMark({ compact = false }) {
  return (
    <Link href="/" aria-label="Go to Karari Beauty home" className="inline-flex flex-col items-center rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C9962D]">
      <Image
        src="/logo.png"
        alt="Karari Beauty logo"
        width={compact ? 58 : 76}
        height={compact ? 58 : 76}
        priority
        className={`${compact ? "h-14 w-14" : "h-[4.5rem] w-[4.5rem]"} rounded-full border border-[rgba(201,150,45,0.34)] object-cover shadow-soft`}
      />
      <span className={`${compact ? "mt-2 text-2xl" : "mt-3 text-[2rem]"} font-display font-semibold leading-none text-[#7A183D]`}>Karari Beauty</span>
      <span className="mt-1.5 text-[0.58rem] font-bold uppercase tracking-[0.28em] text-[#C9962D]">Boutique for you</span>
    </Link>
  );
}

function Ornament() {
  return (
    <div aria-hidden="true" className="flex items-center justify-center gap-2 text-[#C9962D]">
      <span className="h-px w-12 bg-gradient-to-r from-transparent to-[#C9962D]/65" />
      <Sparkles className="h-3.5 w-3.5" />
      <span className="h-px w-12 bg-gradient-to-l from-transparent to-[#C9962D]/65" />
    </div>
  );
}

function AuthBrandPanel() {
  return (
    <aside className="relative aspect-[1122/1402] min-w-0 overflow-hidden bg-[#FCEDEA] lg:block lg:h-full lg:min-h-0 lg:aspect-auto">
      <Image
        src="/images/auth/karari-auth-panel.webp"
        alt="Welcome to Karari Beauty"
        fill
        priority
        sizes="(min-width: 1024px) 543px, 100vw"
        className="object-cover object-center lg:object-[center_48%]"
      />
    </aside>
  );
}

function Field({ label, error, children }) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      {children}
      {error ? <p className="mt-1.5 text-xs font-semibold text-[#7A183D]">{error}</p> : null}
    </label>
  );
}

function TextInput({ icon: Icon, prefix, suffix, className = "", ...props }) {
  return (
    <div className={`flex h-12 w-full min-w-0 max-w-full items-center gap-3 rounded-md border border-[#3A2417]/14 bg-white px-3.5 shadow-[0_2px_8px_rgba(58,36,23,0.025)] transition focus-within:border-[#C9962D] focus-within:ring-2 focus-within:ring-[#C9962D]/10 lg:h-10 ${className}`}>
      {Icon ? <Icon className="h-[1.05rem] w-[1.05rem] shrink-0 text-[#3A2417]/64" strokeWidth={1.7} /> : null}
      {prefix}
      <input
        {...props}
        className="h-full min-w-0 flex-1 bg-transparent text-[0.92rem] font-medium text-[#3A2417] outline-none placeholder:text-[#3A2417]/42"
      />
      {suffix}
    </div>
  );
}

function PasswordField({ label, error, ...props }) {
  const [visible, setVisible] = useState(false);
  return (
    <Field label={label} error={error}>
      <TextInput
        {...props}
        icon={LockKeyhole}
        type={visible ? "text" : "password"}
        suffix={(
          <button
            type="button"
            onClick={() => setVisible((current) => !current)}
            aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
            className="-mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#3A2417]/54 transition hover:bg-[#FCE7EC] hover:text-[#7A183D] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C9962D]"
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      />
    </Field>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.37c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.3 9.14 5.37 12 5.37z" />
    </svg>
  );
}

function PhoneNumberField({ value, countryCode, error, onValueChange, onCountryChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selectedCountry = getPhoneCountry(countryCode);
  const filteredCountries = phoneCountries.filter((country) => {
    const haystack = `${country.name} ${country.code} ${country.dialCode}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

  return (
    <Field label="Mobile number" error={error}>
      <div className="relative">
        <div className={`flex h-12 w-full min-w-0 max-w-full items-center rounded-md border bg-white shadow-[0_2px_8px_rgba(58,36,23,0.025)] transition focus-within:border-[#C9962D] focus-within:ring-2 focus-within:ring-[#C9962D]/10 lg:h-10 ${
          error ? "border-[#7A183D]" : "border-[#3A2417]/14"
        }`}>
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            aria-expanded={open}
            className="flex h-full shrink-0 items-center gap-1.5 border-r border-[#3A2417]/12 px-3 text-xs font-semibold text-[#3A2417]/72 transition hover:text-[#7A183D]"
          >
            <span>{countryFlag(selectedCountry.flag)}</span>
            <span>+{selectedCountry.dialCode}</span>
          </button>
          <input
            name="registerMobile"
            value={value}
            onChange={(event) => onValueChange(getPhoneDigits(event.target.value))}
            placeholder="Mobile number"
            autoComplete="tel"
            inputMode="tel"
            className="h-full min-w-0 flex-1 bg-transparent px-3 text-[0.92rem] font-medium text-[#3A2417] outline-none placeholder:text-[#3A2417]/42"
          />
        </div>

        {open ? (
          <div className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-md border border-[#7A183D]/14 bg-white shadow-[0_16px_36px_rgba(58,36,23,0.14)]">
            <div className="border-b border-[#3A2417]/10 p-2">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search country"
                className="h-9 w-full rounded-md border border-[#3A2417]/12 px-3 text-sm font-medium outline-none focus:border-[#C9962D]"
              />
            </div>
            <div className="max-h-48 overflow-y-auto overscroll-contain py-1">
              {filteredCountries.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => {
                    onCountryChange(country.code);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-[#3A2417]/76 transition hover:bg-[#FFF8EE] hover:text-[#7A183D]"
                >
                  <span className="w-6">{countryFlag(country.flag)}</span>
                  <span className="min-w-0 flex-1 truncate">{country.name}</span>
                  <span className="text-xs text-[#3A2417]/50">+{country.dialCode}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </Field>
  );
}

function AuthTabs({ isRegister, onChange }) {
  return (
    <div role="tablist" aria-label="Customer authentication" className="grid w-full min-w-0 max-w-full grid-cols-2 gap-2 overflow-hidden">
      <button
        type="button"
        role="tab"
        aria-selected={!isRegister}
        onClick={() => onChange("sign-in")}
        className={`flex h-11 items-center justify-center gap-2 rounded-md border text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9962D] lg:h-9 ${!isRegister ? "border-[#7A183D] bg-[#7A183D] text-[#FFF8EE] shadow-[0_7px_18px_rgba(122,24,61,0.18)]" : "border-[#3A2417]/13 bg-white text-[#3A2417]/72 hover:border-[#7A183D]/32 hover:text-[#7A183D]"}`}
      >
        <User className="h-4 w-4" strokeWidth={1.7} />
        Sign In
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={isRegister}
        onClick={() => onChange("register")}
        className={`flex h-11 items-center justify-center gap-2 rounded-md border text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9962D] lg:h-9 ${isRegister ? "border-[#7A183D] bg-[#7A183D] text-[#FFF8EE] shadow-[0_7px_18px_rgba(122,24,61,0.18)]" : "border-[#3A2417]/13 bg-white text-[#3A2417]/72 hover:border-[#7A183D]/32 hover:text-[#7A183D]"}`}
      >
        <User className="h-4 w-4" strokeWidth={1.7} />
        Create Account
      </button>
    </div>
  );
}

function TrustMessage() {
  return (
    <div className="mt-auto flex items-center gap-3 border-t border-[#3A2417]/9 pt-5 text-xs font-medium leading-5 text-[#3A2417]/64 lg:pt-3 lg:leading-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FFF8EE] text-[#7A183D] lg:h-8 lg:w-8">
        <ShieldCheck className="h-[1.1rem] w-[1.1rem]" strokeWidth={1.7} />
      </span>
      <span>Your information is protected and never shared.</span>
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
  const [rememberMe, setRememberMe] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [googleRedirecting, setGoogleRedirecting] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    fullName: "",
    registerCountry: "IN",
    registerMobile: "",
    registerEmail: "",
    registerPassword: "",
    confirmPassword: ""
  });

  const isRegister = mode === "register";
  const isCheckoutRedirect = redirectTo.startsWith("/checkout");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setRedirectTo(getSafeRedirect(params.get("redirect")));
    if (params.get("mode") === "register") setMode("register");
  }, []);

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

  const startGoogleSignIn = async () => {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      setNotice("Google sign-in could not be started. Please try again.");
      return;
    }

    setGoogleRedirecting(true);
    setNotice("");

    try {
      const callbackUrl = new URL("/auth/callback", window.location.origin);
      callbackUrl.searchParams.set("next", redirectTo);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl.toString()
        }
      });

      if (error) throw error;
    } catch {
      setGoogleRedirecting(false);
      setNotice("Google sign-in could not be started. Please try again.");
    }
  };

  const validate = () => {
    const nextErrors = {};

    if (isRegister) {
      if (!form.fullName.trim()) nextErrors.fullName = "Full name is required.";
      if (!form.registerMobile.trim()) nextErrors.registerMobile = "Mobile number is required.";
      else if (!isValidMobile(form.registerMobile, form.registerCountry)) nextErrors.registerMobile = "Please enter a valid phone number.";
      if (!form.registerEmail.trim()) nextErrors.registerEmail = "Email is required.";
      else if (!isValidEmail(form.registerEmail)) nextErrors.registerEmail = "Please enter a valid email.";
      if (!form.registerPassword) nextErrors.registerPassword = "Password is required.";
      else if (form.registerPassword.length < 6) nextErrors.registerPassword = "Password must be at least 6 characters.";
      if (!form.confirmPassword) nextErrors.confirmPassword = "Confirm password is required.";
      if (form.registerPassword && form.confirmPassword && form.registerPassword !== form.confirmPassword) {
        nextErrors.confirmPassword = "Passwords do not match.";
      }
      if (!acceptedTerms) nextErrors.terms = "Please accept the Terms & Conditions and Privacy Policy.";
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
      setNotice("Customer sign-in is temporarily unavailable. Please try again shortly.");
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
                phone: getInternationalPhone(form.registerMobile, form.registerCountry),
                mobile: getInternationalPhone(form.registerMobile, form.registerCountry),
                phone_country: form.registerCountry
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
      window.setTimeout(() => window.location.assign(redirectTo), 450);
    } catch (error) {
      setNotice(friendlyAuthError(error));
    } finally {
      setSubmitting(false);
    }
  };

  if (verificationEmail) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FFF8EE] px-4 py-8 text-[#3A2417]">
        <section className="w-full max-w-[460px] rounded-[24px] border border-[#7A183D]/14 bg-white p-6 text-center shadow-boutique sm:p-8">
          <BrandMark compact />
          <span className="mx-auto mt-6 flex h-12 w-12 items-center justify-center rounded-full bg-[#FCE7EC] text-[#7A183D]">
            <CheckCircle2 className="h-6 w-6" />
          </span>
          <h1 className="mt-4 font-display text-3xl font-semibold text-[#7A183D]">Account created</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-[#3A2417]/72">Please verify your email to continue.</p>
          <p className="mt-2 text-sm leading-6 text-[#3A2417]/62">We sent a verification link to {verificationEmail}. After verifying, sign in to continue.</p>
          <button type="button" onClick={() => switchMode("sign-in")} className="mt-6 h-12 w-full rounded-md bg-[#7A183D] px-5 text-sm font-bold text-[#FFF8EE] shadow-soft transition hover:bg-[#621330]">
            Back to Sign In
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen min-w-0 items-center justify-center overflow-x-hidden bg-[radial-gradient(circle_at_50%_0%,#FFFFFF_0%,#FFF8EE_32%,#FCE7EC_100%)] px-3 py-4 text-[#3A2417] sm:px-6 sm:py-8 lg:min-h-dvh lg:overflow-hidden lg:p-5">
      <section className="grid w-[calc(100vw-1.5rem)] min-w-0 max-w-[1400px] grid-cols-1 overflow-hidden rounded-[24px] border border-white/80 bg-white shadow-[0_22px_62px_rgba(90,37,49,0.14)] sm:w-full lg:h-[min(720px,86vh)] lg:max-h-[760px] lg:w-[min(1180px,92vw)] lg:max-w-[1180px] lg:grid-cols-[46fr_54fr]">
        <AuthBrandPanel />

        <div className="flex min-h-[620px] w-full min-w-0 max-w-full items-center justify-center bg-white px-4 py-7 sm:px-8 sm:py-9 lg:h-full lg:min-h-0 lg:overflow-hidden lg:px-9 lg:py-5 xl:px-12">
          <div className="mx-auto flex w-full min-w-0 max-w-[480px] flex-col overflow-hidden lg:my-auto">
            <div className="text-center">
              <h1 className="font-display text-[2rem] font-semibold leading-tight text-[#7A183D] sm:text-[2.25rem] lg:text-[2rem]">
                {isRegister ? "Create Account" : "Sign In"}
              </h1>
              <div className="mt-3 lg:mt-2"><Ornament /></div>
              <p className="mx-auto mt-3 max-w-sm text-sm font-medium leading-6 text-[#3A2417]/66 lg:mt-2 lg:text-xs lg:leading-5">
                {isRegister ? "Create your account and start your journey with us." : isCheckoutRedirect ? "Welcome back! Sign in to continue secure checkout." : "Welcome back! Please sign in to continue."}
              </p>
            </div>

            <div className="mt-6 lg:mt-3"><AuthTabs isRegister={isRegister} onChange={switchMode} /></div>

            <form onSubmit={submit} className="mt-5 w-full min-w-0 max-w-full space-y-3 lg:mt-3 lg:space-y-2">
              {isRegister ? (
                <>
                  <Field label="Full name" error={errors.fullName}>
                    <TextInput icon={User} name="fullName" value={form.fullName} onChange={(event) => updateField("fullName", event.target.value)} placeholder="Full name" autoComplete="name" />
                  </Field>
                  <PhoneNumberField
                    value={form.registerMobile}
                    countryCode={form.registerCountry}
                    error={errors.registerMobile}
                    onValueChange={(value) => updateField("registerMobile", value)}
                    onCountryChange={(value) => {
                      updateField("registerCountry", value);
                      setErrors((current) => ({ ...current, registerMobile: "" }));
                    }}
                  />
                  <Field label="Email address" error={errors.registerEmail}>
                    <TextInput icon={Mail} name="registerEmail" type="email" value={form.registerEmail} onChange={(event) => updateField("registerEmail", event.target.value)} placeholder="Email address" autoComplete="email" />
                  </Field>
                  <PasswordField label="Password" error={errors.registerPassword} name="registerPassword" value={form.registerPassword} onChange={(event) => updateField("registerPassword", event.target.value)} placeholder="Password" autoComplete="new-password" />
                  <PasswordField label="Confirm password" error={errors.confirmPassword} name="confirmPassword" value={form.confirmPassword} onChange={(event) => updateField("confirmPassword", event.target.value)} placeholder="Confirm password" autoComplete="new-password" />

                  <label className="flex cursor-pointer items-start gap-2.5 py-1 text-xs font-medium leading-5 text-[#3A2417]/70 lg:py-0 lg:leading-4">
                    <input type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} className="mt-0.5 h-4 w-4 accent-[#7A183D]" />
                    <span>I agree to the <Link href="/terms-and-conditions" className="font-semibold text-[#7A183D] underline underline-offset-2">Terms &amp; Conditions</Link> and <Link href="/privacy-policy" className="font-semibold text-[#7A183D] underline underline-offset-2">Privacy Policy</Link>.</span>
                  </label>
                  {errors.terms ? <p className="-mt-1 text-xs font-semibold text-[#7A183D]">{errors.terms}</p> : null}

                  <button type="submit" disabled={submitting} className="mt-1 h-12 w-full rounded-md bg-[#7A183D] px-5 text-sm font-bold text-[#FFF8EE] shadow-[0_10px_24px_rgba(122,24,61,0.18)] transition hover:bg-[#621330] disabled:cursor-not-allowed disabled:opacity-60 lg:h-10">
                    {submitting ? "Creating Account..." : "Create Account"}
                  </button>
                </>
              ) : (
                <>
                  <Field label="Email address" error={errors.email}>
                    <TextInput icon={Mail} name="email" type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} placeholder="Email address" autoComplete="email" />
                  </Field>
                  <PasswordField label="Password" error={errors.password} name="password" value={form.password} onChange={(event) => updateField("password", event.target.value)} placeholder="Password" autoComplete="current-password" />

                  <div className="flex items-center justify-between gap-4 py-1 text-xs font-medium">
                    <label className="flex cursor-pointer items-center gap-2 text-[#3A2417]/70">
                      <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} className="h-4 w-4 accent-[#7A183D]" />
                      Remember me
                    </label>
                    <span className="font-semibold text-[#7A183D]">Forgot password?</span>
                  </div>

                  <button type="submit" disabled={submitting} className="mt-1 h-12 w-full rounded-md bg-[#7A183D] px-5 text-sm font-bold text-[#FFF8EE] shadow-[0_10px_24px_rgba(122,24,61,0.18)] transition hover:bg-[#621330] disabled:cursor-not-allowed disabled:opacity-60 lg:h-10">
                    {submitting ? "Signing In..." : "Sign In"}
                  </button>

                  <div className="flex items-center gap-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[#3A2417]/42">
                    <span className="h-px flex-1 bg-[#3A2417]/10" />
                    or continue with
                    <span className="h-px flex-1 bg-[#3A2417]/10" />
                  </div>
                  <button
                    type="button"
                    onClick={startGoogleSignIn}
                    disabled={googleRedirecting || submitting}
                    className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-[#3A2417]/13 bg-white text-sm font-semibold text-[#3A2417]/76 transition hover:border-[#C9962D] hover:bg-[#FFF8EE] hover:text-[#7A183D] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <GoogleIcon />
                    {googleRedirecting ? "Opening Google..." : "Continue with Google"}
                  </button>
                </>
              )}
            </form>

            {notice ? (
              <p role="status" className="mt-4 rounded-md border border-[#7A183D]/14 bg-[#FCE7EC] p-3 text-sm font-semibold text-[#7A183D]">
                {notice}
              </p>
            ) : null}

            <div className="mt-5 flex items-center gap-3 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[#3A2417]/42 lg:mt-3">
              <span className="h-px flex-1 bg-[#3A2417]/10" />
              {isRegister ? "Already a member?" : "New to Karari Beauty?"}
              <span className="h-px flex-1 bg-[#3A2417]/10" />
            </div>
            <button type="button" onClick={() => switchMode(isRegister ? "sign-in" : "register")} className="mt-3 h-11 w-full rounded-md border border-[#7A183D]/18 bg-white text-sm font-semibold text-[#7A183D] transition hover:border-[#7A183D]/38 hover:bg-[#FFF8EE] lg:mt-2 lg:h-9">
              {isRegister ? "Sign In" : "Create Account"}
            </button>

            {!isCheckoutRedirect ? (
              <Link href="/" className="mt-3 block text-center text-xs font-semibold text-[#3A2417]/55 underline-offset-4 transition hover:text-[#7A183D] hover:underline lg:mt-2">
                Continue shopping as guest
              </Link>
            ) : null}

            <div className="mt-7 lg:mt-4"><TrustMessage /></div>
          </div>
        </div>
      </section>
    </main>
  );
}
