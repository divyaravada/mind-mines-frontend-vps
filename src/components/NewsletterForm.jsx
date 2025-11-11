// src/components/NewsletterForm.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSubscribeNewsletterMutation } from "../features/newsletter/newsletterApi";

export default function NewsletterSection() {
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState("");
  const [accepted, setAccepted] = useState(false);

  const [subscribeNewsletter, { isLoading, isSuccess, isError }] =
    useSubscribeNewsletterMutation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!accepted || !email) return;
    try {
      await subscribeNewsletter({
        email,
        language: i18n.language || "en",
      }).unwrap();
      setEmail("");
      setAccepted(false);
    } catch {
      // isError state will render below
    }
  };

  return (
    <div className="bg-backnewswhite dark:bg-backnewsdark text-marbleblack dark:text-marblewhite rounded-xl p-4 mb-4">
      <h2 className="font-bold text-lg mb-2">{t("footer.newsletter.title")}</h2>
      <p className="text-xs mb-3">{t("footer.newsletter.text")}</p>

      {isSuccess ? (
        <div className="text-green-700 dark:text-green-200 font-semibold py-2">
          {t("footer.newsletter.successMessage")}
        </div>
      ) : (
        <form className="flex flex-col gap-2" onSubmit={handleSubmit}>
          <input
            type="email"
            className="rounded px-3 py-2 bg-marblewhite text-marbleblack placeholder-gray-500 dark:bg-gray-800 dark:text-marblewhite dark:placeholder-gray-400 text-sm border border-black/10 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-marbleblack/20 dark:focus:ring-white/20"
            placeholder={t("footer.newsletter.emailPlaceholder")}
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
          />

          <label className="text-xs flex gap-1 text-nowrap truncate">
            <input
              type="checkbox"
              required
              checked={accepted}
              onChange={() => setAccepted((a) => !a)}
              className="mt-0.5"
            />
            {t("footer.newsletter.note")}{" "}
            <Link to="/privacy" className="underline underline-offset-2">
              {t("footer.newsletter.privacy")}
            </Link>
            {t("footer.newsletter.end")}
          </label>

          <button
            type="submit"
            disabled={!accepted || isLoading}
            className="bg-marbleblack text-white dark:bg-marblewhite dark:text-marbleblack border border-transparent dark:border-transparent py-2 rounded hover:opacity-90 transition disabled:opacity-60"
          >
            {isLoading
              ? t("footer.newsletter.sending") || "Subscribing..."
              : t("footer.newsletter.subscribeButton")}
          </button>

          {isError && (
            <div className="text-red-700 dark:text-red-400 font-semibold mt-2">
              {t("footer.newsletter.errorMessage")}
            </div>
          )}
        </form>
      )}
    </div>
  );
}
