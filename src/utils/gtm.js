const GTM_SCRIPT_ID = "mm-gtm-script";
const GTM_IFRAME_MARK = "mm-gtm-iframe";

function ensureDataLayer() {
  if (typeof window === "undefined") return null;
  window.dataLayer = window.dataLayer || [];
  return window.dataLayer;
}

function bootDataLayer() {
  const dl = ensureDataLayer();
  if (!dl) return;
  dl.push({ mm_consent_boot: Date.now() });
}

/**
 * (Optional but recommended) Google Consent Mode update.
 * Works if your GTM container uses GA/gtag tags.
 */
export function setGtagConsent({ analytics = false, marketing = false } = {}) {
  if (typeof window === "undefined") return;
  if (typeof window.gtag !== "function") return;

  window.gtag("consent", "update", {
    analytics_storage: analytics ? "granted" : "denied",
    ad_storage: marketing ? "granted" : "denied",
    ad_user_data: marketing ? "granted" : "denied",
    ad_personalization: marketing ? "granted" : "denied",
  });
}

/** Load GTM without inline JS (better for CSP) */
export function injectGTM(gtmId) {
  if (!gtmId || typeof document === "undefined") return;
  if (document.getElementById("mm-gtm-script")) return;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ mm_consent_boot: Date.now() });

  const s = document.createElement("script");
  s.id = "mm-gtm-script";
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(
    gtmId
  )}`;
  document.head.appendChild(s);
}
/** Best-effort removal (cookies may require a reload to fully stop tracking) */
export function removeGTM() {
  try {
    if (typeof document !== "undefined") {
      const s = document.getElementById(GTM_SCRIPT_ID);
      if (s) s.remove();

      // Remove GTM iframes we added
      const f = document.getElementById(GTM_IFRAME_MARK);
      if (f) f.remove();

      // Also remove any GTM-created iframes (best effort)
      document
        .querySelectorAll('iframe[src*="googletagmanager.com"]')
        .forEach((el) => el.remove());
    }

    // Don't wipe dataLayer completely; just push a signal
    const dl = ensureDataLayer();
    dl && dl.push({ event: "mm_gtm_removed", mm_gtm_removed_at: Date.now() });
  } catch {}
}

/** Try to delete common GA/GTM cookies (first-party only) */
export function deleteAnalyticsCookies() {
  try {
    if (typeof document === "undefined") return;

    const names = [
      "_ga",
      "_gid",
      "_gat",
      "_gcl_au",
      "_ga_",
      "_gcl_aw",
      "_gcl_dc",
    ];
    const host =
      typeof window !== "undefined" &&
      window.location &&
      typeof window.location.hostname === "string"
        ? window.location.hostname.replace(/^www\./, "")
        : "";

    // Helper: expire cookie
    const expire = (name, domain) => {
      const base = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
      document.cookie = domain ? `${base}; domain=${domain}` : base;
    };

    // Expire common names + prefixes
    const existing = document.cookie.split(";").map((c) => c.trim());
    const cookieNames = existing.map((c) => c.split("=")[0]);

    cookieNames.forEach((cn) => {
      const shouldExpire =
        names.includes(cn) ||
        names.some((p) => p.endsWith("_") && cn.startsWith(p));
      if (!shouldExpire) return;

      // current host
      expire(cn);
      if (host) {
        expire(cn, host);
        expire(cn, `.${host}`);
      }
    });
  } catch {}
}
