// src/pages/Login.jsx
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import RegisterForm from "./RegisterPage";
import ForgotPasswordModal from "../components/ForgotPasswordModal";
import { useNavigate, useSearchParams } from "react-router-dom";
import GoogleLoginButton from "../components/GoogleLoginButton";
import { useLoginMutation } from "../features/auth/authApi";

export default function LoginPage() {
  const { t } = useTranslation();
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [showPass, setShowPass] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [login, { isLoading }] = useLoginMutation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const rawNext = params.get("next") || "/";

  const nextPath = useMemo(() => {
    try {
      const u = new URL(rawNext, window.location.origin);
      if (u.origin !== window.location.origin) return "/";
      return `${u.pathname}${u.search}${u.hash}` || "/";
    } catch {
      return rawNext.startsWith("/") ? rawNext : "/";
    }
  }, [rawNext]);

  async function handleLogin(e) {
    e.preventDefault();
    if (!email || !password) return;
    try {
      await login({ email, password }).unwrap();
      navigate(nextPath, { replace: true });
    } catch (e) {
      console.warn("Login failed", e);
      // optionally show toast
    }
  }

  return (
    <div className="min-h-[75vh] flex flex-col justify-center px-2">
      <ForgotPasswordModal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
      />

      <div className="max-w-4xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 py-8 text-backnewswhite dark:text-backnewsdark">
          {/* Login */}
          <div>
            <h2 className="text-2xl font-serif mb-2">{t("auth.loginTitle")}</h2>
            <p className="mb-6 text-gray-700 dark:text-gray-300">
              {t("auth.loginSub")}
            </p>

            {mode === "login" ? (
              <form className="space-y-5" onSubmit={handleLogin}>
                <input
                  className="w-full border px-3 py-3 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 bg-transparent"
                  type="email"
                  placeholder={t("auth.email")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                />
                <div className="relative">
                  <input
                    className="w-full border px-3 py-3 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 bg-transparent"
                    type={showPass ? "text" : "password"}
                    placeholder={t("auth.password")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 underline"
                    onClick={() => setShowPass((v) => !v)}
                    aria-label={
                      showPass ? t("auth.hidePassword") : t("auth.showPassword")
                    }
                  >
                    {showPass ? t("auth.hidePassword") : t("auth.showPassword")}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    className="text-backnewswhite dark:text-backnewsdark underline text-sm"
                    onClick={() => setResetOpen(true)}
                  >
                    {t("auth.forgot")}
                  </button>
                </div>

                <button
                  className="w-full py-3 rounded bg-marbleblack dark:bg-backnewsdark text-white font-semibold hover:bg-black/90 transition disabled:opacity-60"
                  type="submit"
                  disabled={!email || !password || isLoading}
                >
                  {t("auth.login")}
                </button>

                <div className="flex flex-col items-center mt-4 gap-2">
                  <div className="text-gray-500">{t("auth.or")}</div>
                  <GoogleLoginButton successRedirect={nextPath} />
                </div>
              </form>
            ) : (
              <button
                className="w-full py-3 rounded border dark:bg-backnewsdark border-marbleblack text-marbleblack dark:text-white font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                onClick={() => setMode("login")}
              >
                {t("auth.login")}
              </button>
            )}
          </div>

          {/* Register */}
          <div>
            <h2 className="text-2xl font-serif mb-2">
              {t("auth.registerTitle")}
            </h2>
            <p className="mb-6 text-gray-700 dark:text-gray-300">
              {t("auth.registerSub")}
            </p>
            {mode === "register" ? (
              <RegisterForm />
            ) : (
              <button
                className="w-full py-3 rounded border border-marbleblack dark:bg-backnewsdark text-marbleblack dark:text-white font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                onClick={() => setMode("register")}
              >
                {t("auth.register")}
              </button>
            )}
          </div>
        </div>

        <div className="flex justify-center gap-8 mt-4 py-6 text-gray-500">
          <button
            className={`underline underline-offset-2 ${
              mode === "login"
                ? "text-marbleblack dark:text-white font-bold"
                : ""
            }`}
            onClick={() => setMode("login")}
          >
            {t("auth.login")}
          </button>
          <span>/</span>
          <button
            className={`underline underline-offset-2 ${
              mode === "register"
                ? "text-marbleblack dark:text-white font-bold"
                : ""
            }`}
            onClick={() => setMode("register")}
          >
            {t("auth.register")}
          </button>
        </div>
      </div>
    </div>
  );
}
