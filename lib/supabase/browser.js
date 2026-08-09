import { createClient } from "@supabase/supabase-js";

export function getSupabasePublicEnv() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  };
}

export function isSupabasePublicConfigured() {
  const { url, anonKey } = getSupabasePublicEnv();
  return Boolean(url && anonKey);
}

/**
 * "Remember me" preference.
 *
 * Supabase already owns the session; the only thing this preference changes is
 * WHERE that session is kept:
 *   - remembered  -> localStorage, survives closing the browser (previous behaviour)
 *   - not remembered -> sessionStorage, cleared when the tab/browser closes
 *
 * No password, password hash or extra credential is ever written anywhere. The
 * default is "remembered" so existing signed-in customers are unaffected.
 */
const REMEMBER_STORAGE_KEY = "karari.auth.remember";

function isBrowser() {
  return typeof window !== "undefined";
}

function safeStorage(kind) {
  if (!isBrowser()) return null;
  try {
    const store = kind === "session" ? window.sessionStorage : window.localStorage;
    if (!store) return null;
    const probe = "__karari_storage_probe__";
    store.setItem(probe, "1");
    store.removeItem(probe);
    return store;
  } catch {
    return null;
  }
}

export function getRememberPreference() {
  const store = safeStorage("local");
  if (!store) return true;
  return store.getItem(REMEMBER_STORAGE_KEY) !== "false";
}

export function setRememberPreference(remember) {
  const store = safeStorage("local");
  if (!store) return;
  try {
    store.setItem(REMEMBER_STORAGE_KEY, remember ? "true" : "false");
  } catch {
    // Storage is unavailable (private mode); Supabase falls back on its own.
  }
}

/**
 * Reads from whichever storage currently holds the session, writes to the one
 * the customer's "remember me" choice selected.
 */
const rememberAwareStorage = {
  getItem(key) {
    const sessionStore = safeStorage("session");
    const sessionValue = sessionStore ? sessionStore.getItem(key) : null;
    if (sessionValue !== null) return sessionValue;

    const localStore = safeStorage("local");
    return localStore ? localStore.getItem(key) : null;
  },
  setItem(key, value) {
    const remember = getRememberPreference();
    const target = safeStorage(remember ? "local" : "session");
    const other = safeStorage(remember ? "session" : "local");

    try {
      if (other) other.removeItem(key);
      if (target) target.setItem(key, value);
    } catch {
      // Ignore quota/private-mode failures; the in-memory session still works.
    }
  },
  removeItem(key) {
    try {
      safeStorage("local")?.removeItem(key);
      safeStorage("session")?.removeItem(key);
    } catch {
      // Nothing to clean up.
    }
  }
};

/**
 * One client per browser context. Creating a new GoTrue client per component
 * spawns competing refresh timers and lets two instances race for the tokens in
 * an OAuth/recovery URL fragment, so the instance is memoised.
 */
let browserClient = null;

export function createBrowserSupabaseClient() {
  const { url, anonKey } = getSupabasePublicEnv();

  if (!url || !anonKey) {
    return null;
  }

  if (browserClient) return browserClient;

  const client = createClient(url, anonKey, {
    auth: {
      flowType: "implicit",
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
      ...(isBrowser() ? { storage: rememberAwareStorage } : {})
    }
  });

  if (isBrowser()) browserClient = client;

  return client;
}
