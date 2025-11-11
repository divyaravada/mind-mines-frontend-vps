// src/components/StoneEnquiryForm.jsx
import { useState } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { useSendStoneEnquiryMutation } from "../features/stones/stonesApi";

export default function StoneEnquiryForm({
  isAuthenticated,
  presetStoneType,
  onSuccess,
}) {
  const { t } = useTranslation();

  const [stoneType, setStoneType] = useState(presetStoneType || "");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const [sendEnquiry, { isLoading, isSuccess, isError, error }] =
    useSendStoneEnquiryMutation();

  const submit = async (e) => {
    e.preventDefault();
    const body = {
      stone_type: presetStoneType || stoneType,
      name,
      message,
      ...(isAuthenticated ? {} : { email }),
    };
    try {
      await sendEnquiry(body).unwrap();
      setName("");
      setEmail("");
      setMessage("");
      if (!presetStoneType) setStoneType("");
      onSuccess?.();
    } catch {
      /* handled by isError + error display */
    }
  };

  const fieldErrors = (() => {
    const data = error?.data;
    if (!data || typeof data !== "object") return {};
    return data;
  })();

  const showFieldError = (key) =>
    fieldErrors?.[key] ? (
      <div className="text-sm text-red-600 mt-1">
        {Array.isArray(fieldErrors[key])
          ? fieldErrors[key].join(", ")
          : String(fieldErrors[key])}
      </div>
    ) : null;

  return (
    <form
      onSubmit={submit}
      className="grid gap-4 max-w-xl w-full p-4 sm:p-6 rounded-xl bg-marblewhite dark:bg-marbleblack shadow"
    >
      {presetStoneType ? (
        <div className="text-sm text-gray-800 dark:text-gray-200">
          <span className="font-semibold">{t("enquiry.stoneType")}:</span>{" "}
          <span className="inline-block rounded px-2 py-0.5 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-100">
            {presetStoneType}
          </span>
        </div>
      ) : (
        <div>
          <label
            className="block text-sm font-medium text-gray-800 dark:text-gray-200"
            htmlFor="stoneType"
          >
            {t("enquiry.stoneType")}
          </label>
          <input
            id="stoneType"
            value={stoneType}
            onChange={(e) => setStoneType(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 outline-none focus:ring-2 focus:ring-backnewswhite"
            placeholder={t("enquiry.placeholders.stoneType")}
            required
          />
          {showFieldError("stone_type")}
        </div>
      )}

      <div>
        <label
          className="block text-sm font-medium text-gray-800 dark:text-gray-200"
          htmlFor="name"
        >
          {t("enquiry.name")}
        </label>
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 outline-none focus:ring-2 focus:ring-backnewswhite"
          placeholder={t("enquiry.placeholders.name")}
          required
        />
        {showFieldError("name")}
      </div>

      {!isAuthenticated && (
        <div>
          <label
            className="block text-sm font-medium text-gray-800 dark:text-gray-200"
            htmlFor="email"
          >
            {t("enquiry.email")}
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 outline-none focus:ring-2 focus:ring-backnewswhite"
            placeholder={t("enquiry.placeholders.email")}
            required
          />
          {showFieldError("email")}
        </div>
      )}

      <div>
        <label
          className="block text-sm font-medium text-gray-800 dark:text-gray-200"
          htmlFor="message"
        >
          {t("enquiry.message")}
        </label>
        <textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 outline-none focus:ring-2 focus:ring-backnewswhite"
          rows={4}
          placeholder={t("enquiry.placeholders.message")}
          required
        />
        {showFieldError("message")}
      </div>

      {fieldErrors?.detail && (
        <div className="text-red-600 dark:text-red-400">
          {String(fieldErrors.detail)}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="inline-flex justify-center items-center rounded-md px-4 py-2 font-semibold text-white bg-backnewswhite hover:brightness-95 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-backnewswhite"
        aria-busy={isLoading}
      >
        {isLoading ? t("enquiry.sending") : t("enquiry.send")}
      </button>

      {isSuccess && (
        <div className="text-green-700 dark:text-green-400">
          {t("enquiry.success")}
        </div>
      )}
      {isError && !Object.keys(fieldErrors).length && (
        <div className="text-red-600 dark:text-red-400">
          {t("enquiry.genericError")}
        </div>
      )}
    </form>
  );
}

StoneEnquiryForm.propTypes = {
  isAuthenticated: PropTypes.bool.isRequired,
  presetStoneType: PropTypes.string,
  onSuccess: PropTypes.func,
};
