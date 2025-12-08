// src/components/Footer.jsx
import { Link } from "react-router-dom";
import { Globe } from "lucide-react";
import DarkLogo from "../assets/BlackLogo.webp";
import LightLogo from "../assets/OrangeLogo.webp";
import paypal from "../assets/paypal.svg";
import visa from "../assets/visa.png";
import mastercard from "../assets/master.png";
import sepa from "../assets/sepa.png";
import klarna from "../assets/klarna.png";
import dhl from "../assets/dhl.png";
import dpdLight from "../assets/dpd.png";
import dpdDark from "../assets/dpd-dark.png";
import hermes from "../assets/hermes.png";
import { useTranslation } from "react-i18next";
import NewsletterSection from "./NewsletterForm";
import { useDispatch, useSelector } from "react-redux";

export default function Footer() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const current = useSelector((s) => s.i18n.lang);
  const { setLanguage } = require("../features/i18n/i18nSlice");

  return (
    <footer className="bg-marblewhite dark:bg-marbleblack border-t border-black/10 dark:border-white/10 pt-8 pb-0 px-4">
      <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-8">
        {/* About */}
        <div>
          <h2 className="text-lg mb-4 text-backnewswhite dark:text-backnewsdark font-bold">
            {t("footer.welcomeTitle")}
          </h2>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-6">
            {t("footer.welcomeText")}
          </p>

          <img
            src={LightLogo}
            alt="MindMines"
            className="h-24 w-auto block dark:hidden"
            fetchPriority="high"
            loading="lazy"
            decoding="async"
          />
          <img
            src={DarkLogo}
            alt="MindMines"
            className="h-24 w-auto hidden dark:block"
            fetchPriority="high"
            loading="lazy"
            decoding="async"
          />
        </div>

        {/* Help & Contact */}
        <div>
          <h1 className="text-lg mb-4 text-backnewswhite dark:text-backnewsdark font-bold">
            {t("footer.help.title")}
          </h1>
          <ul className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
            <li>
              <Link to="/guest-order" className="hover:underline">
                {t("footer.help.track")}
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
              {t("footer.help.emailtitle")}{" "}
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
          <ul className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
            <li>
              <Link to="/imprint" className="hover:underline">
                {t("legal.nav.imprint")}
              </Link>
            </li>
            <li>
              <Link to="/terms" className="hover:underline">
                {t("legal.nav.terms")}
              </Link>
            </li>
            <li>
              <Link to="/privacy" className="hover:underline">
                {t("legal.nav.privacy")}
              </Link>
            </li>
            <li>
              <Link to="/returns" className="hover:underline">
                {t("legal.nav.returns")}
              </Link>
            </li>
            <li>
              <Link to="/cookies" className="hover:underline">
                {t("legal.nav.cookies")}
              </Link>
            </li>
            <li>
              <Link to="/shipping" className="hover:underline">
                {t("legal.nav.shipping")}
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
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between border-t border-black/10 dark:border-white/10 mt-8 pt-4 px-2 gap-4">
        <div className="flex items-center gap-3">
          <span className="text-sm md:text-base text-backnewswhite dark:text-backnewsdark font-bold">
            {t("footer.secure")}
          </span>
          <img
            src={paypal}
            alt="PayPal"
            className="h-8 md:h-10"
            fetchPriority="high"
            loading="lazy"
            decoding="async"
          />
          <img
            src={klarna}
            alt="PayPal"
            className="h-8 md:h-10"
            fetchPriority="high"
            loading="lazy"
            decoding="async"
          />
          <img
            src={sepa}
            alt="PayPal"
            className="h-8 md:h-10"
            fetchPriority="high"
            loading="lazy"
            decoding="async"
          />
          <img
            src={visa}
            alt="PayPal"
            className="h-8 md:h-10"
            fetchPriority="high"
            loading="lazy"
            decoding="async"
          />
          <img
            src={mastercard}
            alt="PayPal"
            className="h-8 md:h-10"
            fetchPriority="high"
            loading="lazy"
            decoding="async"
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-backnewswhite dark:text-backnewsdark font-bold">
            {t("footer.shipping")}
          </span>
          <img
            src={dhl}
            alt="DHL"
            className="h-6"
            fetchPriority="high"
            loading="lazy"
            decoding="async"
          />
          <img
            src={dpdLight}
            alt="DPD"
            className="h-6 dark:hidden"
            fetchPriority="high"
            loading="lazy"
            decoding="async"
          />
          <img
            src={dpdDark}
            alt="DPD"
            className="h-6 hidden dark:inline-block"
            fetchPriority="high"
            loading="lazy"
            decoding="async"
          />

          <img
            src={hermes}
            alt="Hermes"
            className="h-6"
            fetchPriority="high"
            loading="lazy"
            decoding="async"
          />
        </div>
      </div>

      {/* Bottom bar */}
      <div className="mt-4 border-t border-black/10 dark:border-white/10">
        <div className="max-w-7xl mx-auto py-3 px-2 flex flex-col md:flex-row gap-2 md:gap-4 items-center justify-between text-xs">
          <div className="text-center md:text-left text-gray-700 dark:text-gray-300">
            {t("footer.start")} {new Date().getFullYear()}{" "}
            {t("footer.rightreserv")}{" "}
            <Link to="/imprint" className="underline hover:opacity-80">
              {t("legal.nav.imprint")}
            </Link>{" "}
            |{" "}
            <Link to="/terms" className="underline hover:opacity-80">
              {t("legal.nav.terms")}
            </Link>{" "}
            |{" "}
            <Link to="/privacy" className="underline hover:opacity-80">
              {t("legal.nav.privacy")}
            </Link>{" "}
            |{" "}
            <Link to="/returns" className="underline hover:opacity-80">
              {t("legal.nav.returns")}
            </Link>{" "}
            |{" "}
            <Link to="/shipping" className="underline hover:opacity-80">
              {t("legal.nav.shipping")}
            </Link>
          </div>

          <div className="flex items-center gap-2 text-backnewswhite dark:text-backnewsdark">
            <button
              onClick={() => window.openCookieManager?.()}
              className="hover:underline"
            >
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
