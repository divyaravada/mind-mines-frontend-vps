// src/pages/RegisterPage.jsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useRegisterMutation } from "../features/auth/authApi";

export default function RegisterForm() {
  const { t } = useTranslation();
  const [fields, setFields] = useState({
    username: "",
    email: "",
    password: "",
    password2: "",
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [register, { isLoading }] = useRegisterMutation();

  function handleChange(e) {
    setFields({ ...fields, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (fields.password !== fields.password2) {
      setError(t("auth.registerMismatch"));
      return;
    }
    try {
      await register(fields).unwrap();
      setSuccess(t("auth.registerSuccess"));
      setFields({ username: "", email: "", password: "", password2: "" });
    } catch (err) {
      const msg = err?.data?.email?.[0]?.includes("already")
        ? t("auth.registerEmailExists")
        : t("auth.registerFailed");
      setError(msg);
    }
  }

  return (
    <form
      className="space-y-4 max-w-md mx-auto p-8 bg-white shadow rounded"
      onSubmit={handleSubmit}
    >
      <h2 className="text-2xl mb-2">{t("Register")}</h2>
      {error && <div className="text-red-500">{error}</div>}
      {success && <div className="text-green-500">{success}</div>}

      <input
        className="w-full border px-3 py-2 rounded"
        name="username"
        placeholder={t("Username")}
        value={fields.username}
        onChange={handleChange}
        required
      />
      <input
        className="w-full border px-3 py-2 rounded"
        name="email"
        type="email"
        placeholder={t("Email")}
        value={fields.email}
        onChange={handleChange}
        required
      />
      <input
        className="w-full border px-3 py-2 rounded"
        name="password"
        type="password"
        placeholder={t("Password")}
        value={fields.password}
        onChange={handleChange}
        required
      />
      <input
        className="w-full border px-3 py-2 rounded"
        name="password2"
        type="password"
        placeholder={t("Repeat Password")}
        value={fields.password2}
        onChange={handleChange}
        required
      />

      <button
        className="w-full py-2 rounded bg-marbleblack text-white font-semibold hover:bg-black/90 transition disabled:opacity-60"
        disabled={isLoading}
      >
        {t("Register")}
      </button>
    </form>
  );
}

