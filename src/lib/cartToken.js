// src/lib/cartToken.js
// Keep a stable token for guest carts
export function getCartToken() {
  const key = "cart_token";
  let token = localStorage.getItem(key);
  if (!token) {
    token =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `guest_${Math.random().toString(36).slice(2)}_${Date.now()}`;
    localStorage.setItem(key, token);
  }
  return token;
}
