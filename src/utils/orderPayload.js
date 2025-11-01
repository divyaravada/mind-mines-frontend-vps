// src/utils/orderPayload.js

// Split "Full Name" -> first_name / last_name
export function splitName(full) {
  const parts = (full || "").trim().split(/\s+/);
  if (parts.length === 1) {
    return { first_name: parts[0], last_name: "" };
  }
  return {
    first_name: parts.slice(0, -1).join(" "),
    last_name: parts.slice(-1).join(" "),
  };
}

// Convert checkout form into the "shipping" snapshot backend expects
export function buildShippingSnapshot(form) {
  const { first_name, last_name } = splitName(form.fullName);
  return {
    first_name,
    last_name,
    line1: `${form.street}${
      form.houseNumber ? ` ${form.houseNumber}` : ""
    }`.trim(),
    line2: form.apartment || "",
    postal_code: form.postalCode || "",
    city: form.city || "",
    country: normalizeCountry(form.country),
    phone: form.telephone || "",
    street_name: form.street || "",
    house_number: form.houseNumber || "",
  };
}

// Normalize country codes to 2-letter for backend / Stripe
export function normalizeCountry(c) {
  if (!c) return "DE";
  const s = String(c).trim();
  if (s.length === 2) return s.toUpperCase();
  const map = {
    Germany: "DE",
    Deutschland: "DE",
    Austria: "AT",
    Österreich: "AT",
    Switzerland: "CH",
    Schweiz: "CH",
    Italy: "IT",
    Italia: "IT",
    France: "FR",
    Frankreich: "FR",
    Netherlands: "NL",
    Niederlande: "NL",
  };
  return map[s] || "DE";
}

// Core payload for any order creation request
export function buildOrderPayload({
  form,
  items,
  email,
  couponCode,
  payment_method,
  extra = {},
}) {
  return {
    email,
    payment_method, // "card", "paypal", "sepa_debit", etc.
    coupon_code: (couponCode || "").trim(),
    items: items.map((c) => ({
      product_id: c.id,
      qty: c.qty,
    })),
    shipping: buildShippingSnapshot(form),
    ...extra,
  };
}
