//src/utils/invoice.js
import { API_BASE } from "../services/config";

export function downloadPublicInvoice({ orderId, number, token }) {
  const url =
    `${API_BASE}orders/invoice/public` +
    `?order_id=${encodeURIComponent(orderId)}` +
    `&number=${encodeURIComponent(number)}` +
    `&token=${encodeURIComponent(token)}`;

  const a = document.createElement("a");
  a.href = url;
  a.download = ""; // let server filename win
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// --- idempotency (simple)
export function getCheckoutIdem() {
  const KEY = "checkout_idem";
  try {
    let v = sessionStorage.getItem(KEY);
    if (!v) {
      v = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(KEY, v);
    }
    return v;
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

// --- country helpers
export function normalizeCountry(c, fallback = "DE") {
  if (!c) return fallback;
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
    Ireland: "IE",
    Irland: "IE",
    Belgium: "BE",
    Belgien: "BE",
    Luxembourg: "LU",
    Luxemburg: "LU",
    Denmark: "DK",
    Dänemark: "DK",
    Sweden: "SE",
    Schweden: "SE",
    Finland: "FI",
    Finnland: "FI",
    Norway: "NO",
    Norwegen: "NO",
    Iceland: "IS",
    Island: "IS",
    Poland: "PL",
    Polen: "PL",
    "Czech Republic": "CZ",
    Czechia: "CZ",
    Tschechien: "CZ",
    Hungary: "HU",
    Ungarn: "HU",
    Slovakia: "SK",
    Slowakei: "SK",
    Spain: "ES",
    Spanien: "ES",
    Portugal: "PT",
    Malta: "MT",
    Greece: "GR",
    Griechenland: "GR",
    Cyprus: "CY",
    Zypern: "CY",
    Estonia: "EE",
    Estland: "EE",
    Latvia: "LV",
    Lettland: "LV",
    Lithuania: "LT",
    Litauen: "LT",
    Slovenia: "SI",
    Slowenien: "SI",
    Croatia: "HR",
    Kroatien: "HR",
    Romania: "RO",
    Rumänien: "RO",
    Bulgaria: "BG",
    Bulgarien: "BG",
    Liechtenstein: "LI",
  };
  return map[s] || fallback;
}

function splitName(full) {
  const parts = (full || "").trim().split(/\s+/);
  if (parts.length === 1) return { first_name: parts[0], last_name: "" };
  return {
    first_name: parts.slice(0, -1).join(" "),
    last_name: parts.slice(-1).join(" "),
  };
}

// shape we send into OrderCreateSerializer.shipping
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

// final payload for backend checkout endpoints
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
    payment_method,
    coupon_code: (couponCode || "").trim(),
    items: (items || []).map((c) => ({
      product_id: c.productId ?? c.id,
      qty: Number(c.qty) || 1,
    })),
    shipping: buildShippingSnapshot(form),
    ...extra, // idempotency_key, installments data, etc.
  };
}

// --- helper: address payload for saving to /addresses/ (user profile)
export function buildAddressPayload(form, addressIdRef) {
  const { first_name, last_name } = splitName(form.fullName);
  return {
    address_id: addressIdRef?.current ?? undefined,
    first_name,
    last_name,
    address_line1: `${form.street}${
      form.houseNumber ? ` ${form.houseNumber}` : ""
    }`.trim(),
    address_line2: form.apartment || "",
    postal_code: form.postalCode || "",
    city: form.city || "",
    country: normalizeCountry(form.country),
    phone: form.telephone || "",
    street_name: form.street || "",
    house_number: form.houseNumber || "",
    is_default: true,
  };
}
