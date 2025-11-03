const GTM_SCRIPT_ID = "mm-gtm-script";

function setDataLayerBoot() {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ mm_consent_boot: Date.now() });
}

/** Load GTM without inline JS (better for CSP) */
export function injectGTM(gtmId) {
  try {
    if (!gtmId || typeof document === "undefined") return;

    // already present?
    if (document.getElementById(GTM_SCRIPT_ID)) return;

    setDataLayerBoot();

    const s = document.createElement("script");
    s.id = GTM_SCRIPT_ID;
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(
      gtmId
    )}`;
    s.referrerPolicy = "origin";

    const firstScript = document.getElementsByTagName("script")[0];
    firstScript.parentNode.insertBefore(s, firstScript);
  } catch {
    /* no-op */
  }
}

/** Best-effort removal (cookies may require a reload to fully stop tracking) */
export function removeGTM() {
  try {
    const s =
      typeof document !== "undefined" && document.getElementById(GTM_SCRIPT_ID);
    if (s && s.parentNode) s.parentNode.removeChild(s);
    if (typeof window !== "undefined") {
      window.dataLayer = [];
    }
  } catch {}
}

/** Try to delete common GA/GTM cookies (first-party only) */
export function deleteAnalyticsCookies() {
  try {
    const names = ["_ga", "_gid", "_gat", "_gcl_au"];
    const host =
      typeof window !== "undefined" &&
      window.location &&
      typeof window.location.hostname === "string"
        ? window.location.hostname.replace(/^www\./, "")
        : "";

    names.forEach((name) => {
      // current path
      document.cookie = `${name}=; Max-Age=0; path=/`;

      // domain variants only if we have a hostname
      if (host) {
        document.cookie = `${name}=; Max-Age=0; path=/; domain=.${host}`;
        document.cookie = `${name}=; Max-Age=0; path=/; domain=${host}`;
      }
    });
  } catch {}
}
