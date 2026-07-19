"use client";

import Link from "next/link";
import { ChevronRight, Mail, Phone } from "lucide-react";
import { Header, Footer } from "@/components/HomeExperience";
import { policyContact, policyLastUpdated, policyLinks } from "@/data/policies";

export default function PolicyPageExperience({ policy, categories, siteSettings }) {
  const relatedLinks = policyLinks.filter((link) => link.title !== policy.title);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#FFF8EE_0%,#FCE7EC_48%,#FFF8EE_100%)] text-[#3A2417]">
      <Header campaignActive={false} onViewProduct={() => {}} recentlyViewed={[]} categories={categories} products={[]} siteSettings={siteSettings} />

      <section className="px-3 py-7 sm:px-6 sm:py-10 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <nav className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#3A2417]/55">
            <Link href="/" className="transition hover:text-[#7A183D]">Home</Link>
            <ChevronRight className="h-4 w-4 text-[#C9962D]" />
            <span className="text-[#7A183D]">{policy.title}</span>
          </nav>

          <header className="mt-5 rounded-xl border border-[rgba(122,24,61,0.14)] bg-white/78 p-5 shadow-soft backdrop-blur sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#C9962D]">Karari Beauty Policy</p>
            <h1 className="mt-3 font-display text-3xl font-semibold text-[#7A183D] sm:text-5xl">{policy.title}</h1>
            <p className="mt-4 max-w-3xl text-sm font-medium leading-7 text-[#3A2417]/70">{policy.description}</p>
            <p className="mt-4 text-sm font-bold text-[#3A2417]/66">Last updated: {policyLastUpdated}</p>
          </header>

          <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <article className="rounded-xl border border-[rgba(122,24,61,0.14)] bg-white/86 p-5 shadow-boutique sm:p-8">
              <div className="space-y-8">
                {policy.sections.map((section) => (
                  <section key={section.heading}>
                    <h2 className="font-display text-2xl font-semibold text-[#7A183D]">{section.heading}</h2>
                    <div className="mt-3 space-y-3 text-sm font-medium leading-7 text-[#3A2417]/72 sm:text-base">
                      {section.body.map((paragraph) => (
                        <p key={paragraph}>{paragraph}</p>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </article>

            <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
              <section className="rounded-xl border border-[rgba(122,24,61,0.14)] bg-white/80 p-4 shadow-soft">
                <h2 className="font-display text-xl font-semibold text-[#7A183D]">Need Help?</h2>
                <div className="mt-4 space-y-3 text-sm font-semibold text-[#3A2417]/72">
                  <a href={`mailto:${policyContact.supportEmail}`} className="flex items-center gap-2 rounded-md bg-[#FFF8EE] px-3 py-2 transition hover:text-[#7A183D]">
                    <Mail className="h-4 w-4 text-[#C9962D]" />
                    {policyContact.supportEmail}
                  </a>
                  <a href={`tel:${policyContact.phoneNumber.replace(/\s/g, "")}`} className="flex items-center gap-2 rounded-md bg-[#FFF8EE] px-3 py-2 transition hover:text-[#7A183D]">
                    <Phone className="h-4 w-4 text-[#C9962D]" />
                    {policyContact.phoneNumber}
                  </a>
                </div>
              </section>

              <section className="rounded-xl border border-[rgba(122,24,61,0.14)] bg-white/80 p-4 shadow-soft">
                <h2 className="font-display text-xl font-semibold text-[#7A183D]">Related Policies</h2>
                <div className="mt-3 grid gap-2">
                  {relatedLinks.map((link) => (
                    <Link key={link.href} href={link.href} className="rounded-md border border-[rgba(122,24,61,0.12)] bg-[#FFF8EE]/72 px-3 py-2 text-sm font-bold text-[#3A2417]/72 transition hover:border-[#C9962D] hover:text-[#7A183D]">
                      {link.title}
                    </Link>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        </div>
      </section>

      <Footer categories={categories} siteSettings={siteSettings} />
    </main>
  );
}
