// src/pages/NotFoundPage.jsx
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import SEO from "../components/SEO";

export default function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <>
      <SEO
        title={t("notFound.title", "Page not found") + " | MindMines"}
        description={t("notFound.message", "This page does not exist.")}
        canonical="https://mindmines.eu/404"
        noindex
      />
      <div className="min-h-[60vh] flex items-center justify-center bg-marblewhite dark:text-backnewsdark dark:bg-marbleblack px-4">
        <div className="max-w-md w-full text-center bg-white dark:bg-neutral-900 rounded-xl shadow-sm ring-1 ring-black/5 dark:ring-white/5 p-6">
          <h1 className="text-3xl font-bold mb-2">{t("notFound.title")}</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {t("notFound.message")}
          </p>

          <Link
            to="/decorative-products"
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-backnewswhite text-white font-semibold hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-backnewswhite focus:ring-offset-2 dark:focus:ring-offset-neutral-900 transition"
          >
            {t("notFound.backToShop")}
          </Link>
        </div>
      </div>
    </>
  );
}
