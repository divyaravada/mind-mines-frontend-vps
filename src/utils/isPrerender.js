//src/utils/isPrerender.js
export const isPrerender =
  process.env.REACT_APP_PRERENDER === "true" || typeof window === "undefined";
