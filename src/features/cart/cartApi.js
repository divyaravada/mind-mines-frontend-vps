// RTK Query endpoints for cart sync (guest + logged-in)
import { api } from "../../services/apiSlice";

export const cartApi = api.injectEndpoints({
  endpoints: (build) => ({
    getCart: build.query({
      query: ({ cart_token } = {}) => ({
        url: "/cart/",
        params: cart_token ? { cart_token } : undefined,
      }),
      providesTags: ["Cart"],
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
