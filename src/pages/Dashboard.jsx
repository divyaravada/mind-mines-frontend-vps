// src/pages/Dashboard.jsx
import { Link } from "react-router-dom";
import { useGetAccountQuery } from "../features/account/accountApi";
import { useTranslation } from "react-i18next";

export default function Dashboard() {
  const { t } = useTranslation();
  const { data, isLoading } = useGetAccountQuery();
  const email = data?.email || "";

  return (
    <div className="min-h-screen bg-marblewhite dark:bg-marbleblack dark:text-backnewsdark">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="text-5xl font-light mb-4 text-backnewswhite dark:text-backnewswhite">
          {t("myaccount.welcome")}
        </h1>

        <p className="mb-8 text-gray-600 dark:text-gray-300">
          {isLoading ? (
            t("common.loading")
          ) : (
            <>
              {t("myaccount.logemail")} <strong>{email}</strong>.
            </>
          )}
        </p>

        <Link
          to="/account/profile"
          className="inline-block bg-backnewswhite text-white px-6 py-3 rounded-lg hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-backnewswhite focus:ring-offset-2 dark:focus:ring-offset-marbleblack transition"
        >
          {t("myaccount.update")}
        </Link>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          <Link
            to="/account/orders"
            className="p-6 border border-gray-200 dark:border-neutral-800 rounded-xl hover:shadow-sm bg-white dark:bg-neutral-900 transition"
          >
            <h3 className="text-2xl font-light">{t("myaccount.order")}</h3>
            <div className="mt-3 text-gray-600 dark:text-gray-300">
              {t("myaccount.orderdetails")}
            </div>
          </Link>

          <Link
            to="/account/profile"
            className="p-6 border border-gray-200 dark:border-neutral-800 rounded-xl hover:shadow-sm bg-white dark:bg-neutral-900 transition"
          >
            <h3 className="text-2xl font-light">{t("myaccount.persinfo")}</h3>
            <div className="mt-3 text-gray-600 dark:text-gray-300">
              {t("myaccount.perdet")}
            </div>
          </Link>

          <Link
            to="/account/addresses"
            className="p-6 border border-gray-200 dark:border-neutral-800 rounded-xl hover:shadow-sm bg-white dark:bg-neutral-900 transition"
          >
            <h3 className="text-2xl font-light">{t("myaccount.shopadd")}</h3>
            <div className="mt-3 text-gray-600 dark:text-gray-300">
              {t("myaccount.shopdet")}
            </div>
          </Link>

          <Link
            to="/account/wishlist"
            className="p-6 border border-gray-200 dark:border-neutral-800 rounded-xl hover:shadow-sm bg-white dark:bg-neutral-900 transition"
          >
            <h3 className="text-2xl font-light">{t("myaccount.wishli")}</h3>
            <div className="mt-3 text-gray-600 dark:text-gray-300">
              {t("myaccount.wishdet")}
            </div>
          </Link>

          <Link
            to="/account/reviews"
            className="p-6 border border-gray-200 dark:border-neutral-800 rounded-xl hover:shadow-sm bg-white dark:bg-neutral-900 transition"
          >
            <h3 className="text-2xl font-light">{t("myaccount.review")}</h3>
            <div className="mt-3 text-gray-600 dark:text-gray-300">
              {t("myaccount.reviewde")}
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
