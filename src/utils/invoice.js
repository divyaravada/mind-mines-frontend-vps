// src/utils/invoice.js
import { API_BASE } from "../services/apiSlice";

export function downloadPublicInvoice({ orderId, number, token }) {
  const url = `${API_BASE}orders/invoice/public?order_id=${encodeURIComponent(
    orderId
  )}&number=${encodeURIComponent(number)}&token=${encodeURIComponent(token)}`;
  const a = document.createElement("a");
  a.href = url;
  a.download = ""; // let server filename win
  document.body.appendChild(a);
  a.click();
  a.remove();
}
