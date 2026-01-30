// src/features/cart/cartApi.js
import { api } from "../../services/apiSlice";
import { setCartItems } from "./cartSlice";
import { getCartToken } from "../../lib/cartToken";

function normalizeServerItems(serverItems) {
  // Expecting server item like:
  // { product: 12, qty: 2, name, image, price, color, weight, dimensions, category, stock }
  // If backend returns less, we still return safe defaults.
  return serverItems
    .map((x) => {
      const productId = Number(x.product ?? x.product_id ?? x.id);
      if (!Number.isFinite(productId)) return null;

      return {
        id: productId, // UI uses id
        productId: productId, // backend FK
        name: x.name || "",
        image: x.image || "",
        price: Number(x.price) || 0,
        priceRange: x.priceRange ?? undefined,
        qty: Math.max(1, Number(x.qty) || 1),
        color: x.color || "",
        weight: x.weight || "",
        dimensions: x.dimensions || "",
        category: x.category || "",
        stock: x.stock ?? undefined,

        // ✅ important for discount logic (if backend sends them)
        product_discount_percent:
          x.product_discount_percent != null
            ? Number(x.product_discount_percent)
            : x.discount_percent != null
              ? Number(x.discount_percent)
              : undefined,

        price_gross: x.price_gross != null ? Number(x.price_gross) : undefined,
      };
    })
    .filter(Boolean);
}

export const cartApi = api.injectEndpoints({
  endpoints: (build) => ({
    getCart: build.query({
      // ✅ Backend rejects GET → use POST to retrieve cart
      query: ({ cart_token } = {}) => {
        const token = cart_token || getCartToken();
        return {
          url: "/cart/",
          method: "POST",
          // send only cart_token → should “read” cart without modifying
          body: token ? { cart_token: token } : {},
        };
      },
      providesTags: ["Cart"],

      // ✅ IMPORTANT: Only overwrite local cart if server has items
      async onQueryStarted(arg, { dispatch, queryFulfilled, getState }) {
        try {
          const { data } = await queryFulfilled;

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
              // ✅ merge: keep local extra fields (price_gross / product_discount_percent)
              const local = getState()?.cart?.items || [];
              const localById = new Map(
                local.map((x) => [Number(x.productId ?? x.id), x]),
              );

              const merged = normalized.map((s) => {
                const key = Number(s.productId ?? s.id);
                const l = localById.get(key);
                if (!l) return s;

                return {
                  ...s,
                  // keep any locally-known fields if server doesn't provide them
                  price_gross: s.price_gross ?? l.price_gross,
                  product_discount_percent:
                    s.product_discount_percent ?? l.product_discount_percent,
                };
              });

              dispatch(setCartItems(merged));
            }
          } else {
            // keep local cart
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
