// src/components/StripeProvider.jsx
import React from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";

const envPk =
  (typeof import.meta != "undefined" &&
    import.meta.env?.VITE_STRIPE_PUBLISHABLE_KEY) ||
  process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;

const stripePromise = loadStripe(envPk || "");

export default function StripeProvider({ children }) {
  return (
    <Elements
      stripe={stripePromise}
      options={{ appearance: { theme: "stripe" } }}
    >
      {children}
    </Elements>
  );
}
