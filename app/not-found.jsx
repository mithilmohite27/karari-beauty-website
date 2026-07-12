import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Home } from "lucide-react";

export const metadata = {
  title: {
    absolute: "Page Not Found | Karari Beauty"
  },
  robots: {
    index: false,
    follow: false
  }
};

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#FFF8EE_0%,#FCE7EC_58%,#FFF8EE_100%)] px-4 py-12 text-[#3A2417]">
      <section className="w-full max-w-xl rounded-lg border border-[rgba(122,24,61,0.14)] bg-white/78 px-6 py-10 text-center shadow-boutique backdrop-blur sm:px-10">
        <Image src="/logo.png" alt="Karari Beauty" width={72} height={72} className="mx-auto h-16 w-16 rounded-full border border-[rgba(201,150,45,0.32)] object-cover" priority />
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-[#C9962D]">404</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-[#7A183D] sm:text-4xl">This page could not be found</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#3A2417]/68 sm:text-base">The link may have changed, or the product may no longer be available.</p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#7A183D] px-5 text-sm font-bold text-[#FFF8EE] transition hover:bg-[#3A2417]">
            <Home className="h-4 w-4" />
            Go to homepage
          </Link>
          <Link href="/#collections" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[rgba(122,24,61,0.2)] bg-[#FFF8EE] px-5 text-sm font-bold text-[#7A183D] transition hover:border-[#C9962D]">
            <ArrowLeft className="h-4 w-4" />
            Browse collections
          </Link>
        </div>
      </section>
    </main>
  );
}
