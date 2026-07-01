import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Heart, Home, MapPin, PackageCheck, ShoppingBag, UserRound } from "lucide-react";

export const metadata = {
  title: {
    absolute: "My Account | Karari Beauty"
  },
  description: "Manage your Karari Beauty orders, wishlist, addresses and account details.",
  robots: {
    index: false,
    follow: false
  }
};

const previewCards = [
  { title: "My Orders", icon: ShoppingBag },
  { title: "Wishlist", icon: Heart },
  { title: "Saved Addresses", icon: MapPin },
  { title: "Recently Viewed", icon: PackageCheck },
  { title: "Support", icon: UserRound }
];

export default function AccountPage() {
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
          <div className="grid gap-0 lg:grid-cols-[0.92fr_1.08fr]">
            <div className="bg-[linear-gradient(145deg,#FFF8EE_0%,#FCE7EC_100%)] p-5 sm:p-8 lg:p-10">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#C9962D]">Account Preview</p>
              <h1 className="mt-4 font-display text-4xl font-semibold leading-tight text-[#7A183D] sm:text-5xl">Your Karari Beauty Account</h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-[#3A2417]/70">
                Sign in to manage orders, wishlist, addresses and faster checkout.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link href="/sign-in" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#7A183D] px-5 text-sm font-bold text-white shadow-soft transition hover:bg-[#3A2417]">
                  Sign In
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-[rgba(122,24,61,0.16)] bg-white/78 px-5 text-sm font-bold text-[#3A2417] shadow-soft transition hover:border-[#C9962D] hover:text-[#7A183D]">
                  <Home className="h-4 w-4" />
                  Continue Shopping
                </Link>
              </div>
            </div>

            <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-8 lg:p-10">
              {previewCards.map(({ title, icon: Icon }) => (
                <article key={title} className="rounded-xl border border-[rgba(122,24,61,0.12)] bg-[#FFF8EE]/88 p-4 shadow-soft">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#C9962D] shadow-soft">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h2 className="mt-4 font-display text-xl font-semibold text-[#7A183D]">{title}</h2>
                  <p className="mt-2 text-sm font-semibold leading-6 text-[#3A2417]/58">Available after sign in</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
