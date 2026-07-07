"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Heart, Home, LogOut, Mail, MapPin, PackageCheck, Phone, ShoppingBag, UserRound } from "lucide-react";
import { getCustomerDisplayName, getCustomerSession, signOutCustomer } from "@/lib/customer/session";

function profileValue(value, fallback = "Not added yet") {
  return value || fallback;
}

function DetailCard({ icon: Icon, label, value }) {
  return (
    <article className="rounded-xl border border-[rgba(122,24,61,0.12)] bg-[#FFF8EE]/88 p-4 shadow-soft">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#C9962D] shadow-soft">
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-[#C9962D]">{label}</p>
      <p className="mt-1 break-words text-sm font-bold leading-6 text-[#3A2417]">{value}</p>
    </article>
  );
}

export default function AccountExperience() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    const syncCustomer = async () => {
      const { user: customerUser } = await getCustomerSession();
      if (!mounted) return;

      if (!customerUser) {
        window.location.replace("/sign-in?redirect=/account");
        return;
      }

      setUser(customerUser);
      setChecking(false);
    };

    syncCustomer();
    window.addEventListener("customerAuth:updated", syncCustomer);

    return () => {
      mounted = false;
      window.removeEventListener("customerAuth:updated", syncCustomer);
    };
  }, []);

  const profile = user?.user_metadata || {};
  const customerName = getCustomerDisplayName(user);
  const address = useMemo(
    () =>
      [profile.address, profile.city, profile.state, profile.pincode, profile.country]
        .filter(Boolean)
        .join(", "),
    [profile.address, profile.city, profile.country, profile.pincode, profile.state]
  );

  const logout = async () => {
    await signOutCustomer();
    window.location.assign("/");
  };

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,#FFF8EE_0%,#FCE7EC_58%,#FFF8EE_100%)] px-4 text-[#3A2417]">
        <div className="rounded-2xl border border-[rgba(122,24,61,0.14)] bg-white/86 p-6 text-center shadow-boutique">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#C9962D]">Karari Beauty</p>
          <p className="mt-2 font-display text-2xl font-semibold text-[#7A183D]">Opening your account...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#FFF8EE_0%,#FCE7EC_58%,#FFF8EE_100%)] px-3 py-6 text-[#3A2417] sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="inline-flex items-center gap-3" aria-label="Go to Karari Beauty home">
          <Image src="/logo.png" alt="Karari Beauty logo" width={52} height={52} priority className="h-[3.25rem] w-[3.25rem] rounded-full border border-[rgba(201,150,45,0.32)] object-cover shadow-soft" />
          <span>
            <span className="block font-display text-2xl font-semibold text-[#3A2417]">Karari Beauty</span>
            <span className="mt-1 block text-xs font-bold uppercase tracking-[0.2em] text-[#C9962D]">Customer Account</span>
          </span>
        </Link>

        <section className="mt-6 overflow-hidden rounded-2xl border border-[rgba(122,24,61,0.14)] bg-white/82 shadow-boutique backdrop-blur">
          <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="bg-[linear-gradient(145deg,#FFF8EE_0%,#FCE7EC_100%)] p-5 sm:p-8 lg:p-10">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#C9962D]">Welcome back</p>
              <h1 className="mt-4 font-display text-4xl font-semibold leading-tight text-[#7A183D] sm:text-5xl">{customerName}</h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-[#3A2417]/70">
                Manage your contact details, order requests and saved shopping preferences.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link href="/" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#7A183D] px-5 text-sm font-bold text-white shadow-soft transition hover:bg-[#3A2417]">
                  Continue Shopping
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <button type="button" onClick={logout} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-[rgba(122,24,61,0.16)] bg-white/78 px-5 text-sm font-bold text-[#7A183D] shadow-soft transition hover:border-[#C9962D] hover:text-[#3A2417]">
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </div>

            <div className="p-5 sm:p-8 lg:p-10">
              <div className="grid gap-3 sm:grid-cols-2">
                <DetailCard icon={UserRound} label="Name" value={profileValue(profile.full_name, customerName)} />
                <DetailCard icon={Mail} label="Email" value={profileValue(user?.email)} />
                <DetailCard icon={Phone} label="Mobile" value={profileValue(profile.phone || profile.mobile)} />
                <DetailCard icon={MapPin} label="Address" value={profileValue(address)} />
              </div>

              <section id="orders" className="mt-5 rounded-xl border border-[rgba(122,24,61,0.12)] bg-[#FFF8EE]/88 p-4 shadow-soft">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#C9962D] shadow-soft">
                    <ShoppingBag className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#C9962D]">Orders</p>
                    <h2 className="mt-1 font-display text-2xl font-semibold text-[#7A183D]">Order requests</h2>
                    <p className="mt-2 text-sm font-semibold leading-6 text-[#3A2417]/62">
                      Recent online order requests will appear here after Karari Beauty confirms availability and delivery.
                    </p>
                  </div>
                </div>
              </section>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Link href="/cart" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[rgba(122,24,61,0.14)] bg-white px-4 text-sm font-bold text-[#3A2417] transition hover:border-[#C9962D] hover:text-[#7A183D]">
                  <PackageCheck className="h-4 w-4" />
                  Review Cart
                </Link>
                <Link href="/" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[rgba(122,24,61,0.14)] bg-white px-4 text-sm font-bold text-[#3A2417] transition hover:border-[#C9962D] hover:text-[#7A183D]">
                  <Heart className="h-4 w-4" />
                  Browse Wishlist Picks
                </Link>
                <Link href="/" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[rgba(122,24,61,0.14)] bg-white px-4 text-sm font-bold text-[#3A2417] transition hover:border-[#C9962D] hover:text-[#7A183D] sm:col-span-2">
                  <Home className="h-4 w-4" />
                  Back to Home
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
