import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSendContactMutation } from "../features/contact/contactApi";

const PHONE = "+491704658288";
const WHATSAPP = "+491704658188";
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP.replace(/\D/g, "")}`;
const PHONE_LINK = `tel:${PHONE}`;
const SUPPORT_EMAIL = "support@mindmines.eu";

export default function ContactSection() {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    name: "",
    email: "",
    message: "",
    hp: "",
  });

  const [sendContact, { isLoading, isSuccess, isError }] =
    useSendContactMutation();

  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.hp) return; // bot trap
    try {
      await sendContact({
        name: form.name,
        email: form.email,
        message: form.message,
      }).unwrap();
      setForm({ name: "", email: "", message: "", hp: "" });
    } catch {
      /* handled by isError */
    }
  };

  return (
    <div className="w-full py-14 bg-gradient-to-b from-[#eaeaea] via-[#f8fcfe] to-[#f8fcfe] dark:from-gray-900 dark:via-marbleblack dark:to-marbleblack text-backnewswhite dark:text-backnewsdark">
      <div className="max-w-3xl mx-auto px-6">
        <h2 className="text-3xl font-serif font-bold mb-2 text-marbleblack dark:text-white">
          {t("about.contactHeading")}
        </h2>
        <p className="mb-7 text-gray-700 dark:text-gray-300">
          {t("about.contactSub")}
        </p>

        {/* Direct contact cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* WhatsApp */}
          <a
            href={WHATSAPP_LINK}
            target="_blank"
            rel="noreferrer"
            className="block rounded-2xl bg-white dark:bg-gray-800 p-4 shadow border border-gray-100 dark:border-gray-700 hover:shadow-md transition"
          >
            <div className="flex items-center gap-3">
              <span className="font-bold">{t("about.whatsapp")}</span>
              <span className="text-xs opacity-70 ml-auto">
                {t("about.hoursValue")}
              </span>
            </div>
            <div className="text-sm opacity-80 mt-1">{WHATSAPP}</div>
          </a>

          {/* Phone (optional – remove if you don’t use one) */}
          <a
            href={PHONE_LINK}
            className="block rounded-2xl bg-white dark:bg-gray-800 p-4 shadow border border-gray-100 dark:border-gray-700 hover:shadow-md transition"
          >
            <div className="flex items-center gap-3">
              <span className="font-bold">{t("about.phone")}</span>
              <span className="text-xs opacity-70 ml-auto">
                {t("about.hoursValue")}
              </span>
            </div>
            <div className="text-sm opacity-80 mt-1">{PHONE}</div>
          </a>

          {/* Email */}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="block rounded-2xl bg-white dark:bg-gray-800 p-4 shadow border border-gray-100 dark:border-gray-700 hover:shadow-md transition"
          >
            <div className="flex items-center gap-3">
              <span className="font-bold">{t("about.emailLabel")}</span>
              <span className="text-xs opacity-70 ml-auto">
                {t("about.hoursValue")}
              </span>
            </div>
            <div className="text-sm opacity-80 mt-1">{SUPPORT_EMAIL}</div>
          </a>
        </div>

        {/* Address */}
        <div className="rounded-2xl bg-white dark:bg-gray-800 p-4 shadow border border-gray-100 dark:border-gray-700 mb-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-bold">{t("about.address")}:</span>
            <span className="opacity-80">{t("about.addressValue")}</span>
          </div>
        </div>

        {isSuccess ? (
          <div className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded p-6 text-center font-semibold">
            {t("about.success")}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-7">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <label className="block font-bold mb-2">
                  {t("about.name")}
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-marbleblack dark:focus:ring-white"
                />
              </div>
              <div className="flex-1">
                <label className="block font-bold mb-2">
                  {t("about.email")}
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-marbleblack dark:focus:ring-white"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold mb-2">
                {t("about.message")}
              </label>
              <textarea
                name="message"
                value={form.message}
                onChange={handleChange}
                required
                className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-marbleblack dark:focus:ring-white min-h-[100px]"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="px-8 py-2 rounded bg-marbleblack dark:bg-marblewhite dark:text-backnewsdark text-white hover:bg-black/90 font-semibold transition dark:backnewsdark dark:focus:ring-white"
            >
              {isLoading ? t("about.sending") : t("about.send")}
            </button>

            {isError && (
              <div className="text-red-700 dark:text-red-400 font-semibold mt-2">
                {t("about.error")}
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
