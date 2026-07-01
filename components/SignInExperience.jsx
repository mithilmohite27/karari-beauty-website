"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Bell, Gift, Heart, LockKeyhole, Mail, PackageCheck, Phone, ShieldCheck, Sparkles, User } from "lucide-react";

const trustChips = [
  { label: "Wishlist Saved", icon: Heart },
  { label: "Faster Checkout", icon: ShieldCheck },
  { label: "Order Updates", icon: Bell }
];

const visualCards = [
  { label: "Wishlist", value: "Saved favourites", icon: Heart },
  { label: "Orders", value: "Request tracking", icon: PackageCheck },
  { label: "Offers", value: "Festive picks", icon: Gift }
];

const initialErrors = {};

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
  const [method, setMethod] = useState("mobile");
  const [notice, setNotice] = useState("");
  const [errors, setErrors] = useState(initialErrors);
  const [form, setForm] = useState({
    mobile: "",
    email: "",
    password: "",
    fullName: "",
    registerMobile: "",
    registerEmail: "",
    registerPassword: "",
    confirmPassword: ""
  });

  const isRegister = mode === "register";
  const panelTitle = isRegister ? "Create your account" : "Sign in to continue";
  const panelNote = isRegister
    ? "Account creation will be connected in the next phase."
    : method === "mobile"
      ? "OTP sign-in will be activated in the next phase."
      : "Email login will be activated in the next phase.";

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  };

  const validate = () => {
    const nextErrors = {};

    if (isRegister) {
      if (!form.fullName.trim()) nextErrors.fullName = "Full name is required.";
      if (!form.registerMobile.trim()) nextErrors.registerMobile = "Mobile number is required.";
      if (!form.registerEmail.trim()) nextErrors.registerEmail = "Email is required.";
      if (!form.registerPassword) nextErrors.registerPassword = "Password is required.";
      if (!form.confirmPassword) nextErrors.confirmPassword = "Confirm password is required.";
      if (form.registerPassword && form.confirmPassword && form.registerPassword !== form.confirmPassword) {
        nextErrors.confirmPassword = "Passwords should match.";
      }
    } else if (method === "mobile") {
      if (!form.mobile.trim()) nextErrors.mobile = "Mobile number is required.";
    } else {
      if (!form.email.trim()) nextErrors.email = "Email is required.";
      if (!form.password) nextErrors.password = "Password is required.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submit = (event) => {
    event.preventDefault();
    if (!validate()) return;

    setNotice(isRegister ? "Account creation will be connected in the next phase." : "Customer login will be activated in the next phase.");
  };

  const modeCopy = useMemo(
    () =>
      isRegister
        ? "Save your details for faster festive shopping."
        : "Access wishlist, order requests and faster checkout.",
    [isRegister]
  );

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(201,150,45,0.16),transparent_30%),linear-gradient(135deg,#FFF8EE_0%,#FCE7EC_48%,#FFF8EE_100%)] px-3 py-4 text-[#3A2417] sm:px-6 sm:py-7 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-[1120px] items-center gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(400px,440px)] lg:gap-8">
        <section className="relative overflow-hidden rounded-3xl border border-[rgba(122,24,61,0.14)] bg-[linear-gradient(145deg,rgba(255,248,238,0.94)_0%,rgba(252,231,236,0.88)_58%,rgba(255,255,255,0.82)_100%)] p-4 shadow-boutique sm:p-7 lg:min-h-[570px] lg:p-8">
          <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full border border-[rgba(201,150,45,0.2)] bg-white/30 blur-sm" />
          <div className="pointer-events-none absolute -bottom-16 left-12 h-36 w-36 rounded-full bg-[#C9962D]/10 blur-2xl" />

          <div className="relative">
            <Link href="/" className="inline-flex items-center gap-3" aria-label="Go to Karari Beauty home">
              <Image src="/logo.png" alt="Karari Beauty logo" width={54} height={54} priority className="h-11 w-11 rounded-full border border-[rgba(201,150,45,0.34)] bg-white object-cover shadow-soft sm:h-[3.25rem] sm:w-[3.25rem]" />
              <span>
                <span className="block font-display text-xl font-semibold text-[#3A2417] sm:text-2xl">Karari Beauty</span>
                <span className="mt-0.5 block text-[0.68rem] font-bold uppercase tracking-[0.22em] text-[#C9962D]">Boutique Gifts</span>
              </span>
            </Link>

            <div className="mt-5 max-w-lg sm:mt-10 lg:mt-12">
              <p className="inline-flex items-center gap-2 rounded-full border border-[rgba(201,150,45,0.32)] bg-white/68 px-3 py-1.5 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[#7A183D]">
                <Sparkles className="h-3.5 w-3.5 text-[#C9962D]" />
                Boutique shopping made personal
              </p>
              <h1 className="mt-3 font-display text-[2rem] font-semibold leading-[1.08] text-[#7A183D] sm:mt-4 sm:text-[2.75rem] lg:text-[3.15rem]">
                Boutique shopping, made personal.
              </h1>
              <p className="mt-3 max-w-md text-sm leading-6 text-[#3A2417]/70 sm:text-base">
                Save your favourites, track order requests and enjoy faster festive shopping.
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 sm:mt-6">
              {trustChips.map(({ label, icon: Icon }) => (
                <span key={label} className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[rgba(122,24,61,0.12)] bg-white/72 px-3 text-xs font-bold text-[#7A183D] shadow-soft">
                  <Icon className="h-3.5 w-3.5 text-[#C9962D]" />
                  {label}
                </span>
              ))}
            </div>

            <div className="mt-5 hidden max-w-md rounded-[1.4rem] border border-[rgba(122,24,61,0.12)] bg-white/60 p-4 shadow-soft backdrop-blur sm:block lg:mt-10">
              <div className="grid grid-cols-[1fr_0.78fr] gap-3">
                <div className="rounded-2xl border border-[rgba(201,150,45,0.24)] bg-[linear-gradient(145deg,#FFF8EE_0%,#FCE7EC_100%)] p-4">
                  <div className="flex h-20 items-end justify-center rounded-xl bg-white/62">
                    <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#7A183D] text-white shadow-soft">
                      <Gift className="h-5 w-5" />
                    </span>
                  </div>
                  <p className="mt-4 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#C9962D]">Festive Edit</p>
                  <p className="mt-1 font-display text-xl font-semibold text-[#7A183D]">Curated for gifting</p>
                </div>
                <div className="space-y-2.5">
                  {visualCards.map(({ label, value, icon: Icon }) => (
                    <div key={label} className="rounded-2xl border border-[rgba(122,24,61,0.1)] bg-[#FFF8EE]/88 p-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#C9962D] shadow-soft">
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <span className="text-xs font-bold text-[#7A183D]">{label}</span>
                      </div>
                      <p className="mt-1 text-[0.7rem] font-semibold text-[#3A2417]/58">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full rounded-3xl border border-[rgba(122,24,61,0.14)] bg-white/92 p-4 shadow-boutique sm:p-5 lg:p-6">
          <div className="mb-4">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#C9962D]">Karari Beauty Account</p>
            <h2 className="mt-1.5 font-display text-2xl font-semibold text-[#7A183D]">{panelTitle}</h2>
            <p className="mt-1.5 text-sm leading-6 text-[#3A2417]/64">{modeCopy}</p>
          </div>

          <div className="flex rounded-xl bg-[#FFF8EE] p-1">
            <button
              type="button"
              onClick={() => {
                setMode("sign-in");
                setErrors(initialErrors);
                setNotice("");
              }}
              className={`min-h-10 flex-1 rounded-lg text-sm font-bold transition ${!isRegister ? "bg-[#7A183D] text-white shadow-soft" : "text-[#3A2417]/62 hover:bg-white/64 hover:text-[#7A183D]"}`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setErrors(initialErrors);
                setNotice("");
              }}
              className={`min-h-10 flex-1 rounded-lg text-sm font-bold transition ${isRegister ? "bg-[#7A183D] text-white shadow-soft" : "text-[#3A2417]/62 hover:bg-white/64 hover:text-[#7A183D]"}`}
            >
              Create Account
            </button>
          </div>

          {!isRegister ? (
            <div className="mt-4 grid gap-2 rounded-lg border border-[rgba(122,24,61,0.12)] bg-[#FFF8EE] p-1 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setMethod("mobile");
                  setErrors(initialErrors);
                  setNotice("");
                }}
                className={`min-h-10 rounded-md text-sm font-bold transition ${method === "mobile" ? "bg-white text-[#7A183D] shadow-soft" : "text-[#3A2417]/62 hover:text-[#7A183D]"}`}
              >
                Mobile Number
              </button>
              <button
                type="button"
                onClick={() => {
                  setMethod("email");
                  setErrors(initialErrors);
                  setNotice("");
                }}
                className={`min-h-10 rounded-md text-sm font-bold transition ${method === "email" ? "bg-white text-[#7A183D] shadow-soft" : "text-[#3A2417]/62 hover:text-[#7A183D]"}`}
              >
                Email
              </button>
            </div>
          ) : null}

          <form onSubmit={submit} className="mt-4 space-y-3.5">
            {isRegister ? (
              <>
                <Field label="Full Name" error={errors.fullName}>
                  <TextInput icon={User} name="fullName" value={form.fullName} onChange={(event) => updateField("fullName", event.target.value)} placeholder="Your full name" autoComplete="name" />
                </Field>
                <Field label="Mobile Number" error={errors.registerMobile}>
                  <TextInput icon={Phone} name="registerMobile" value={form.registerMobile} onChange={(event) => updateField("registerMobile", event.target.value)} placeholder="+91 98765 43210" autoComplete="tel" />
                </Field>
                <Field label="Email" error={errors.registerEmail}>
                  <TextInput icon={Mail} name="registerEmail" type="email" value={form.registerEmail} onChange={(event) => updateField("registerEmail", event.target.value)} placeholder="you@example.com" autoComplete="email" />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Password" error={errors.registerPassword}>
                    <TextInput icon={LockKeyhole} name="registerPassword" type="password" value={form.registerPassword} onChange={(event) => updateField("registerPassword", event.target.value)} placeholder="Password" autoComplete="new-password" />
                  </Field>
                  <Field label="Confirm Password" error={errors.confirmPassword}>
                    <TextInput icon={LockKeyhole} name="confirmPassword" type="password" value={form.confirmPassword} onChange={(event) => updateField("confirmPassword", event.target.value)} placeholder="Confirm password" autoComplete="new-password" />
                  </Field>
                </div>
                <button type="submit" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#7A183D] px-5 text-sm font-bold text-white shadow-soft transition hover:bg-[#3A2417]">
                  Create Account
                  <ArrowRight className="h-4 w-4" />
                </button>
              </>
            ) : method === "mobile" ? (
              <>
                <Field label="Mobile Number" error={errors.mobile}>
                  <TextInput icon={Phone} name="mobile" value={form.mobile} onChange={(event) => updateField("mobile", event.target.value)} placeholder="+91 98765 43210" autoComplete="tel" />
                </Field>
                <button type="submit" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#7A183D] px-5 text-sm font-bold text-white shadow-soft transition hover:bg-[#3A2417]">
                  Continue
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
                <button type="button" className="text-sm font-bold text-[#7A183D] underline-offset-4 transition hover:text-[#C9962D] hover:underline">
                  Forgot password?
                </button>
                <button type="submit" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#7A183D] px-5 text-sm font-bold text-white shadow-soft transition hover:bg-[#3A2417]">
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </button>
              </>
            )}
          </form>

          <p className="mt-3 rounded-lg border border-[rgba(201,150,45,0.24)] bg-[#FFF8EE] p-3 text-xs font-semibold leading-5 text-[#3A2417]/68 sm:text-sm sm:leading-6">
            {panelNote}
          </p>

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

          <div className="mt-5 flex flex-col gap-2.5 border-t border-[rgba(122,24,61,0.12)] pt-4 text-sm font-bold sm:flex-row sm:items-center sm:justify-between">
            <button type="button" onClick={() => setMode(isRegister ? "sign-in" : "register")} className="text-left text-[#7A183D] transition hover:text-[#C9962D]">
              {isRegister ? "Already have an account? Sign in" : "New to Karari Beauty? Create an account"}
            </button>
            <Link href="/" className="text-[#3A2417]/58 underline-offset-4 transition hover:text-[#7A183D] hover:underline">
              Continue shopping as guest
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
