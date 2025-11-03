import { API_BASE } from "../services/config";

// API_BASE like "https://mindmines.eu/api/"
// -> origin "https://mindmines.eu/"
const API_ORIGIN = API_BASE.replace(/\/api\/?$/i, "/");

export function toAbsoluteUrl(url) {
  if (!url) return url;
  const s = String(url);
  if (/^https?:\/\//i.test(s)) return s; // already absolute
  if (s.startsWith("//")) return window?.location?.protocol + s; // protocol-relative
  return API_ORIGIN + s.replace(/^\/+/, ""); // join with backend origin
}

function makeKey() {
  return (
    "idem_" + Math.random().toString(36).slice(2) + Date.now().toString(36)
  );
}

/**
 * Returns a stable idempotency key for the current cartSig.
 * cartSig: string signature of [{product_id,qty},...]
 */
export function getCheckoutIdem(cartSig) {
  try {
    const STORE_KEY = "checkout_idem_map";
    const raw = sessionStorage.getItem(STORE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    if (map[cartSig]) return map[cartSig];
    const fresh = makeKey();
    map[cartSig] = fresh;
    sessionStorage.setItem(STORE_KEY, JSON.stringify(map));
    return fresh;
  } catch {
    return makeKey();
  }
}
