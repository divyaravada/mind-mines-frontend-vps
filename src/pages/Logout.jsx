// src/pages/Logout.jsx
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { useDoLogoutMutation } from "../features/auth/authApi";

export default function Logout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [doLogout] = useDoLogoutMutation();

  useEffect(() => {
    doLogout();
    const timer = setTimeout(() => navigate("/"), 4000);
    return () => clearTimeout(timer);
  }, [doLogout, navigate]);

  return (
    <div className="min-h-screen bg-marblewhite dark:bg-marbleblack flex flex-col items-center justify-center px-4">
      <div className="max-w-lg w-full bg-white dark:bg-neutral-900 p-8 rounded-xl shadow-sm ring-1 ring-black/5 dark:ring-white/5 text-center">
        <div
          className="text-4xl mb-4"
          role="img"
          aria-label={t("logout.iconLabel")}
        >
          👋
        </div>
        <h1 className="text-2xl font-bold mb-2 text-marbleblack dark:text-white">
          {t("logout.message")}
        </h1>
        <p className="mb-6 text-gray-700 dark:text-gray-300">
          {t("logout.thanks")}
        </p>
        <Link
          to="/"
          className="inline-block px-6 py-2 rounded-lg bg-backnewswhite text-white hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-backnewswhite focus:ring-offset-2 dark:focus:ring-offset-neutral-900 transition font-semibold"
        >
          {t("logout.cta")}
        </Link>
      </div>
    </div>
  );
}
