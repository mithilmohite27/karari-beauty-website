"use client";

import { useEffect, useSyncExternalStore } from "react";
import { BASE_CURRENCY, formatFromBase, isSupportedCurrency } from "@/lib/currency";

const STORAGE_KEY = "karari-currency";

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

export function useDisplayCurrency() {
  const currency = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    let stored = null;
    try {
      stored = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      return;
    }

    const next = normalize(stored);
    if (!stored || next === currentCurrency) return;
    currentCurrency = next;
    emit();
  }, []);

  return {
    currency,
    /** Format an INR base price for display in the active currency. */
    format: (amountInInr) => formatFromBase(amountInInr, currency)
  };
}
