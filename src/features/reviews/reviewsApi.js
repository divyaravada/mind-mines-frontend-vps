import { api } from "../../services/apiSlice";

export const reviewsApi = api.injectEndpoints({
  endpoints: (build) => ({
    getMyReviews: build.query({
      query: () => "my/reviews/",
      transformResponse: (res) =>
        Array.isArray(res) ? res : res?.results ?? [],
      providesTags: (list) =>
        Array.isArray(list)
          ? [
              ...list.map((r) => ({ type: "Reviews", id: r.id })),
              { type: "Reviews", id: "LIST" },
            ]
          : [{ type: "Reviews", id: "LIST" }],
    }),
    updateReview: build.mutation({
      query: ({ id, formData }) => ({
        url: `reviews/${id}/`,
        method: "PATCH",
        body: formData,
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: "Reviews", id: arg.id },
        { type: "Reviews", id: "LIST" },
      ],
    }),
    deleteReview: build.mutation({
      query: (id) => ({ url: `reviews/${id}/`, method: "DELETE" }),
      invalidatesTags: (_r, _e, id) => [
        { type: "Reviews", id },
        { type: "Reviews", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetMyReviewsQuery,
  useUpdateReviewMutation,
  useDeleteReviewMutation,
} = reviewsApi;
