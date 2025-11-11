// src/pages/ResetPasswordPage.jsx
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useResetPasswordConfirmMutation } from "../features/auth/authApi";

export default function ResetPasswordPage() {
  const { uidb64, token } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [message, setMessage] = useState("");
  const [resetConfirm, { isLoading }] = useResetPasswordConfirmMutation();

  const inputCls =
    "w-full rounded-lg border border-gray-300 dark:border-neutral-700 " +
    "bg-white dark:bg-neutral-900/60 text-gray-900 dark:text-gray-100 " +
    "placeholder-gray-400 dark:placeholder-gray-500 px-3 py-2 " +
    "focus:outline-none focus:ring-2 focus:ring-backnewswhite/80 focus:border-transparent transition";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== password2) {
      setMessage(t("reset.mismatch"));
      return;
    }
    try {
      await resetConfirm({
        uid: uidb64,
        token,
        new_password1: password,
        new_password2: password2,
      }).unwrap();
      setMessage(t("reset.success"));
      setTimeout(() => navigate("/users/login"), 2500);
    } catch {
      setMessage(t("reset.invalid"));
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-marblewhite dark:bg-marbleblack px-4">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-xl shadow-sm ring-1 ring-black/5 dark:ring-white/5 p-6">
        <h2 className="text-xl md:text-2xl font-bold mb-4 text-center">
          {t("reset.title")}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder={t("reset.newPassword")}
            className={inputCls}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
          <input
            type="password"
            placeholder={t("reset.repeatPassword")}
            className={inputCls}
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            required
            autoComplete="new-password"
          />

          <button
            type="submit"
            className="w-full py-2.5 rounded-lg bg-backnewswhite text-white font-medium
                       hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-backnewswhite
                       focus:ring-offset-2 dark:focus:ring-offset-neutral-900 disabled:opacity-60 transition"
            disabled={isLoading || !password || !password2}
          >
            {t("reset.submit")}
          </button>
        </form>

        {message && (
          <p
            className="mt-4 text-center text-gray-800 dark:text-gray-200"
            role="status"
            aria-live="polite"
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
