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
  const [email, setEmail] = useState(""); // only for guests
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
      // handled by isError + error display
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
    <form onSubmit={submit} className="grid gap-3 max-w-md">
      {presetStoneType ? (
        <div className="text-sm">
          <span className="font-medium">{t("enquiry.stoneType")}:</span>{" "}
          <span className="inline-block rounded bg-gray-200 px-2 py-0.5">
            {presetStoneType}
          </span>
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium" htmlFor="stoneType">
            {t("enquiry.stoneType")}
          </label>
          <input
            id="stoneType"
            value={stoneType}
            onChange={(e) => setStoneType(e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder={t("enquiry.placeholders.stoneType")}
            required
          />
          {showFieldError("stone_type")}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium" htmlFor="name">
          {t("enquiry.name")}
        </label>
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border rounded px-3 py-2"
          placeholder={t("enquiry.placeholders.name")}
          required
        />
        {showFieldError("name")}
      </div>

      {!isAuthenticated && (
        <div>
          <label className="block text-sm font-medium" htmlFor="email">
            {t("enquiry.email")}
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder={t("enquiry.placeholders.email")}
            required
          />
          {showFieldError("email")}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium" htmlFor="message">
          {t("enquiry.message")}
        </label>
        <textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full border rounded px-3 py-2"
          rows={4}
          placeholder={t("enquiry.placeholders.message")}
          required
        />
        {showFieldError("message")}
      </div>

      {fieldErrors?.detail && (
        <div className="text-red-600">{String(fieldErrors.detail)}</div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-60"
        aria-busy={isLoading}
      >
        {isLoading ? t("enquiry.sending") : t("enquiry.send")}
      </button>

      {isSuccess && (
        <div className="text-green-700">{t("enquiry.success")}</div>
      )}
      {isError && !Object.keys(fieldErrors).length && (
        <div className="text-red-600">{t("enquiry.genericError")}</div>
      )}
    </form>
  );
}

StoneEnquiryForm.propTypes = {
  isAuthenticated: PropTypes.bool.isRequired,
  presetStoneType: PropTypes.string,
  onSuccess: PropTypes.func,
};
