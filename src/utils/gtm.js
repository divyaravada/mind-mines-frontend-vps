export function injectGTM(gtmId) {
  if (!gtmId) return;

  // Prevent duplicate inject
  if (document.getElementById("mm-gtm-script")) return;

  // Optional: dataLayer init
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: "gtm.init" });

  const s = document.createElement("script");
  s.id = "mm-gtm-script";
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(
    gtmId
  )}`;
  document.head.appendChild(s);
}

export function removeGTM() {
  // Remove GTM script
  const s = document.getElementById("mm-gtm-script");
  if (s) s.remove();

  // Remove GTM iframes (noscript fallback not used here but GTM can create frames)
  document
    .querySelectorAll('iframe[src*="googletagmanager.com"]')
    .forEach((el) => el.remove());
}

export function deleteAnalyticsCookies() {
  // Simple cleanup (not perfect; depends on your tags)
  const cookies = document.cookie.split(";").map((c) => c.trim());
  const names = ["_ga", "_gid", "_gat"];
  for (const c of cookies) {
    const name = c.split("=")[0];
    if (names.some((n) => name.startsWith(n))) {
      document.cookie = `${name}=; Max-Age=0; path=/;`;
      document.cookie = `${name}=; Max-Age=0; path=/; domain=.mindmines.eu;`;
    }
  }
}
