//src/pages/ResendVerification.jsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useResendVerificationMutation } from "../features/auth/authApi";

export default function ResendVerification() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [resend, { isLoading }] = useResendVerificationMutation();

  const handleResend = async (e) => {
    e.preventDefault();
    setMsg("");
    setError("");
    try {
      const res = await resend({ email: email.trim() }).unwrap();
      setMsg(res?.detail || t("auth.resendSuccess"));
    } catch (err) {
      setError(err?.data?.detail || t("auth.resendError"));
    }
  };

  const inputCls =
    "w-full rounded-lg border border-gray-300 dark:border-neutral-700 " +
    "bg-white dark:bg-neutral-900/60 text-gray-900 dark:text-gray-100 " +
    "placeholder-gray-400 dark:placeholder-gray-500 px-3 py-2 " +
    "focus:outline-none focus:ring-2 focus:ring-backnewswhite/80 focus:border-transparent transition";

  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-marblewhite dark:bg-marbleblack px-4">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-xl shadow-sm ring-1 ring-black/5 dark:ring-white/5 p-6">
        <h2 className="text-2xl font-bold mb-2 text-center">
          {t("auth.resendTitle")}
        </h2>
        <p className="text-center text-gray-600 dark:text-gray-300 mb-6">
          {t("auth.resendDesc")}
        </p>

        <form onSubmit={handleResend} className="space-y-4">
          <label className="block text-sm text-gray-700 dark:text-gray-300">
            <span className="sr-only">{t("auth.resendPlaceholder")}</span>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder={t("auth.resendPlaceholder")}
              className={inputCls}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <button
            className="w-full py-2.5 rounded-lg bg-backnewswhite text-white font-medium
                       hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-backnewswhite
                       focus:ring-offset-2 dark:focus:ring-offset-neutral-900 disabled:opacity-60 transition"
            disabled={isLoading || !email.trim()}
          >
            {t("auth.resendButton")}
          </button>

          {/* status messages */}
          {msg && (
            <p
              className="text-center text-backnewsdark"
              role="status"
              aria-live="polite"
            >
              {msg}
            </p>
          )}
          {error && (
            <p
              className="text-center text-red-600"
              role="alert"
              aria-live="assertive"
            >
              {error}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
