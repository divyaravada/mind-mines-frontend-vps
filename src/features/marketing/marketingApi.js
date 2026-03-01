import { isPrerender } from "../../utils/isPrerender";
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

const EVENT_TYPE_MAP = {
  product_list_view: "page_view",
  product_detail_view: "product_view",
  wishlist_remove: "wishlist_add",
  review_create: "page_view",
  on_demand_open: "page_view",
  on_demand_request: "page_view",
};

export const marketingApi = api.injectEndpoints({
  endpoints: (build) => ({
    trackEvent: build.mutation({
      query: (rawPayload = {}) => {
        // ✅ STOP ALL NETWORK DURING PRERENDER
        if (isPrerender) {
          return {
            url: "noop/",
            method: "GET",
          };
        }

        const {
          event_type: rawType,
          session_id,
          url_path,
          extra = {},
          ...rest
        } = rawPayload;

        let event_type = rawType || "page_view";

        if (EVENT_TYPE_MAP[event_type]) {
          event_type = EVENT_TYPE_MAP[event_type];
        }

        if (!ALLOWED_EVENT_TYPES.has(event_type)) {
          event_type = "page_view";
        }

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
            ...rest,
          },
        };
      },
    }),
  }),
});

export const { useTrackEventMutation } = marketingApi;
