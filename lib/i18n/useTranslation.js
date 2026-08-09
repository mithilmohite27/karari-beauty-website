"use client";

import { useEffect, useSyncExternalStore } from "react";
import { DEFAULT_LANGUAGE, isSupportedLanguage, translate } from "@/lib/i18n/dictionaries";

const STORAGE_KEY = "karari-language";

/**
 * Language is a device preference, mirroring the currency store in
 * lib/useDisplayCurrency.js. It is held in an external store rather than
 * context because the components that need it are scattered across the tree
 * with no common parent, and because context would force a provider into the
 * server-rendered layout.
 *
 * Note there is no /en or /hi routing. Locale-prefixed routes would multiply
 * every prerendered page and fragment the CDN cache, which is the opposite of
 * the caching work this site depends on. Language is applied client-side.
 */
const listeners = new Set();
let currentLanguage = DEFAULT_LANGUAGE;

function emit() {
  for (const listener of listeners) listener();
}

function normalize(code) {
  const next = String(code || "").toLowerCase();
  return isSupportedLanguage(next) ? next : DEFAULT_LANGUAGE;
}

export function setLanguage(code) {
  const next = normalize(code);
  if (next === currentLanguage) return;

  currentLanguage = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Private browsing - the choice still applies for this page load.
  }

  // Keeps assistive tech and browser translation prompts in step with what is
  // actually on screen.
  if (typeof document !== "undefined") document.documentElement.lang = next;

  emit();
}

function subscribe(callback) {
  listeners.add(callback);

  const onStorage = (event) => {
    if (event.key !== STORAGE_KEY) return;
    const next = normalize(event.newValue);
    if (next === currentLanguage) return;
    currentLanguage = next;
    // Also set here, not only in setLanguage: this path handles a change made
    // in another tab, and the lang attribute must follow the visible text.
    document.documentElement.lang = next;
    emit();
  };

  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot() {
  return currentLanguage;
}

// Pages are prerendered, so the server cannot know the visitor's choice. Both
// server and first client render must agree or React reports a hydration
// mismatch; the stored value is applied immediately after mount.
function getServerSnapshot() {
  return DEFAULT_LANGUAGE;
}

export function useTranslation() {
  const language = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    let stored = null;
    try {
      stored = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      return;
    }

    // No stored choice: follow the browser's language if we support it, rather
    // than forcing English on a Hindi-preferring visitor.
    const next = stored ? normalize(stored) : normalize(navigator.language?.split("-")[0]);
    if (next === currentLanguage) {
      document.documentElement.lang = next;
      return;
    }

    currentLanguage = next;
    document.documentElement.lang = next;
    emit();
  }, []);

  return {
    language,
    /** t("checkout.payNow", "Pay Now") - second argument is the fallback. */
    t: (key, fallback) => translate(language, key, fallback)
  };
}
