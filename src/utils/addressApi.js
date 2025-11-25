// src/utils/addressApi.js
const GEOAPIFY_KEY = process.env.REACT_APP_GEOAPIFY_KEY;

// 🇪🇺 helper to normalize ISO 2 code
function normalizeCC(code) {
  return (code || "").trim().toLowerCase();
}

/**
 * From COUNTRY + POSTCODE → suggest cities (EU wide).
 * Uses Geoapify Address Autocomplete API.
 *
 * Docs: https://api.geoapify.com/v1/geocode/autocomplete
 */
export async function lookupCityFromPostal(countryCode, postal) {
  if (!GEOAPIFY_KEY) {
    console.warn("Geoapify key missing (REACT_APP_GEOAPIFY_KEY).");
    return [];
  }
  const cc = normalizeCC(countryCode || "DE");
  const text = String(postal || "").trim();
  if (!text) return [];

  const url =
    `https://api.geoapify.com/v1/geocode/autocomplete` +
    `?text=${encodeURIComponent(text)}` +
    `&type=postcode` +
    `&filter=countrycode:${cc}` +
    `&format=json` +
    `&apiKey=${encodeURIComponent(GEOAPIFY_KEY)}`;

  const res = await fetch(url);
  if (!res.ok) return [];

  const data = await res.json();
  const results = data.results || [];
  const cities = new Set();

  for (const r of results) {
    if (r.city) cities.add(r.city);
    else if (r.county) cities.add(r.county);
    else if (r.state) cities.add(r.state);
  }

  return Array.from(cities);
}

/**
 * Optional: street autocomplete.
 * COUNTRY + (CITY + partial street) → street suggestions
 */
export async function autocompleteStreet(countryCode, city, streetPart) {
  if (!GEOAPIFY_KEY) {
    console.warn("Geoapify key missing (REACT_APP_GEOAPIFY_KEY).");
    return [];
  }
  const cc = normalizeCC(countryCode || "DE");
  const q = [streetPart, city].filter(Boolean).join(", ").trim();
  if (!q) return [];

  const url =
    `https://api.geoapify.com/v1/geocode/autocomplete` +
    `?text=${encodeURIComponent(q)}` +
    `&type=street` +
    `&filter=countrycode:${cc}` +
    `&format=json` +
    `&apiKey=${encodeURIComponent(GEOAPIFY_KEY)}`;

  const res = await fetch(url);
  if (!res.ok) return [];

  const data = await res.json();
  const results = data.results || [];
  const streets = new Set();

  for (const r of results) {
    if (r.street) streets.add(r.street);
    else if (r.address_line1) streets.add(r.address_line1);
    else if (r.formatted) streets.add(r.formatted);
  }

  return Array.from(streets);
}
