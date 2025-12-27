import { api } from "../../services/apiSlice";
import { setCredentials, logout } from "./authSlice";

export const authApi = api.injectEndpoints({
  endpoints: (build) => ({
    // ✅ NEW: Step 1 (email+password -> OTP email)
    loginStart: build.mutation({
      query: ({ email, password }) => ({
        url: "auth/login/start/",
        method: "POST",
        body: { email, password },
      }),
      invalidatesTags: ["Auth", "Account"],
    }),

    // ✅ NEW: Step 2 (OTP -> returns {access, refresh})
    loginVerify: build.mutation({
      query: ({ otp_id, code }) => ({
        url: "auth/login/verify/",
        method: "POST",
        body: { otp_id, code },
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled; // { access, refresh, user }
          if (data?.access && data?.refresh) {
            dispatch(
              setCredentials({ access: data.access, refresh: data.refresh })
            );
          }
        } catch {
          /* ignore */
        }
      },
      invalidatesTags: ["Auth", "Account"],
    }),

    // ✅ KEEP register/google/reset/resend etc unchanged
    register: build.mutation({
      query: (body) => ({
        url: "users/register/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Auth", "Account"],
    }),

    googleAuth: build.mutation({
      query: ({ token }) => ({
        url: "auth/google/",
        method: "POST",
        body: { token },
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(
            setCredentials({ access: data.access, refresh: data.refresh })
          );
        } catch {
          /* ignore */
        }
      },
      invalidatesTags: ["Auth", "Account"],
    }),

    requestPasswordReset: build.mutation({
      query: ({ email }) => ({
        url: "auth/password/reset/",
        method: "POST",
        body: { email },
      }),
    }),

    resetPasswordConfirm: build.mutation({
      query: ({ uidb64, token, new_password1, new_password2 }) => ({
        url: `auth/password/reset/confirm/${uidb64}/${token}/`,
        method: "POST",
        body: { new_password1, new_password2 },
      }),
    }),

    resendVerification: build.mutation({
      query: ({ email }) => ({
        url: "auth/resend-verification/",
        method: "POST",
        body: { email },
      }),
    }),

    verifyEmail: build.query({
      query: ({ uidb64, token }) => `auth/verify-email/${uidb64}/${token}/`,
      providesTags: ["Auth", "Account"],
    }),

    doLogout: build.mutation({
      queryFn: async (_arg, { dispatch }) => {
        dispatch(logout());
        return { data: { ok: true } };
      },
      invalidatesTags: ["Auth", "Account"],
    }),
  }),
});

export const {
  useLoginStartMutation,
  useLoginVerifyMutation,
  useRegisterMutation,
  useGoogleAuthMutation,
  useRequestPasswordResetMutation,
  useResetPasswordConfirmMutation,
  useResendVerificationMutation,
  useVerifyEmailQuery,
  useDoLogoutMutation,
} = authApi;
