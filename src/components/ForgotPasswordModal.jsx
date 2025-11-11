// src/components/ForgotPasswordModal.jsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useRequestPasswordResetMutation } from "../features/auth/authApi";

export default function ForgotPasswordModal({ open, onClose }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [messageKey, setMessageKey] = useState("");
  const [send, { isLoading }] = useRequestPasswordResetMutation();

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await send({ email }).unwrap();
      setMessageKey("forgotPassword.success");
    } catch {
      setMessageKey("forgotPassword.error");
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-marblewhite dark:bg-marbleblack p-6 rounded-2xl shadow-xl w-full max-w-md relative border border-black/10 dark:border-white/10">
        <button
          type="button"
          className="absolute right-2 top-2 text-xl text-gray-700 dark:text-gray-300 hover:opacity-80"
          onClick={onClose}
          aria-label={t("common.close")}
        >
          {"\u00d7"}
        </button>

        <h2 className="text-xl font-bold mb-4 text-backnewswhite dark:text-backnewsdark">
          {t("forgotPassword.title")}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder={t("forgotPassword.emailPlaceholder")}
            className="w-full border border-black/15 dark:border-white/15 rounded px-3 py-2 bg-white dark:bg-gray-800
                       text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2
                       focus:ring-backnewswhite dark:focus:ring-backnewsdark"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <button
            className="w-full py-2 rounded font-semibold transition
                       bg-backnewswhite text-white hover:opacity-90 disabled:opacity-60
                       dark:bg-backnewsdark dark:text-marblewhite"
            disabled={isLoading}
          >
            {t("forgotPassword.send")}
          </button>
        </form>

        {messageKey && (
          <p
            className={`mt-4 text-center text-sm ${
              messageKey === "forgotPassword.success"
                ? "text-green-700 dark:text-green-300"
                : "text-red-700 dark:text-red-400"
            }`}
          >
            {t(messageKey)}
          </p>
        )}
      </div>
    </div>
  );
}
