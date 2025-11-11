// src/components/CountertopCTA.jsx
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export default function CountertopCTA() {
  const { t } = useTranslation();
  const bulletKeys = [
    "home.cta.materialLine1",
    "home.cta.materialLine2",
    "home.cta.materialLine3",
  ];

  return (
    <section className="bg-marblewhite dark:bg-marbleblack py-10">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 items-center px-4">
        <div className="md:col-span-2">
          <h3 className="text-2xl font-bold mb-2 text-backnewswhite dark:text-backnewsdark">
            {t("home.cta.countertopTitle")}
          </h3>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            {t("home.cta.countertopLead")}
          </p>
          <div className="flex gap-3 flex-wrap">
            <a
              href="https://wa.me/491704658188?text=Hello%20MindMines%2C%20please%20quote%20a%20kitchen%20countertop%20(%2Blxw%2Bh%20or%20drawing%20attached)."
              target="_blank"
              rel="noreferrer"
              className="px-5 py-2 rounded-xl bg-green-100 hover:bg-green-200 text-green-900 font-semibold"
            >
              {t("home.cta.whatsapp")}
            </a>
            <Link
              to="/natural-stone"
              className="px-5 py-2 rounded-xl font-semibold
                         bg-backnewswhite text-white hover:opacity-90
                         dark:bg-backnewsdark dark:text-marblewhite"
            >
              {t("home.cta.requestQuote")}
            </Link>
          </div>
        </div>

        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
          {bulletKeys.map((key) => (
            <li key={key}>{t(key)}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
