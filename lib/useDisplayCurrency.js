"use client";

import { useEffect, useSyncExternalStore } from "react";
import { BASE_CURRENCY, formatFromBase, getCountryForLocale, getCurrencyForCountry, isSupportedCurrency } from "@/lib/currency";

const STORAGE_KEY = "karari-currency";
const COUNTRY_STORAGE_KEY = "karari-country";

/**
 * Display currency is a device preference, set by the header country selector
 * and persisted to localStorage. It is shared by components scattered across
 * the tree that have no common parent to thread a prop through, so it lives in
 * a tiny external store rather than context.
 *
 * Note this only affects what the customer *sees*. The amount charged is
 * derived server-side from the delivery country - see lib/currency.js.
 */
const listeners = new Set();
let currentCurrency = BASE_CURRENCY;

function emit() {
  for (const listener of listeners) listener();
}

function normalize(code) {
  const next = String(code || "").toUpperCase();
  return isSupportedCurrency(next) ? next : BASE_CURRENCY;
}

export function setDisplayCurrency(code) {
  const next = normalize(code);
  if (next === currentCurrency) return;

  currentCurrency = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Private browsing or storage disabled - the in-memory value still applies.
  }
  emit();
}

function subscribe(callback) {
  listeners.add(callback);

  // Keep other tabs in step when the customer switches country elsewhere.
  const onStorage = (event) => {
    if (event.key !== STORAGE_KEY) return;
    const next = normalize(event.newValue);
    if (next === currentCurrency) return;
    currentCurrency = next;
    emit();
  };

  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot() {
  return currentCurrency;
}

// Pages are prerendered, so the server has no idea what the visitor picked.
// Both server and first client render must agree on the base currency or React
// reports a hydration mismatch; the stored value is applied just after mount.
function getServerSnapshot() {
  return BASE_CURRENCY;
}

/**
 * Detect the visitor's region once per page load and preselect their currency.
 *
 * Module-level guard, not per-component: this hook is used by many price
 * components, and without it every one of them would fire the request.
 *
 * An existing stored country or currency means the visitor already chose (or
 * was detected before), and is never overridden - an automatic guess must not
 * silently undo a deliberate selection.
 */
let detectionStarted = false;

async function ensureRegionDetected() {
  if (detectionStarted) return;
  detectionStarted = true;

  try {
    if (window.localStorage.getItem(COUNTRY_STORAGE_KEY) || window.localStorage.getItem(STORAGE_KEY)) return;
  } catch {
    return;
  }

  let country = "";

  // Edge geolocation first - it reflects where the visitor actually is.
  try {
    const response = await fetch("/api/geo", { cache: "no-store" });
    if (response.ok) country = (await response.json())?.country || "";
  } catch {
    // Offline or blocked; fall through to the locale guess.
  }

  // Browser locale is a weaker signal (it describes language preference, not
  // location) so it is only consulted when the edge told us nothing.
  if (!country) country = getCountryForLocale(navigator.language);
  if (!country) return;

  try {
    window.localStorage.setItem(COUNTRY_STORAGE_KEY, country);
  } catch {
    // Non-fatal: the currency still applies for this page load.
  }

  setDisplayCurrency(getCurrencyForCountry(country));

  // Detection resolves after the header has already read localStorage, so tell
  // it to catch up rather than leaving the selector showing the wrong country.
  window.dispatchEvent(new CustomEvent("karari:region-detected", { detail: { country } }));
}

export function useDisplayCurrency() {
  const currency = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    let stored = null;
    try {
      stored = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      return;
    }

    if (!stored) {
      ensureRegionDetected();
      return;
    }

    const next = normalize(stored);
    if (next === currentCurrency) return;
    currentCurrency = next;
    emit();
  }, []);

  return {
    currency,
    /** Format an INR base price for display in the active currency. */
    format: (amountInInr) => formatFromBase(amountInInr, currency)
  };
}
