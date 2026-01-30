// src/features/cart/cartApi.js
import { api } from "../../services/apiSlice";
import { setCartItems } from "./cartSlice";
import { getCartToken } from "../../lib/cartToken";

function normalizeServerItems(serverItems) {
  return serverItems
    .map((x) => {
      const productId = Number(x.product ?? x.product_id ?? x.id);
      if (!Number.isFinite(productId)) return null;

      const unit = Number(x.price) || 0;
      const gross = Number(x.price_gross ?? x.gross_price ?? unit) || 0;

      return {
        id: productId,
        productId: productId,

        name: x.name || "",
        image: x.image || "",

        // ✅ keep price + gross price
        price: unit,
        price_gross: gross,

        // ✅ keep product discount percent (your backend uses snake_case)
        product_discount_percent: String(
          Number(x.product_discount_percent ?? x.discount_percent ?? 0),
        ),

        priceRange: x.priceRange ?? undefined,
        qty: Math.max(1, Number(x.qty) || 1),

        color: x.color || "",
        weight: x.weight || "",
        dimensions: x.dimensions || "",
        category: x.category || "",
        stock: x.stock ?? undefined,
      };
    })
    .filter(Boolean);
}

export const cartApi = api.injectEndpoints({
  endpoints: (build) => ({
    getCart: build.query({
      query: ({ cart_token } = {}) => {
        const token = cart_token || getCartToken();
        return {
          url: "/cart/",
          params: token ? { cart_token: token } : undefined,
        };
      },
      providesTags: ["Cart"],

      // ✅ IMPORTANT: Only overwrite local cart if server has items
      async onQueryStarted(arg, { dispatch, queryFulfilled, getState }) {
        try {
          const { data } = await queryFulfilled;

          // backend might return {items:[...]} or list directly
          const serverItems = Array.isArray(data)
            ? data
            : Array.isArray(data?.items)
              ? data.items
              : Array.isArray(data?.results)
                ? data.results
                : [];

          if (serverItems.length > 0) {
            const normalized = normalizeServerItems(serverItems);
            if (normalized.length > 0) {
              dispatch(setCartItems(normalized));
            }
          } else {
            // ✅ do nothing: keep localStorage cart
          }
        } catch {
          // ignore network errors
        }
      },
    }),

    saveCart: build.mutation({
      query: (body) => ({
        url: "/cart/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Cart"],
    }),
  }),
});

export const { useGetCartQuery, useSaveCartMutation } = cartApi;
