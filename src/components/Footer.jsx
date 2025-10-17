import { Link } from "react-router-dom";
import { Globe, Landmark } from "lucide-react";
import DarkLogo from "../assets/BlackLogo.jpg";
import LightLogo from "../assets/OrangeLogo.jpg";
import paypal from "../assets/paypal.svg";
import dhl from "../assets/dhl.svg";
import dpd from "../assets/dpd.png";
import hermes from "../assets/hermes.svg.png";
import { useTranslation } from "react-i18next";
import NewsletterSection from "./NewsletterForm";
import { useDispatch, useSelector } from "react-redux";

export default function Footer() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const current = useSelector((s) => s.i18n.lang);
  const { setLanguage } = require("../features/i18n/i18nSlice");

  return (
    <footer className="bg-marblewhite dark:bg-marbleblack border-t border-gray-200 dark:border-gray-800 pt-8 pb-0 px-4 ">
      <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-8">
        {/* About */}
        <div>
          <h2 className="text-lg mb-4 text-backnewswhite dark:text-backnewsdark font-bold">
            {t("footer.welcomeTitle")}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
            {t("footer.welcomeText")}
          </p>

          <img
            src={LightLogo}
            alt="MindMines"
            className="h-24 w-auto block dark:hidden"
          />
          <img
            src={DarkLogo}
            alt="MindMines"
            className="h-20 w-auto hidden dark:block"
          />
        </div>

        {/* Help & Contact */}
        <div>
          <h2 className="text-lg mb-4 text-backnewswhite dark:text-backnewsdark font-bold">
            {t("footer.help.title")}
          </h2>
          <ul className="text-sm space-y-1 text-gray-700 dark:text-gray-200">
            <li>
              <Link to="/orders" className="hover:underline">
                {t("footer.help.order")}
              </Link>
            </li>
            <li>
              <Link to="/track" className="hover:underline">
                {t("footer.help.track")}
              </Link>
            </li>
            <li>
              <Link to="/returns" className="hover:underline">
                {t("footer.help.returnOrder")}
              </Link>
            </li>
            <li>
              <Link to="/help" className="hover:underline">
                {t("footer.help.allTopics")}
              </Link>
            </li>
            <li>
              {t("footer.help.contact")}{" "}
              <a href="tel:+49" className="hover:underline">
                {t("footer.help.contactno")}
              </a>
            </li>
            <li>{t("footer.help.timings")}</li>
            <li>
              {t("footer.help.emailtitle")}
              <a
                href="mailto:service@marbleart.com"
                className="hover:underline"
              >
                {t("footer.help.email")}
              </a>
            </li>
            <li>{t("footer.help.address")}</li>
          </ul>
        </div>

        {/* Legal & Info */}
        <div>
          <h2 className="text-lg mb-4 text-backnewswhite dark:text-backnewsdark font-bold">
            {t("footer.legal.title")}
          </h2>
          <ul className="text-sm space-y-1 text-gray-700 dark:text-gray-200">
            <li>
              <Link to="/imprint" className="hover:underline">
                {t("footer.legal.imprint")}
              </Link>
            </li>
            <li>
              <Link to="/privacy" className="hover:underline">
                {t("footer.legal.data")}
              </Link>
            </li>
            <li>
              <Link to="/terms" className="hover:underline">
                {t("footer.legal.termsConditions")}
              </Link>
            </li>
            <li>
              <Link to="/shipping" className="hover:underline">
                {t("footer.legal.info")}
              </Link>
            </li>
            <li>
              <Link to="/about" className="hover:underline">
                {t("footer.legal.about")}
              </Link>
            </li>
          </ul>
        </div>

        {/* Newsletter */}
        <NewsletterSection />
      </div>

      {/* Payment & Shipping row */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between border-t border-gray-200 dark:border-gray-700 mt-8 pt-4 px-2 gap-4">
        <div className="flex items-center gap-3">
          <span className="text-sm md:text-base text-backnewswhite dark:text-backnewsdark font-bold">
            {t("footer.secure")}
          </span>
          <img src={paypal} alt="PayPal" className="h-10 md:h-14" />
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded border text-xs md:text-sm text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600">
            <Landmark className="w-4 h-4" />
            {t("footer.payment.bank") || "SEPA Bank Transfer"}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-backnewswhite dark:text-backnewsdark font-bold">
            {t("footer.shipping")}
          </span>
          <img src={dhl} alt="DHL" className="h-6" />
          <img src={dpd} alt="DPD" className="h-6" />
          <img src={hermes} alt="Hermes" className="h-6" />
        </div>
      </div>

      {/* Bottom bar */}
      <div className="mt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto py-3 px-2 flex flex-col md:flex-row gap-2 md:gap-4 items-center justify-between text-xs text-backnewswhite dark:text-backnewsdark">
          <div className="text-center md:text-left">
            {t("footer.start")} {new Date().getFullYear()}{" "}
            {t("footer.rightreserv")}{" "}
            <Link to="/imprint" className="underline hover:opacity-80">
              {t("footer.legal.imprint")}
            </Link>{" "}
            |{" "}
            <Link to="/privacy" className="underline hover:opacity-80">
              {t("footer.legal.data")}
            </Link>{" "}
            |{" "}
            <Link to="/terms" className="underline hover:opacity-80">
              {t("footer.legal.shorttcs")}
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => window.openCookieManager?.()}>
              {t("cookies.manage")}
            </button>
            <span className="mx-1">•</span>
            <Globe className="w-4 h-4 inline" />
            <button
              onClick={() => dispatch(setLanguage("de"))}
              className={`hover:underline ${
                current === "de" ? "font-semibold" : ""
              }`}
              aria-label="Deutsch"
            >
              {t("german")}
            </button>
            <span>|</span>
            <button
              onClick={() => dispatch(setLanguage("en"))}
              className={`hover:underline ${
                current === "en" ? "font-semibold" : ""
              }`}
              aria-label="English"
            >
              {t("english")}
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
