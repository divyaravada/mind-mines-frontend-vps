// src/features/marketing/marketingApi.js
import { api } from "../../services/apiSlice";

const ALLOWED_EVENT_TYPES = new Set([
  "add_to_cart",
  "cart_view",
  "checkout_start",
  "coupon_applied",
  "newsletter_subscribe",
  "order_completed",
  "page_view",
  "product_view",
  "wishlist_add",
]);

// map custom names -> backend-allowed names
const EVENT_TYPE_MAP = {
  // list / category pages
  product_list_view: "page_view",

  // product detail page
  product_detail_view: "product_view",

  // removing from wishlist (we can log as wishlist_add with extra.action)
  wishlist_remove: "wishlist_add",

  // “extra” events – log them as generic page_view
  review_create: "page_view",
  on_demand_open: "page_view",
  on_demand_request: "page_view",
};

export const marketingApi = api.injectEndpoints({
  endpoints: (build) => ({
    trackEvent: build.mutation({
      query: (rawPayload = {}) => {
        const {
          event_type: rawType,
          session_id,
          url_path,
          extra = {},
          ...rest
        } = rawPayload;

        let event_type = rawType || "page_view";

        // 1. map custom -> canonical name
        if (EVENT_TYPE_MAP[event_type]) {
          event_type = EVENT_TYPE_MAP[event_type];
        }

        // 2. if still not allowed, fall back to generic page_view
        if (!ALLOWED_EVENT_TYPES.has(event_type)) {
          event_type = "page_view";
        }

        // You can also enrich extra with the original type if you like:
        const finalExtra = {
          ...extra,
          _original_event_type: rawType,
          ...(rawType === "wishlist_remove" && { action: "remove" }),
        };

        return {
          url: "marketing/track/",
          method: "POST",
          body: {
            event_type,
            session_id,
            url_path,
            extra: finalExtra,
            ...rest, // in case you pass other fields
          },
        };
      },
    }),
  }),
});

export const { useTrackEventMutation } = marketingApi;
