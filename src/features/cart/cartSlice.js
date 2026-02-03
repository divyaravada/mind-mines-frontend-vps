// src/features/cart/cartSlice.js
import { createSlice } from "@reduxjs/toolkit";

const LS_KEY = "cart_v1";

const load = () => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

// ✅ throttle + idle save
let saveTimer = null;
const save = (items) => {
  const write = () => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(items));
    } catch {}
  };

  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    if (typeof requestIdleCallback !== "undefined") {
      requestIdleCallback(write, { timeout: 1000 });
    } else {
      write();
    }
  }, 200);
};

const initialState = { items: load() };

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addItem: (state, action) => {
      const payload = action.payload || {};
      const productId = Number(payload.productId ?? payload.id);

      const { title, name, price, image, ...rest } = payload;
      const itemTitle = title || name || "";

      const toNum = (v) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
      };

      // ✅ qty from payload (ProductDetailPage sends qty)
      const incomingQty = Math.max(1, toNum(payload.qty) || 1);

      // ✅ sanitize optional pricing fields
      const price_gross = toNum(rest.price_gross ?? rest.priceGross ?? 0);
      const final_price_gross = toNum(
        rest.final_price_gross ?? rest.finalPriceGross ?? 0,
      );
      const product_discount_percent = toNum(
        rest.product_discount_percent ?? 0,
      );

      // ✅ Robust unit price:
      // 1) payload.price (legacy)
      // 2) final_price_gross
      // 3) price_gross
      const unitPrice = toNum(price) || final_price_gross || price_gross || 0;

      const found = state.items.find(
        (i) => Number(i.productId ?? i.id) === productId,
      );

      if (found) {
        // ✅ increase by incomingQty (not always +1)
        found.qty = Math.max(1, toNum(found.qty || 1) + incomingQty);

        found.name = itemTitle;
        found.title = itemTitle;
        found.productId = productId;
        if (image) found.image = image;

        // ✅ do NOT overwrite price with 0
        if (unitPrice > 0) found.price = unitPrice;

        Object.assign(found, rest);

        // ✅ ensure numeric
        if (price_gross > 0) found.price_gross = price_gross;
        if (final_price_gross > 0) found.final_price_gross = final_price_gross;
        found.product_discount_percent = product_discount_percent;
      } else {
        state.items.push({
          id: productId,
          productId,
          name: itemTitle,
          title: itemTitle,
          price: unitPrice, // ✅ never 0 if gross fields exist
          image: image || "",
          qty: incomingQty, // ✅ use incoming qty

          ...rest,

          // ✅ ensure numeric
          price_gross,
          final_price_gross,
          product_discount_percent,
        });
      }

      save(state.items);
    },

    // ✅ ADD THIS (new)
    setCartItems: (state, action) => {
      const items = Array.isArray(action.payload) ? action.payload : [];
      state.items = items;
      save(state.items);
    },

    removeItem: (state, action) => {
      state.items = state.items.filter((i) => i.id !== action.payload);
      save(state.items);
    },
    setQty: (state, action) => {
      const { id, qty } = action.payload || {};
      const it = state.items.find((i) => i.id === id);
      if (it) {
        it.qty = Math.max(1, Number(qty) || 1);
        save(state.items);
      }
    },
    clearCart: (state) => {
      state.items = [];
      save(state.items);
    },
  },
});

// ✅ export it here
export const { addItem, removeItem, setQty, clearCart, setCartItems } =
  cartSlice.actions;

export const updateQty = cartSlice.actions.setQty;

export const selectCartItems = (s) => s.cart?.items || [];
export const selectCartCount = (s) =>
  (s.cart?.items || []).reduce((n, i) => n + (Number(i.qty) || 0), 0);
export const selectCartSubtotal = (s) =>
  (s.cart?.items || []).reduce(
    (sum, i) => sum + (Number(i.price) || 0) * (Number(i.qty) || 0),
    0,
  );

export default cartSlice.reducer;
