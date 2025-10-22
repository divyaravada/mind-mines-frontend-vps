// src/features/stones/stonesApi.js
import { api } from "../../services/apiSlice";

export const stonesApi = api.injectEndpoints({
  endpoints: (build) => ({
    getNaturalStones: build.query({
      query: () => ({ url: "stones/" }),
      transformResponse: (data) =>
        Array.isArray(data)
          ? data
          : Array.isArray(data?.results)
          ? data.results
          : [],
      providesTags: (result = []) => [
        ...result.map((s) => ({ type: "Stones", id: s.id })),
        { type: "Stones", id: "LIST" },
      ],
    }),
    sendStoneEnquiry: build.mutation({
      query: (body) => ({
        url: "stones/enquiry/",
        method: "POST",
        body,
      }),
    }),
  }),
});

export const { useGetNaturalStonesQuery, useSendStoneEnquiryMutation } =
  stonesApi;
