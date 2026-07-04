"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ArrowUp, X } from "lucide-react";
import { createWhatsAppUrl } from "@/lib/whatsapp";

function WhatsAppIcon({ className = "h-6 w-6" }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className} fill="currentColor">
      <path d="M16.02 3.2A12.74 12.74 0 0 0 5.3 22.82L3.8 28.4l5.72-1.49A12.73 12.73 0 1 0 16.02 3.2Zm0 23.38a10.6 10.6 0 0 1-5.4-1.48l-.39-.23-3.39.89.9-3.3-.25-.4A10.59 10.59 0 1 1 16.02 26.58Zm5.81-7.93c-.32-.16-1.88-.93-2.17-1.03-.29-.11-.5-.16-.71.16-.21.32-.82 1.03-1 1.24-.18.21-.37.24-.69.08-.32-.16-1.34-.49-2.55-1.57-.94-.84-1.58-1.88-1.76-2.2-.18-.32-.02-.49.14-.65.14-.14.32-.37.48-.56.16-.18.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.71-1.72-.98-2.35-.26-.62-.52-.53-.71-.54h-.61c-.21 0-.56.08-.85.4-.29.32-1.11 1.09-1.11 2.64 0 1.56 1.14 3.07 1.3 3.28.16.21 2.24 3.42 5.43 4.8.76.33 1.35.52 1.81.67.76.24 1.46.21 2 .13.61-.09 1.88-.77 2.15-1.51.26-.74.26-1.37.18-1.51-.08-.13-.29-.21-.61-.37Z" />
    </svg>
  );
}

function BackToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 360);

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <AnimatePresence>
      {visible ? (
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 12, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.94 }}
          transition={{ duration: 0.18 }}
          onClick={scrollToTop}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-[rgba(201,150,45,0.42)] bg-[#FFF8EE] text-[#7A183D] shadow-boutique transition hover:-translate-y-0.5 hover:border-[#C9962D] hover:bg-[#7A183D] hover:text-[#FFF8EE] sm:h-12 sm:w-12"
          aria-label="Back to top"
        >
          <ArrowUp className="h-5 w-5" />
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
}

function WhatsAppWidget({ siteSettings }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative flex flex-col items-end">
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            className="mb-4 w-[min(21rem,calc(100vw-2rem))] rounded-xl border border-black/12 bg-white p-5 shadow-boutique"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0cc96b] text-white">
                <WhatsAppIcon className="h-7 w-7" />
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-black/10 p-2 text-ink hover:text-wine" aria-label="Close WhatsApp widget">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-5 text-2xl font-semibold text-charcoal">Hi there!</p>
            <p className="mt-1 text-xl font-medium text-charcoal">How can I help you?</p>
            <a href={createWhatsAppUrl({ product: null, siteSettings })} className="mt-5 inline-flex w-full items-center justify-between rounded-md bg-charcoal px-4 py-3 font-bold text-white transition hover:bg-wine">
              <span className="inline-flex items-center gap-2">
                <WhatsAppIcon className="h-5 w-5" />
                Continue on WhatsApp
              </span>
              <ArrowRight className="h-5 w-5" />
            </a>
            <p className="mt-3 text-center text-xs font-semibold text-ink/40">{siteSettings?.business?.name || "Karari Beauty"} assistance</p>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex h-14 w-14 items-center justify-center rounded-full bg-[#0cc96b] text-white shadow-boutique ring-4 ring-white transition hover:scale-105" aria-label="Open WhatsApp chat">
        <WhatsAppIcon className="h-8 w-8" />
      </button>
    </div>
  );
}

export default function FloatingActions({ siteSettings }) {
  return (
    <div className="fixed bottom-5 right-4 z-40 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      <BackToTopButton />
      <WhatsAppWidget siteSettings={siteSettings} />
    </div>
  );
}
