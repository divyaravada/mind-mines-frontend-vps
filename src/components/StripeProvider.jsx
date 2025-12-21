// src/components/StripeProvider.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { stripePromise } from "../lib/stripe";

function computeStripeAppearance(isDark) {
  return {
    theme: "stripe",
    variables: {
      colorPrimary: "#d78822",
      colorText: isDark ? "#e5e7eb" : "#1f2937",
      colorBackground: isDark ? "#17160f" : "#f8fcfe",
      colorDanger: "#dc2626",
      borderRadius: "8px",
    },
    rules: {
      ".Input, .Tab, .Block": {
        borderColor: isDark ? "#2b2b25" : "#e5e7eb",
      },
      ".Input:focus, .Tab--selected": {
        boxShadow: "0 0 0 1.5px #d78822",
        borderColor: "#d78822",
      },
      ".Label": {
        color: isDark ? "#e5e7eb" : "#374151",
      },
    },
  };
}

export default function StripeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    if (typeof document === "undefined") return false;
    return document.documentElement.classList.contains("dark");
  });

  // ✅ reacts to Tailwind dark mode class changes (no refresh needed)
  useEffect(() => {
    if (typeof document === "undefined") return;

    const el = document.documentElement;
    const obs = new MutationObserver(() => {
      setIsDark(el.classList.contains("dark"));
    });
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });

    return () => obs.disconnect();
  }, []);

  const appearance = useMemo(() => computeStripeAppearance(isDark), [isDark]);

  return (
    <Elements stripe={stripePromise} options={{ appearance }}>
      {children}
    </Elements>
  );
}
