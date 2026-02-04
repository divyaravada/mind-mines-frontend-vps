export const GA_ID = "G-CVX8Y3H7C9";

function hasConsent() {
  return typeof window !== "undefined" && window.__mmAnalyticsConsent === true;
}

export function pageview(url) {
  if (!hasConsent()) return;
  if (!window.dataLayer) window.dataLayer = [];
  window.dataLayer.push({ event: "page_view", page_path: url });
}

export function event(name, params = {}) {
  if (!hasConsent()) return;
  if (!window.dataLayer) window.dataLayer = [];
  window.dataLayer.push({ event: name, ...params });
}
