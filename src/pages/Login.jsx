// src/pages/Login.jsx
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import RegisterForm from "./RegisterPage";
import ForgotPasswordModal from "../components/ForgotPasswordModal";
import { useNavigate, useSearchParams } from "react-router-dom";
import GoogleLoginButton from "../components/GoogleLoginButton";
import { useLoginMutation } from "../features/auth/authApi";
import { Helmet } from "react-helmet-async";

export default function LoginPage() {
  const { t } = useTranslation();
  const [mode, setMode] = useState("login");
  const [showPass, setShowPass] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [login, { isLoading }] = useLoginMutation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const rawNext = params.get("next") || "/";

  const inputCls =
    "w-full rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900/60 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 px-3 py-3 focus:outline-none focus:ring-2 focus:ring-backnewswhite/80 focus:border-transparent transition";

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
    setLoginError("");

    try {
      await login({ email, password }).unwrap();
      navigate(nextPath, { replace: true });
    } catch (err) {
      console.warn("Login failed", err);

      const detail = (err?.data?.detail || "").toLowerCase();

      if (detail.includes("no active account") || err?.status === 401) {
        // Wrong email or password
        setLoginError(t("auth.loginInvalid"));
      } else {
        // Generic error
        setLoginError(t("auth.loginFailed"));
      }
    }
  }

  return (
    <>
      <Helmet>
        <meta name="robots" content="noindex,nofollow" />
        <meta name="googlebot" content="noindex,nofollow" />
      </Helmet>
      <div className="min-h-screen bg-marblewhite dark:bg-marbleblack">
        <div className="min-h-[75vh] flex flex-col justify-center px-2">
          <ForgotPasswordModal
            open={resetOpen}
            onClose={() => setResetOpen(false)}
          />

          <div className="max-w-4xl mx-auto w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10 py-8">
              {/* Login */}
              <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm ring-1 ring-black/5 dark:text-backnewsdark dark:ring-white/5 p-6">
                <h2 className="text-2xl font-serif mb-2 text-marbleblack dark:text-backnewsdark">
                  {t("auth.loginTitle")}
                </h2>
                <p className="mb-6 text-gray-700 dark:text-gray-300">
                  {t("auth.loginSub")}
                </p>

                {/* error message */}
                {loginError && (
                  <div className="mb-4 text-sm text-red-600">{loginError}</div>
                )}

                {mode === "login" ? (
                  <form className="space-y-5" onSubmit={handleLogin}>
                    <input
                      className={inputCls}
                      type="email"
                      placeholder={t("auth.email")}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="username"
                      required
                    />

                    <div className="relative">
                      <input
                        className={inputCls}
                        type={showPass ? "text" : "password"}
                        placeholder={t("auth.password")}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        required
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 underline"
                        onClick={() => setShowPass((v) => !v)}
                        aria-label={
                          showPass
                            ? t("auth.hidePassword")
                            : t("auth.showPassword")
                        }
                      >
                        {showPass
                          ? t("auth.hidePassword")
                          : t("auth.showPassword")}
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
                      className="w-full py-3 rounded-lg bg-backnewswhite text-white font-semibold hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-backnewswhite focus:ring-offset-2 dark:focus:ring-offset-neutral-900 transition disabled:opacity-60"
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
                    className="w-full py-3 rounded-lg border border-marbleblack dark:border-neutral-700 text-marbleblack dark:text-white font-semibold hover:bg-black/[0.03] dark:hover:bg-white/[0.06] transition"
                    onClick={() => setMode("login")}
                  >
                    {t("auth.login")}
                  </button>
                )}
              </div>

              {/* Register */}
              <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm ring-1 ring-black/5 dark:text-backnewsdark dark:ring-white/5 p-6">
                <h2 className="text-2xl font-serif mb-2 text-marbleblack dark:text-backnewsdark">
                  {t("auth.registerTitle")}
                </h2>
                <p className="mb-6 text-gray-700 dark:text-gray-300">
                  {t("auth.registerSub")}
                </p>

                {mode === "register" ? (
                  <RegisterForm />
                ) : (
                  <button
                    className="w-full py-3 rounded-lg border border-marbleblack dark:border-neutral-700 text-marbleblack dark:text-white font-semibold hover:bg-black/[0.03] dark:hover:bg-white/[0.06] transition"
                    onClick={() => setMode("register")}
                  >
                    {t("auth.register")}
                  </button>
                )}
              </div>
            </div>

            {/* mode toggle */}
            <div className="flex justify-center gap-8 mt-2 py-6 text-gray-500">
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
      </div>
    </>
  );
}
