import { api } from "../../services/apiSlice";
import { setCartItems } from "./cartSlice";
import { getCartToken } from "../../lib/cartToken";

export const cartApi = api.injectEndpoints({
  endpoints: (build) => ({
    getCart: build.query({
      query: ({ cart_token } = {}) => ({
        url: "/cart/",
        params:
          cart_token || getCartToken()
            ? { cart_token: cart_token || getCartToken() }
            : undefined,
      }),
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
            dispatch(setCartItems(serverItems));
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
