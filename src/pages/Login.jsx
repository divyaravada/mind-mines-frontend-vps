// src/pages/Login.jsx
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import RegisterForm from "./RegisterPage";
import ForgotPasswordModal from "../components/ForgotPasswordModal";
import { useNavigate, useSearchParams } from "react-router-dom";
import GoogleLoginButton from "../components/GoogleLoginButton";
import {
  useLoginStartMutation,
  useLoginVerifyMutation,
} from "../features/auth/authApi";
import SEO from "../components/SEO";

export default function LoginPage() {
  const { t } = useTranslation();

  const [mode, setMode] = useState("login");
  const [showPass, setShowPass] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  // step state
  const [step, setStep] = useState("credentials"); // "credentials" | "otp"
  const [otpId, setOtpId] = useState("");
  const [otpCode, setOtpCode] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loginError, setLoginError] = useState("");
  const [infoMsg, setInfoMsg] = useState("");

  const [loginStart, { isLoading: startLoading }] = useLoginStartMutation();
  const [loginVerify, { isLoading: verifyLoading }] = useLoginVerifyMutation();

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

  const isBusy = startLoading || verifyLoading;

  function resetOtpFlow() {
    setStep("credentials");
    setOtpId("");
    setOtpCode("");
    setInfoMsg("");
  }

  async function handleLoginStart(e) {
    e.preventDefault();
    if (!email || !password) return;

    setLoginError("");
    setInfoMsg("");

    try {
      const res = await loginStart({ email, password }).unwrap();
      // expecting: { ok:true, otp_id:"..." }
      const id = res?.otp_id || res?.otpId || res?.id;
      if (!id) throw new Error("Missing otp_id from server");

      setOtpId(String(id));
      setStep("otp");
      setInfoMsg(t("auth.otpSentDetailed"));
    } catch (err) {
      console.warn("Login start failed", err);
      const detail = String(
        err?.data?.detail || err?.data?.error || "",
      ).toLowerCase();

      if (
        detail.includes("invalid credentials") ||
        err?.status === 400 ||
        err?.status === 401
      ) {
        setLoginError(t("auth.loginInvalid"));
      } else if (detail.includes("not verified") || err?.status === 403) {
        setLoginError(t("auth.accountNotVerified") || t("auth.loginFailed"));
      } else {
        setLoginError(t("auth.loginFailed"));
      }
    }
  }

  async function handleOtpVerify(e) {
    e.preventDefault();
    if (!otpId || !otpCode) return;

    setLoginError("");
    setInfoMsg("");

    try {
      await loginVerify({ otp_id: otpId, code: otpCode }).unwrap();
      navigate(nextPath, { replace: true });
    } catch (err) {
      console.warn("OTP verify failed", err);
      const detail = String(
        err?.data?.detail || err?.data?.error || "",
      ).toLowerCase();

      if (detail.includes("expired")) {
        setLoginError(t("auth.otpExpired") || "OTP expired. Please try again.");
        resetOtpFlow();
      } else if (detail.includes("already used")) {
        setLoginError(
          t("auth.otpUsed") || "OTP already used. Please login again.",
        );
        resetOtpFlow();
      } else if (detail.includes("too many")) {
        setLoginError(
          t("auth.otpTooMany") || "Too many attempts. Please login again.",
        );
        resetOtpFlow();
      } else if (detail.includes("invalid")) {
        setLoginError(
          t("auth.otpInvalid") || "Invalid code. Please try again.",
        );
      } else {
        setLoginError(t("auth.loginFailed"));
      }
    }
  }

  async function handleResendOtp() {
    if (!email || !password) {
      resetOtpFlow();
      return;
    }
    setLoginError("");
    setInfoMsg("");

    try {
      const res = await loginStart({ email, password }).unwrap();
      const id = res?.otp_id || res?.otpId || res?.id;
      if (!id) throw new Error("Missing otp_id from server");

      setOtpId(String(id));
      setOtpCode("");
      setInfoMsg(t("auth.otpResent") || "OTP resent to your email.");
    } catch (err) {
      console.warn("OTP resend failed", err);
      setLoginError(t("auth.loginFailed"));
      resetOtpFlow();
    }
  }

  return (
    <>
      <SEO
        title={t("auth.loginTitle", "Login") + " | MindMines"}
        description={t("auth.loginSub", "Login to your MindMines account.")}
        canonical="https://mindmines.eu/users/login"
        noindex
      />

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
                <p className="mb-2 text-gray-700 dark:text-gray-300">
                  {t("auth.loginSub")}
                </p>
                <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
                  {t(
                    "auth.loginOtpHint",
                    "After entering your email and password, we will send a login code to your email.",
                  )}
                </p>

                {loginError && (
                  <div className="mb-4 text-sm text-red-600">
                    {loginError}
                    {loginError === t("auth.accountNotVerified") && (
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={() => navigate("/resend-verification")}
                          className="underline text-backnewswhite dark:text-backnewsdark"
                        >
                          {t(
                            "auth.resendVerificationLink",
                            "Resend verification email",
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {infoMsg && (
                  <div className="mb-4 text-sm text-green-700 dark:text-green-400">
                    {infoMsg}
                  </div>
                )}

                {mode === "login" ? (
                  <>
                    {step === "credentials" ? (
                      <form className="space-y-5" onSubmit={handleLoginStart}>
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
                          disabled={!email || !password || isBusy}
                        >
                          {startLoading
                            ? t("auth.sendingOtp") || "Sending OTP..."
                            : t("auth.login") || "Login"}
                        </button>

                        <div className="flex flex-col items-center mt-4 gap-2">
                          <div className="text-gray-500">{t("auth.or")}</div>
                          <GoogleLoginButton successRedirect={nextPath} />
                        </div>
                      </form>
                    ) : (
                      // ✅ OTP Step
                      <form className="space-y-5" onSubmit={handleOtpVerify}>
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                          {t("auth.otpHint") ||
                            "Enter the 6-digit code sent to your email."}
                        </div>

                        <input
                          className={inputCls}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={6}
                          placeholder={t("auth.otpCode") || "OTP code"}
                          value={otpCode}
                          onChange={(e) => {
                            const v = e.target.value
                              .replace(/\D/g, "")
                              .slice(0, 6);
                            setOtpCode(v);
                          }}
                          required
                        />

                        <button
                          className="w-full py-3 rounded-lg bg-backnewswhite text-white font-semibold hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-backnewswhite focus:ring-offset-2 dark:focus:ring-offset-neutral-900 transition disabled:opacity-60"
                          type="submit"
                          disabled={!otpId || otpCode.length !== 6 || isBusy}
                        >
                          {verifyLoading
                            ? t("auth.verifying") || "Verifying..."
                            : t("auth.verifyOtp") || "Verify & Login"}
                        </button>

                        <div className="flex items-center justify-between text-sm">
                          <button
                            type="button"
                            className="underline text-gray-600 dark:text-gray-300"
                            onClick={resetOtpFlow}
                            disabled={isBusy}
                          >
                            {t("auth.backToLogin") || "Back"}
                          </button>

                          <button
                            type="button"
                            className="underline text-backnewswhite dark:text-backnewsdark"
                            onClick={handleResendOtp}
                            disabled={isBusy}
                          >
                            {t("auth.resendOtp") || "Resend code"}
                          </button>
                        </div>
                      </form>
                    )}
                  </>
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
                    onClick={() => {
                      setMode("register");
                      resetOtpFlow();
                    }}
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
                onClick={() => {
                  setMode("register");
                  resetOtpFlow();
                }}
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
