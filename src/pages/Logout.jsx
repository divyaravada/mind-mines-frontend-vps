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
    doLogout(); // clears redux + localStorage
    const timer = setTimeout(() => navigate("/"), 4000);
    return () => clearTimeout(timer);
  }, [doLogout, navigate]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
      <div className="max-w-lg w-full bg-white/70 dark:bg-marbleblack/60 p-8 rounded shadow text-center">
        <div className="text-4xl mb-4">👋</div>
        <h1 className="text-2xl font-bold mb-2">{t("logout.message")}</h1>
        <p className="mb-6 text-gray-700 dark:text-gray-300">
          {t("logout.thanks")}
        </p>
        <Link
          to="/"
          className="inline-block px-6 py-2 rounded bg-marbleblack text-white hover:bg-black/90 transition font-semibold"
        >
          {t("logout.cta")}
        </Link>
      </div>
    </div>
  );
}
