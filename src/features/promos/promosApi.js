// src/features/promos/promosApi.js
import { api } from "../../services/apiSlice";

export const promosApi = api.injectEndpoints({
  endpoints: (build) => ({
    previewCoupon: build.mutation({
      query: ({ code, cart }) => ({
        url: "coupons/preview/",
        method: "POST",
        body: { code, cart }, // adapt to your backend’s expected payload
      }),
    }),
    getActivePromotion: build.query({
      query: () => "promotions/active/",
      transformResponse: (res) => res || {},
    }),
  }),
});

export const { usePreviewCouponMutation, useGetActivePromotionQuery } =
  promosApi;
