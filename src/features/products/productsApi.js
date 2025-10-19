// src/features/products/productsApi.js
import { api } from "../../services/apiSlice";

export const productsApi = api.injectEndpoints({
  endpoints: (b) => ({
    listProducts: b.query({
      query: (params) => ({ url: "decorative-products/", params }),
      providesTags: ["Products"],
    }),
    getTopProducts: b.query({
      // First try a dedicated top endpoint; if your backend doesn’t have it,
      // your API gateway will still honor the second call (fallback).
      async queryFn(arg, _q, _e, fetchWithBQ) {
        const featured = await fetchWithBQ({
          url: "decorative-products/",
          params: { page_size: 8, featured: true },
        });
        if (!featured.error && featured.data) {
          const list = Array.isArray(featured.data)
            ? featured.data
            : featured.data.results ?? [];
          if (list.length) return { data: list };
        }
        // fallback to ordering by sold desc
        const best = await fetchWithBQ({
          url: "decorative-products/",
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

    getProduct: b.query({
      query: (id) => `decorative-products/${id}/`,
      providesTags: (_r, _e, id) => [{ type: "Product", id }],
    }),

    listProductReviews: b.query({
      query: (id) => `decorative-products/${id}/reviews/`,
      providesTags: (_r, _e, id) => [{ type: "Reviews", id }],
    }),

    createProductReview: b.mutation({
      query: ({ id, form }) => ({
        url: `decorative-products/${id}/reviews/`,
        method: "POST",
        body: form,
      }),
      invalidatesTags: (_r, _e, arg) => [{ type: "Reviews", id: arg.id }],
    }),

    // updateReview: b.mutation({
    //   query: ({ reviewId, form }) => ({
    //     url: `reviews/${reviewId}/`,
    //     method: "PATCH",
    //     body: form,
    //   }),
    //   invalidatesTags: ["Reviews"],
    // }),

    // deleteReview: b.mutation({
    //   query: (reviewId) => ({ url: `reviews/${reviewId}/`, method: "DELETE" }),
    //   invalidatesTags: ["Reviews"],
    // }),
  }),
});

export const {
  useListProductsQuery,
  useGetProductQuery,
  useListProductReviewsQuery,
  useCreateProductReviewMutation,
  // useUpdateReviewMutation,
  // useDeleteReviewMutation,
  useLazyGetProductQuery,
  useGetTopProductsQuery,
} = productsApi;
