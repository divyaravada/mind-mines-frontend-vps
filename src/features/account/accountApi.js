import { api } from "../../services/apiSlice";

function normalizeAccount(res) {
  if (!res || typeof res !== "object") return res;
  const image =
    res.image ||
    res.avatar ||
    res.avatar_url ||
    res.profile?.image ||
    res.profile?.avatar ||
    null;
  const full_name =
    res.full_name ||
    res.profile?.full_name ||
    [res.first_name, res.last_name].filter(Boolean).join(" ") ||
    "";
  const username =
    res.username ?? res.profile?.username ?? res.user?.username ?? "";

  return {
    ...res,
    image,
    full_name,
    username,
    email: res.email || res.user?.email || "",
    verified: Boolean(res.verified ?? res.is_verified ?? res.user?.is_verified),
  };
}

export const accountApi = api.injectEndpoints({
  endpoints: (build) => ({
    getAccount: build.query({
      query: () => "users/account/",
      providesTags: ["Account"],
      transformResponse: normalizeAccount,
    }),
    updateAccount: build.mutation({
      query: (formData) => ({
        url: "users/account/",
        method: "PUT",
        body: formData,
      }),
      invalidatesTags: ["Account"],
    }),
    requestDeletion: build.mutation({
      query: ({ reason }) => ({
        url: "users/account/delete-request/",
        method: "POST",
        body: { reason },
      }),
    }),
  }),
});

export const {
  useGetAccountQuery,
  useUpdateAccountMutation,
  useRequestDeletionMutation,
} = accountApi;
