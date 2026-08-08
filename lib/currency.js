/**
 * Country-based multi-currency support.
 *
 * All prices are stored in the database in INR. Everything here converts from
 * that base for display, and derives the amount Razorpay is actually charged.
 *
 * IMPORTANT - two things that must be true before international charging works:
 *
 * 1. RATES ARE STATIC. They are not fetched live. `unitsPerInr` below must be
 *    reviewed against the real market rate before go-live and on a schedule
 *    afterwards, otherwise the store slowly under- or over-charges. The
 *    FX_MARGIN below absorbs normal drift; it does not absorb months of it.
 *
 * 2. RAZORPAY MUST ALLOW THE CURRENCY. An Indian Razorpay account can only
 *    accept non-INR payments once International Payments is enabled on the
 *    account. Attempting a USD order on an account without it fails order
 *    creation outright. That is why non-INR charging is gated behind
 *    RAZORPAY_INTERNATIONAL_ENABLED - see resolveChargeCurrency().
 */

export const BASE_CURRENCY = "INR";

/**
 * Buffer applied to converted prices to absorb FX movement and cross-border
 * card fees between rate reviews. 4% is deliberately modest; raise it if rates
 * are reviewed infrequently.
 */
const FX_MARGIN = 0.04;

/**
 * `unitsPerInr` = how many units of this currency one rupee buys.
 * `exponent`    = decimal places, i.e. how many minor units per major unit.
 *
 * Last reviewed: NOT YET REVIEWED - see warning above. Update before charging
 * real money in any non-INR currency.
 */
export const CURRENCIES = {
  INR: { code: "INR", symbol: "₹", locale: "en-IN", exponent: 2, unitsPerInr: 1, minCharge: 1 },
  USD: { code: "USD", symbol: "$", locale: "en-US", exponent: 2, unitsPerInr: 0.012, minCharge: 0.5 },
  GBP: { code: "GBP", symbol: "£", locale: "en-GB", exponent: 2, unitsPerInr: 0.0094, minCharge: 0.3 },
  CAD: { code: "CAD", symbol: "CA$", locale: "en-CA", exponent: 2, unitsPerInr: 0.016, minCharge: 0.5 },
  AUD: { code: "AUD", symbol: "A$", locale: "en-AU", exponent: 2, unitsPerInr: 0.018, minCharge: 0.5 },
  AED: { code: "AED", symbol: "د.إ", locale: "en-AE", exponent: 2, unitsPerInr: 0.044, minCharge: 2 }
};

/**
 * Country names must match the option values used by the checkout form and the
 * header selector, since those are what actually reach this code.
 */
export const COUNTRY_CURRENCY = {
  India: "INR",
  USA: "USD",
  UK: "GBP",
  Canada: "CAD",
  Australia: "AUD",
  UAE: "AED"
};

/**
 * ISO 3166-1 alpha-2 to the country names used by the store's selectors.
 *
 * Only the six countries the store actually ships to are mapped. Anything else
 * falls back to India, which is honest rather than arbitrary: INR is the only
 * currency the payment account can currently charge in, so showing a visitor
 * from an unmapped country a converted price would misrepresent what they pay.
 */
export const COUNTRY_BY_ISO = {
  IN: "India",
  US: "USA",
  GB: "UK",
  CA: "Canada",
  AU: "Australia",
  AE: "UAE"
};

export function getCountryForIsoCode(isoCode) {
  return COUNTRY_BY_ISO[String(isoCode || "").toUpperCase()] || "";
}

/**
 * Derive a country from a browser locale such as "en-GB" or "en-AE".
 * Used only as a fallback when the server could not determine a region.
 */
export function getCountryForLocale(locale) {
  const region = String(locale || "").split("-")[1];
  return getCountryForIsoCode(region);
}

export function getCurrency(code) {
  return CURRENCIES[String(code || "").toUpperCase()] || CURRENCIES[BASE_CURRENCY];
}

export function isSupportedCurrency(code) {
  return Boolean(CURRENCIES[String(code || "").toUpperCase()]);
}

export function getCurrencyForCountry(country) {
  return COUNTRY_CURRENCY[String(country || "").trim()] || BASE_CURRENCY;
}

/**
 * Convert an INR amount into `currencyCode`, including the FX margin.
 *
 * Rounds up to a whole unit for non-INR currencies: a price of "$12" reads as a
 * deliberate price, "$11.87" reads as a bad conversion, and rounding up means
 * drift never results in undercharging.
 */
export function convertFromBase(amountInInr, currencyCode) {
  const amount = Number(amountInInr) || 0;
  const currency = getCurrency(currencyCode);

  if (currency.code === BASE_CURRENCY) return Math.round(amount);

  const converted = amount * currency.unitsPerInr * (1 + FX_MARGIN);
  return Math.max(Math.ceil(converted), currency.minCharge);
}

/**
 * Format an amount that is already expressed in `currencyCode`.
 */
export function formatMoney(amount, currencyCode = BASE_CURRENCY) {
  const currency = getCurrency(currencyCode);

  try {
    return new Intl.NumberFormat(currency.locale, {
      style: "currency",
      currency: currency.code,
      maximumFractionDigits: 0
    }).format(Number(amount) || 0);
  } catch {
    return `${currency.symbol}${Math.round(Number(amount) || 0)}`;
  }
}

/**
 * Convert an INR base price straight to a formatted string in the target
 * currency. This is what price components should call.
 */
export function formatFromBase(amountInInr, currencyCode = BASE_CURRENCY) {
  return formatMoney(convertFromBase(amountInInr, currencyCode), currencyCode);
}

/**
 * Razorpay takes the amount as an integer in the currency's smallest unit -
 * paise for INR, cents for USD. Getting this wrong by a factor of 100 is the
 * classic payment-gateway bug, so it lives in one place.
 */
export function toMinorUnits(amount, currencyCode = BASE_CURRENCY) {
  const currency = getCurrency(currencyCode);
  return Math.round(Number(amount) * 10 ** currency.exponent);
}

/**
 * Decide what currency Razorpay will actually be charged in.
 *
 * Display currency and charge currency are not the same decision. A customer in
 * the UK may see prices in GBP, but unless the Razorpay account is enabled for
 * international payments the charge must still be raised in INR - otherwise
 * order creation fails and the customer cannot pay at all.
 *
 * Returns the currency to charge plus whether a fallback was applied, so the
 * caller can tell the customer what they will actually be billed.
 */
export function resolveChargeCurrency(requestedCurrency) {
  const requested = String(requestedCurrency || BASE_CURRENCY).toUpperCase();

  if (requested === BASE_CURRENCY) {
    return { currency: BASE_CURRENCY, fellBack: false };
  }

  if (!isSupportedCurrency(requested)) {
    return { currency: BASE_CURRENCY, fellBack: true, reason: "unsupported_currency" };
  }

  if (process.env.RAZORPAY_INTERNATIONAL_ENABLED !== "true") {
    return { currency: BASE_CURRENCY, fellBack: true, reason: "international_payments_not_enabled" };
  }

  return { currency: requested, fellBack: false };
}
