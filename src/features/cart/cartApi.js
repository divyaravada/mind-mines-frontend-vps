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
      const priceGross =
        Number(
          x.final_price_gross ??
            x.finalPriceGross ??
            x.price_gross ??
            x.priceGross ??
            x.price ??
            0,
        ) || 0;
      return {
        id: productId,
        productId,
        name: x.name || "",
        image: x.image || "",
        price: priceGross,
        priceRange: x.priceRange ?? undefined,
        qty: Math.max(1, Number(x.qty) || 1),
        color: x.color || "",
        weight: x.weight || "",
        dimensions: x.dimensions || "",
        category: x.category || "",
        stock: x.stock ?? undefined,

        // ✅ keep pricing fields from backend (strings -> ok, we Number() later)
        price_gross: x.price_gross ?? x.priceGross ?? x.price ?? 0,
        final_price_gross:
          x.final_price_gross ?? x.finalPriceGross ?? x.final_price ?? 0,
        discount_percent:
          x.discount_percent ??
          x.discountPercent ??
          x.product_discount_percent ??
          0,
        is_discounted: Boolean(
          x.is_discounted ?? x.isDiscounted ?? x.is_discounted_flag,
        ),
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
