// src/pages/RegisterPage.jsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
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
      // Show bilingual “check your email” text
      setSuccess(t("auth.registerSuccess"));
      setFields({ username: "", email: "", password: "", password2: "" });
    } catch (err) {
      // Check if backend returns “email already exists”
      const backendEmailError = err?.data?.email?.[0] || "";
      const msg = backendEmailError.toLowerCase().includes("already")
        ? t("auth.registerEmailExists")
        : t("auth.registerFailed");
      setError(msg);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="min-h-[calc(100vh-35rem)] grid place-items-center bg-marblewhite dark:bg-marbleblack px-1"
    >
      <div className="w-full max-w-md p-8 rounded-xl bg-white dark:bg-neutral-900 shadow-sm ring-1 ring-black/5 dark:ring-white/5">
        <h2 className="text-2xl font-semibold mb-4">
          {t("auth.registerTitle")}
        </h2>

        {error && <div className="mb-3 text-sm text-red-600">{error}</div>}

        {success && (
          <div className="mb-3 text-sm text-green-600 space-y-1">
            <p>{success}</p>
            <p>
              {t("auth.registerNoEmailHint")}{" "}
              <Link
                to="/resend-verification"
                className="underline text-backnewswhite dark:text-backnewsdark"
              >
                {t("auth.registerResendLink")}
              </Link>
            </p>
          </div>
        )}

        <input
          className="w-full mb-3 rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900/60 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-backnewswhite/80 focus:border-transparent transition"
          name="username"
          placeholder={t("auth.username")}
          value={fields.username}
          onChange={handleChange}
          required
        />
        <input
          className="w-full mb-3 rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900/60 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-backnewswhite/80 focus:border-transparent transition"
          name="email"
          type="email"
          placeholder={t("auth.email")}
          value={fields.email}
          onChange={handleChange}
          required
        />
        <input
          className="w-full mb-3 rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900/60 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-backnewswhite/80 focus:border-transparent transition"
          name="password"
          type="password"
          placeholder={t("auth.password")}
          value={fields.password}
          onChange={handleChange}
          required
        />
        <input
          className="w-full mb-5 rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900/60 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-backnewswhite/80 focus:border-transparent transition"
          name="password2"
          type="password"
          placeholder={t("auth.passwordRepeat")}
          value={fields.password2}
          onChange={handleChange}
          required
        />

        <button
          className="w-full py-2.5 rounded-lg bg-backnewswhite text-white font-semibold hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-backnewswhite focus:ring-offset-2 dark:focus:ring-offset-neutral-900 transition disabled:opacity-60"
          disabled={isLoading}
        >
          {t("auth.registerButton")}
        </button>
      </div>
    </form>
  );
}
