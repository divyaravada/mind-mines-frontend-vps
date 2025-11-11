// src/components/StripeProvider.jsx
import React, { useMemo } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { stripePromise } from "../lib/stripe";

function stripeAppearance() {
  // Detect Tailwind dark mode (class strategy)
  const isDark =
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark");

  // Stripe Appearance that mirrors your palette
  return {
    theme: "stripe",
    variables: {
      colorPrimary: "#ec8b0b", // backnewswhite (orange)
      colorText: isDark ? "#e5e7eb" : "#1f2937",
      colorBackground: isDark ? "#17160f" : "#f8fcfe", // marbleblack / marblewhite
      colorDanger: "#dc2626",
      borderRadius: "8px",
    },
    rules: {
      ".Input, .Tab, .Block": {
        borderColor: isDark ? "#2b2b25" : "#e5e7eb",
      },
      ".Input:focus, .Tab--selected": {
        boxShadow: "0 0 0 1.5px #ec8b0b",
        borderColor: "#ec8b0b",
      },
      ".Label": {
        color: isDark ? "#e5e7eb" : "#374151",
      },
    },
  };
}

export default function StripeProvider({ children }) {
  const appearance = useMemo(() => stripeAppearance(), []);
  return (
    <Elements stripe={stripePromise} options={{ appearance }}>
      {children}
    </Elements>
  );
}
