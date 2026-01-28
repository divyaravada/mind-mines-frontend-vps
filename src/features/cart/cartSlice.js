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
      const productId = Number(payload.productId ?? payload.id); // ✅ ensure productId always exists

      const itemTitle = payload.title || payload.name || "";
      const p = Number(payload.price) || 0;

      // ✅ use productId to find existing item
      const found = state.items.find((i) => Number(i.productId) === productId);

      if (found) {
        found.qty = Math.max(1, Number(found.qty || 1) + 1);
        found.name = itemTitle;
        found.title = itemTitle;
        found.price = p;
        if (payload.image) found.image = payload.image;
        Object.assign(found, payload);
      } else {
        state.items.push({
          // ✅ keep old id if you want, but store productId always
          id: productId, // (keep to avoid breaking UI)
          productId: productId, // ✅ important for backend/admin
          name: itemTitle,
          title: itemTitle,
          price: p,
          image: payload.image || "",
          qty: 1,
          ...payload,
        });
      }
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

export const { addItem, removeItem, setQty, clearCart } = cartSlice.actions;

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
