export function getCheckoutIdem() {
  const KEY = "checkout_idem";
  let v = sessionStorage.getItem(KEY);
  if (!v) {
    v = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(KEY, v);
  }
  return v;
}
