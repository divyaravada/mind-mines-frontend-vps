// src/lib/session.js
const SESSION_KEY = "mm_session_id";

const randomId = () =>
  Math.random().toString(36).slice(2) +
  "-" +
  Math.random().toString(36).slice(2);

export const getSessionId = () => {
  if (typeof window === "undefined") return null;
  try {
    const existing = window.localStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const fresh = randomId();
    window.localStorage.setItem(SESSION_KEY, fresh);
    return fresh;
  } catch {
    return null;
  }
};

export const getBaseTrackingFields = () => {
  const session_id = getSessionId();

  let url_path;
  let referrer;
  let utm_source;
  let utm_medium;
  let utm_campaign;
  let utm_term;
  let utm_content;

  if (typeof window !== "undefined") {
    url_path = window.location.pathname + window.location.search;

    try {
      const params = new URLSearchParams(window.location.search || "");
      utm_source = params.get("utm_source") || undefined;
      utm_medium = params.get("utm_medium") || undefined;
      utm_campaign = params.get("utm_campaign") || undefined;
      utm_term = params.get("utm_term") || undefined;
      utm_content = params.get("utm_content") || undefined;
    } catch {
      // ignore
    }
  }

  if (typeof document !== "undefined") {
    referrer = document.referrer || undefined;
  }

  return {
    session_id,
    url_path,
    referrer,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_term,
    utm_content,
  };
};
