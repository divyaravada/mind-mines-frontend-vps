// src/components/ScrollToTop.jsx
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    // If you actually use in-page anchors (e.g., /page#features), keep default anchor scroll
    if (hash) return;

    // wait for the new route to render, then scroll
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" }); // or "smooth"
    });
  }, [pathname, search, hash]);

  return null;
}
