import { api } from "../../services/apiSlice";

export const wishlistApi = api.injectEndpoints({
  endpoints: (build) => ({
    getWishlist: build.query({
      query: () => "wishlist/",
      transformResponse: (res) =>
        Array.isArray(res) ? res : res?.results ?? [],
      providesTags: (list) => [
        ...(list || []).map((w) => ({ type: "Wishlist", id: w.product })),
        { type: "Wishlist", id: "LIST" },
      ],
    }),

    addToWishlist: build.mutation({
      query: (productId) => ({
        url: "wishlist/",
        method: "POST",
        body: { product: productId },
      }),
      invalidatesTags: (_r, _e, id) => [
        { type: "Wishlist", id },
        { type: "Wishlist", id: "LIST" },
      ],
    }),

    removeFromWishlist: build.mutation({
      query: (productId) => ({
        url: `wishlist/${productId}/`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, id) => [
        { type: "Wishlist", id },
        { type: "Wishlist", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetWishlistQuery,
  useAddToWishlistMutation,
  useRemoveFromWishlistMutation,
} = wishlistApi;
