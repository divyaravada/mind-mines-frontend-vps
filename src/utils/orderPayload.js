//src/utils/orderPayload.js
import { normalizeCountry as normalizeCountryBase } from "./invoice";

export const normalizeCountry = normalizeCountryBase;

// split "Anna Maria Müller" -> { first_name: "Anna Maria", last_name: "Müller" }
function splitName(full) {
  const parts = (full || "").trim().split(/\s+/);
  if (parts.length === 1) {
    return { first_name: parts[0], last_name: "" };
  }
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
  promotion,
  payment_method,
  extra = {},
}) {
  return {
    email,
    payment_method,
    coupon_code: (couponCode || "").trim(),
    items: items.map((c) => ({
      product_id: c.productId ?? c.id,
      qty: Number(c.qty) || 1,
    })),
    shipping: buildShippingSnapshot(form),
    ...(promotion ? { promotion } : {}),
    ...extra, // idempotency_key, installments data, etc.
  };
}

// --- helper: address payload for saving to /addresses/ (user profile)

export function buildAddressPayload(form, addressIdRef) {
  const { first_name, last_name } = splitName(form.fullName);
  return {
    address_id: addressIdRef.current ?? undefined,
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
