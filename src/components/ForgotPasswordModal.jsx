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
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-marbleblack p-6 rounded shadow-lg w-full max-w-md relative">
        <button
          type="button"
          className="absolute right-2 top-2 text-xl"
          onClick={onClose}
          aria-label={t("common.close")}
        >
          {"\u00d7"}
        </button>
        <h2 className="text-xl font-bold mb-4">{t("forgotPassword.title")}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder={t("forgotPassword.emailPlaceholder")}
            className="w-full border px-3 py-2 rounded"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button
            className="w-full py-2 bg-marbleblack text-white rounded"
            disabled={isLoading}
          >
            {t("forgotPassword.send")}
          </button>
        </form>
        {messageKey && (
          <p className="mt-4 text-center text-sm">{t(messageKey)}</p>
        )}
      </div>
    </div>
  );
}
