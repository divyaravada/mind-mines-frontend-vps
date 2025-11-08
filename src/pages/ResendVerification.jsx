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
      const res = await resend({ email }).unwrap();
      setMsg(res?.detail || t("auth.resendSuccess"));
    } catch (err) {
      setError(err?.data?.detail || t("auth.resendError"));
    }
  };

  return (
    <div className="max-w-md mx-auto my-10 p-6 bg-white shadow-md rounded">
      <h2 className="text-2xl font-bold mb-4 text-center">
        {t("auth.resendTitle")}
      </h2>
      <p className="text-center text-gray-600 mb-6">{t("auth.resendDesc")}</p>
      <form onSubmit={handleResend} className="space-y-4">
        <input
          type="email"
          placeholder={t("auth.resendPlaceholder")}
          className="w-full border px-3 py-2 rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button
          className="w-full py-2 bg-marbleblack text-white rounded disabled:opacity-60"
          disabled={isLoading}
        >
          {t("auth.resendButton")}
        </button>
        {msg && <p className="text-green-600">{msg}</p>}
        {error && <p className="text-red-600">{error}</p>}
      </form>
    </div>
  );
}
