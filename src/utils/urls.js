//src/utils/urls.js
import { API_BASE } from "../services/apiSlice";

// API_BASE looks like "https://mindmines.eu/api/"
const API_ORIGIN = API_BASE.replace(/\/api\/?$/, "/"); // -> "https://mindmines.eu/"

export function toAbsoluteUrl(url) {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url; // already absolute
  return API_ORIGIN + String(url).replace(/^\/+/, ""); // join with backend origin
}
