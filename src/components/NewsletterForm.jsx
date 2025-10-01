// src/components/NewsletterForm.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSubscribeNewsletterMutation } from "../features/newsletter/newsletterApi";

export default function NewsletterSection() {
  const { t } = useTranslation();

  const [email, setEmail] = useState("");
  const [accepted, setAccepted] = useState(false);

  const [subscribeNewsletter, { isLoading, isSuccess, isError }] =
    useSubscribeNewsletterMutation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!accepted || !email) return;
    try {
      await subscribeNewsletter(email).unwrap();
      setEmail("");
      setAccepted(false);
    } catch {
      // isError state will render below
    }
  };

  return (
    <div className="bg-backnewswhite dark:bg-backnewsdark  text-marbleblack dark:text-gray-200 rounded-xl p-4 mb-4">
      <h2 className="font-bold text-lg mb-2">{t("footer.newsletter.title")}</h2>
      <p className="text-xs  mb-2">{t("footer.newsletter.text")}</p>

      {isSuccess ? (
        <div className="text-green-700  dark:text-green-200 font-semibold py-2">
          {t("footer.newsletter.successMessage")}
        </div>
      ) : (
        <form className="flex flex-col gap-2" onSubmit={handleSubmit}>
          <input
            type="email"
            className="rounded  px-3 py-2 bg-marblewhite/90 text-marbleblack dark:bg-gray-800 dark:text-marblewhite text-sm"
            placeholder={t("footer.newsletter.emailPlaceholder")}
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
          />

          <label className="text-xs  flex gap-1 text-nowrap turncate ">
            <input
              type="checkbox"
              required
              checked={accepted}
              onChange={() => setAccepted((a) => !a)}
              className="mt-1"
            />
            {t("footer.newsletter.note")}{" "}
            <Link to="/privacy" className="underline">
              {t("footer.newsletter.privacy")}
            </Link>
            {t("footer.newsletter.end")}
          </label>

          <button
            type="submit"
            disabled={!accepted || isLoading}
            className="bg-marblewhite text-marbleblack dark:bg-marbleblack dark:text-marblewhite border border-marbleblack dark:border-marblewhite py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition"
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
