export const GA_ID = process.env.REACT_APP_GOOGLE_ANALYTICS_ID;

export function pageview(url) {
  if (!window.gtag) return;
  window.gtag("config", GA_ID, { page_path: url });
}

export function event(name, params = {}) {
  if (!window.gtag) return;
  window.gtag("event", name, params);
}

export function gaEvent(name, params = {}) {
  try {
    if (typeof window === "undefined") return; // SSR safety
    if (typeof window.gtag !== "function") return; // GA not loaded yet
    window.gtag("event", name, params);
  } catch {
    // never crash the app because analytics failed
  }
}
