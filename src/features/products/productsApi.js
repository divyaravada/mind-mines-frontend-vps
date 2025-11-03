import { api } from "../../services/apiSlice";

export const productsApi = api.injectEndpoints({
  endpoints: (b) => ({
    listProducts: b.query({
      query: (params) => ({ url: "products/list/", params }),
      providesTags: ["Products"],
    }),

    getTopProducts: b.query({
      async queryFn(arg, _q, _e, fetchWithBQ) {
        // Try a featured flag first (backend may ignore it gracefully)
        const featured = await fetchWithBQ({
          url: "products/list/",
          params: { page_size: 8, featured: true },
        });
        if (!featured.error && featured.data) {
          const list = Array.isArray(featured.data)
            ? featured.data
            : featured.data.results ?? [];
          if (list.length) return { data: list };
        }
        // Fallback to newest (your backend supports ordering by created_at)
        const newest = await fetchWithBQ({
          url: "products/list/",
          params: { page_size: 8, ordering: "-created_at" },
        });
        if (!newest.error && newest.data) {
          const list = Array.isArray(newest.data)
            ? newest.data
            : newest.data.results ?? [];
          return { data: list };
        }
        return {
          error: featured.error ||
            newest.error || { status: 500, data: "No data" },
        };
      },
      providesTags: ["Products"],
    }),

    getProduct: b.query({
      query: (id) => `products/${id}/`,
      providesTags: (_r, _e, id) => [{ type: "Products", id }],
    }),

    listProductReviews: b.query({
      query: (id) => `products/${id}/reviews/`,
      providesTags: (_r, _e, id) => [{ type: "Reviews", id }],
    }),

    createProductReview: b.mutation({
      query: ({ id, form }) => ({
        url: `products/${id}/reviews/`,
        method: "POST",
        body: form,
      }),
      invalidatesTags: (_r, _e, arg) => [{ type: "Reviews", id: arg.id }],
    }),

    suggestProducts: b.query({
      query: (searchTerm) => ({
        url: "products/suggest/",
        params: { search: searchTerm },
      }),
    }),

    subscribeStockAlert: b.mutation({
      query: ({ product, email }) => ({
        url: "stock-alerts/",
        method: "POST",
        body: { product, email },
      }),
    }),

    createOnDemandRequest: b.mutation({
      query: (payload) => ({
        url: "on-demand/",
        method: "POST",
        body: payload,
      }),
    }),
  }),
});

export const {
  useListProductsQuery,
  useGetProductQuery,
  useListProductReviewsQuery,
  useCreateProductReviewMutation,
  useSuggestProductsQuery,
  useLazyGetProductQuery,
  useGetTopProductsQuery,
  useSubscribeStockAlertMutation,
  useCreateOnDemandRequestMutation,
} = productsApi;
