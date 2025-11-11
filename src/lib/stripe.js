// Single source of truth for the Stripe publishable key
import { loadStripe } from "@stripe/stripe-js";

const envPk =
  (typeof import.meta !== "undefined" &&
    import.meta.env?.VITE_STRIPE_PUBLISHABLE_KEY) ||
  process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY ||
  "";

export const stripePromise = loadStripe(envPk);
