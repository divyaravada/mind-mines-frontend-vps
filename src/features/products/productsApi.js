// src/features/products/productsApi.js
import { api } from "../../services/apiSlice";

export const productsApi = api.injectEndpoints({
  endpoints: (b) => ({
    // List products with filters: category, material, price ranges...
    // Backend view ProductListView / ProductListCreate handles these params.
    listProducts: b.query({
      query: (params) => ({ url: "products/list/", params }),
      providesTags: ["Products"],
    }),

    // Optional "featured/bestsellers" helper.
    // Safe fallback if backend ignores featured/sold.
    getTopProducts: b.query({
      async queryFn(arg, _queryApi, _extraOptions, fetchWithBQ) {
        // Try featured first
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
        // fallback: try ordering
        const best = await fetchWithBQ({
          url: "products/list/",
          params: { page_size: 8, ordering: "-sold" },
        });
        if (!best.error && best.data) {
          const list = Array.isArray(best.data)
            ? best.data
            : best.data.results ?? [];
          return { data: list };
        }
        return {
          error: featured.error ||
            best.error || { status: 500, data: "No data" },
        };
      },
      providesTags: ["Products"],
    }),

    // Single product page
    getProduct: b.query({
      query: (id) => `products/${id}/`,
      providesTags: (_r, _e, id) => [{ type: "Products", id }],
    }),

    // Reviews list for product
    listProductReviews: b.query({
      query: (id) => `products/${id}/reviews/`,
      providesTags: (_r, _e, id) => [{ type: "Reviews", id }],
    }),

    // Create new review (multipart form allowed: image, avatar, etc.)
    createProductReview: b.mutation({
      query: ({ id, form }) => ({
        url: `products/${id}/reviews/`,
        method: "POST",
        body: form,
      }),
      invalidatesTags: (_r, _e, arg) => [{ type: "Reviews", id: arg.id }],
    }),

    // Autocomplete suggestions for search bar
    // Backend expects ?search=... (NOT ?q=...)
    suggestProducts: b.query({
      query: (searchTerm) => ({
        url: "products/suggest/",
        params: { search: searchTerm },
      }),
    }),

    // "Notify me when back in stock"
    subscribeStockAlert: b.mutation({
      query: ({ product, email }) => ({
        url: "stock-alerts/",
        method: "POST",
        body: { product, email },
      }),
    }),

    // "Order on demand" for custom / out-of-stock sculptures etc.
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
