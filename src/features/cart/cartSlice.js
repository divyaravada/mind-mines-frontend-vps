// src/features/cart/cartSlice.js
import { createSlice } from "@reduxjs/toolkit";

const LS_KEY = "cart_v1";

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
function save(items) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(items));
  } catch {}
}

const initialState = { items: load() };

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addItem: (state, action) => {
      const { id, title, name, price, image, ...rest } = action.payload || {};
      const itemTitle = title || name || "";
      const p = Number(price) || 0;
      const found = state.items.find((i) => i.id === id);
      if (found) {
        found.qty = Math.max(1, Number(found.qty || 1) + 1);
        // keep latest title/image/price in sync
        found.name = itemTitle;
        found.title = itemTitle;
        found.price = p;
        if (image) found.image = image;
        Object.assign(found, rest);
      } else {
        state.items.push({
          id,
          name: itemTitle,
          title: itemTitle,
          price: p,
          image: image || "",
          qty: 1,
          ...rest,
        });
      }
      save(state.items);
    },
    removeItem: (state, action) => {
      const id = action.payload;
      state.items = state.items.filter((i) => i.id !== id);
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

export const selectCartItems = (state) => state.cart?.items || [];
export const selectCartCount = (state) =>
  (state.cart?.items || []).reduce((n, i) => n + (Number(i.qty) || 0), 0);
export const selectCartSubtotal = (state) =>
  (state.cart?.items || []).reduce(
    (sum, i) => sum + (Number(i.price) || 0) * (Number(i.qty) || 0),
    0
  );

export default cartSlice.reducer;
