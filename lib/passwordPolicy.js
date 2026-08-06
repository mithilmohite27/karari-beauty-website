/**
 * Password rules for customer registration.
 *
 * Supabase's leaked-password check (HaveIBeenPwned) is a Pro-plan feature and
 * cannot be enabled on this project, so these rules stand in for it. They are
 * not equivalent - a breached but unusual password still passes - but they do
 * reject the passwords that dominate credential-stuffing lists.
 *
 * This is a usability guard, not the enforcement boundary: a client can call
 * the Supabase Auth API directly and bypass it. The authoritative settings live
 * in Authentication > Providers > Email (minimum length and password
 * requirements), which are available on the free plan and should be set to
 * match MIN_PASSWORD_LENGTH below.
 */

export const MIN_PASSWORD_LENGTH = 10;

const COMMON_PASSWORDS = new Set([
  "password", "password1", "password123", "passw0rd", "qwerty", "qwerty123",
  "123456", "1234567", "12345678", "123456789", "1234567890", "12345",
  "111111", "000000", "abc123", "abcd1234", "a1b2c3d4", "letmein",
  "welcome", "welcome1", "welcome123", "admin", "admin123", "administrator",
  "iloveyou", "monkey", "dragon", "sunshine", "princess", "football",
  "baseball", "master", "shadow", "superman", "trustno1", "whatever",
  "starwars", "computer", "internet", "samsung", "google", "asdfghjkl",
  "zxcvbnm", "qwertyuiop", "india123", "indian123", "krishna", "ganesh123",
  "changeme", "secret", "temp1234", "test1234"
]);

/**
 * Returns a human-readable problem with the password, or "" when acceptable.
 */
export function getPasswordProblem(password, email = "") {
  const value = String(password || "");

  if (value.length < MIN_PASSWORD_LENGTH) return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (!/[a-zA-Z]/.test(value)) return "Password must include at least one letter.";
  if (!/[0-9]/.test(value)) return "Password must include at least one number.";

  const normalized = value.toLowerCase();
  if (COMMON_PASSWORDS.has(normalized)) return "This password is too common. Please choose something harder to guess.";
  if (/^(.)\1+$/.test(value)) return "Password cannot be the same character repeated.";
  if (/^(?:0123456789|1234567890|abcdefghij)/.test(normalized)) return "Password cannot be a simple sequence.";

  // Passwords built from the account's own email or the store name are the
  // first thing tried against a known customer list.
  const localPart = String(email || "").split("@")[0].toLowerCase();
  if (localPart.length >= 4 && normalized.includes(localPart)) return "Password must not contain your email address.";
  if (normalized.includes("karari")) return "Password must not contain the store name.";

  return "";
}
