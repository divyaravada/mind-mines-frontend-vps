export const GA_ID = "G-CVX8Y3H7C9";
export function pageview(url) {
  if (!window.gtag) return;
  window.gtag("config", GA_ID, { page_path: url });
}

export function event(name, params = {}) {
  if (!window.gtag) return;
  window.gtag("event", name, params);
}
