// src/utils/invoice.js
import { API_BASE } from "../services/apiSlice";

export function downloadPublicInvoice({ orderId, number, token }) {
  const url =
    `${API_BASE}orders/invoice/public` +
    `?order_id=${encodeURIComponent(orderId)}` +
    `&number=${encodeURIComponent(number)}` +
    `&token=${encodeURIComponent(token)}`;

  const a = document.createElement("a");
  a.href = url;
  a.download = ""; // let server filename win
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function getCheckoutIdem() {
  const KEY = "checkout_idem";
  let v = sessionStorage.getItem(KEY);
  if (!v) {
    v = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(KEY, v);
  }
  return v;
}
