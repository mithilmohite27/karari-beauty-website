/**
 * Field-level validation for checkout.
 *
 * The previous checkout only tested that required fields were non-empty, so
 * "a", "not-an-email" and a 3-digit phone number all passed and the failure
 * surfaced later as an undeliverable order or a bounced confirmation.
 *
 * Each validator returns "" when the value is acceptable, or a message written
 * for the customer. Callers treat a non-empty string as the error to display.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Expected national number length by country, used to catch digits-missing
 * typos rather than to fully validate numbering plans.
 */
const PHONE_RULES = {
  India: { min: 10, max: 10, hint: "Enter the 10-digit mobile number." },
  USA: { min: 10, max: 10, hint: "Enter the 10-digit phone number." },
  Canada: { min: 10, max: 10, hint: "Enter the 10-digit phone number." },
  UK: { min: 10, max: 11, hint: "Enter the full phone number." },
  Australia: { min: 9, max: 10, hint: "Enter the full phone number." },
  UAE: { min: 9, max: 9, hint: "Enter the 9-digit phone number." }
};

const DEFAULT_PHONE_RULE = { min: 7, max: 15, hint: "Enter a valid phone number." };

export function digitsOnly(value) {
  return String(value || "").replace(/\D/g, "");
}

export function validateFullName(value) {
  const name = String(value || "").trim();
  if (!name) return "Full name is required.";
  if (name.length < 2) return "Please enter your full name.";
  if (!/[a-zA-Zऀ-ॿ]/.test(name)) return "Please enter your name in letters.";
  return "";
}

export function validateEmail(value, { required = false } = {}) {
  const email = String(value || "").trim();
  if (!email) return required ? "Email is required." : "";
  if (!EMAIL_PATTERN.test(email)) return "Enter a valid email, for example name@example.com";
  return "";
}

export function validatePhone(value, country = "India") {
  const raw = String(value || "").trim();
  if (!raw) return "Mobile number is required.";

  const digits = digitsOnly(raw);
  if (!digits) return "Enter a valid phone number.";

  const rule = PHONE_RULES[country] || DEFAULT_PHONE_RULE;

  // Tolerate a country code typed in front of the national number.
  const national = digits.length > rule.max && digits.length <= rule.max + 3
    ? digits.slice(digits.length - rule.max)
    : digits;

  if (national.length < rule.min || national.length > rule.max) return rule.hint;
  if (country === "India" && !/^[6-9]/.test(national)) return "Indian mobile numbers start with 6, 7, 8 or 9.";

  return "";
}

export function validatePincode(value, country = "India") {
  const raw = String(value || "").trim();
  if (!raw) return "Pincode / ZIP is required.";

  if (country === "India") {
    const digits = digitsOnly(raw);
    if (digits.length !== 6) return "Indian PIN codes are 6 digits.";
    if (digits.startsWith("0")) return "Enter a valid PIN code.";
    return "";
  }

  if (raw.length < 3) return "Enter a valid postal code.";
  return "";
}

export function validateRequired(value, message) {
  return String(value || "").trim() ? "" : message;
}

/**
 * Validate the whole form. Returns a map of field name to message, containing
 * only the fields that failed.
 */
export function validateCheckoutForm(form) {
  const errors = {};
  const country = form.country || "India";

  const checks = {
    fullName: validateFullName(form.fullName),
    mobile: validatePhone(form.mobile, country),
    email: validateEmail(form.email),
    country: validateRequired(form.country, "Country is required."),
    address: validateRequired(form.address, "Address is required."),
    city: validateRequired(form.city, "City is required."),
    state: validateRequired(form.state, "State is required."),
    pincode: validatePincode(form.pincode, country)
  };

  for (const [field, message] of Object.entries(checks)) {
    if (message) errors[field] = message;
  }

  return errors;
}

/**
 * Look up an Indian PIN code and return { city, state }.
 *
 * Uses India Post's public API, which needs no key or billing - the practical
 * equivalent of address autocomplete for the store's main market. Best effort
 * only: any failure returns null and the customer types the fields themselves.
 */
export async function lookupIndianPincode(pincode, { signal } = {}) {
  const digits = digitsOnly(pincode);
  if (digits.length !== 6) return null;

  try {
    const response = await fetch(`https://api.postalpincode.in/pincode/${digits}`, { signal });
    if (!response.ok) return null;

    const payload = await response.json();
    const office = payload?.[0]?.PostOffice?.[0];
    if (!office) return null;

    return {
      city: office.District || office.Block || "",
      state: office.State || ""
    };
  } catch {
    // Offline, blocked, or aborted - never block checkout on this.
    return null;
  }
}
