import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useVerifyEmailQuery } from "../features/auth/authApi";
import SEO from "../components/SEO";

export default function EmailVerificationPage() {
  const { uidb64, token } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [status, setStatus] = useState("verifying");

  const skip = !(uidb64 && token);
  const { isFetching, isError } = useVerifyEmailQuery(
    { uidb64, token },
    { skip },
  );

  useEffect(() => {
    if (skip) return;
    if (isFetching) setStatus("verifying");
    else if (isError) setStatus("error");
    else {
      setStatus("success");
      const timeoutId = setTimeout(() => navigate("/users/login"), 4000);
      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [skip, isFetching, isError, navigate]);

  const title =
    status === "success"
      ? t("auth.emailVerification.success")
      : status === "error"
        ? t("auth.emailVerification.error")
        : t("auth.emailVerification.verifying");

  const description =
    status === "success"
      ? t("auth.emailVerification.redirect")
      : status === "error"
        ? t("auth.emailVerification.tryAgain")
        : t("auth.emailVerification.pleaseWait");

  return (
    <>
      <SEO
        title={title}
        description={description}
        canonical="https://mindmines.eu/verify-email"
        noindex
      />

      <div className="min-h-screen bg-marblewhite dark:bg-marbleblack dark:text-backnewsdark flex items-center">
        <div className="container max-w-lg mx-auto px-4">
          <div className="text-center bg-white dark:bg-neutral-900 rounded-xl shadow-sm ring-1 ring-black/5 dark:ring-white/5 p-8">
            <h1 className="text-2xl font-semibold mb-2">{title}</h1>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {status === "success"
                ? t("auth.emailVerification.nextStep")
                : status === "error"
                  ? t("auth.emailVerification.tryAgain")
                  : t("auth.emailVerification.pleaseWait")}
            </p>
            <button
              type="button"
              onClick={() => navigate("/users/login")}
              className="mt-4 px-4 py-2 rounded-lg bg-backnewswhite text-white"
            >
              {t("auth.goToLogin", "Go to login")}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
