// src/components/ContactForm.jsx
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSendContactMutation } from "../features/contact/contactApi";

const PHONE = "+491704658188";
const WHATSAPP = "+491704658188";
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP.replace(/\D/g, "")}`;
const PHONE_LINK = `tel:${PHONE}`;
const SUPPORT_EMAIL = "service@mindmines.eu";

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
      /* handled by flags */
    }
  };

  return (
    <div className="w-full py-14 bg-gradient-to-b from-gray-100 via-marblewhite to-marblewhite dark:from-gray-900 dark:via-marbleblack dark:to-marbleblack">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <h2 className="text-3xl font-bold mb-2 text-backnewswhite dark:text-backnewsdark">
          {t("about.contactHeading")}
        </h2>
        <p className="mb-7 text-gray-700 dark:text-gray-300">
          {t("about.contactSub")}
        </p>

        {/* Direct contact cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {/* WhatsApp */}
          <a
            href={WHATSAPP_LINK}
            target="_blank"
            rel="noreferrer"
            className="block rounded-2xl bg-white dark:bg-gray-800 p-4 shadow border border-black/5 dark:border-white/10 hover:shadow-md transition focus:outline-none focus-visible:ring-2 focus-visible:ring-backnewswhite dark:focus-visible:ring-backnewsdark"
          >
            <div className="flex items-center gap-3">
              <span className="font-bold text-gray-900 dark:text-gray-100">
                {t("about.whatsapp")}
              </span>
              <span className="text-xs opacity-70 ml-auto text-gray-700 dark:text-gray-300">
                {t("about.hoursValue")}
              </span>
            </div>
            <div className="text-sm opacity-80 mt-1 text-gray-800 dark:text-gray-200">
              {WHATSAPP}
            </div>
          </a>

          {/* Phone */}
          <a
            href={PHONE_LINK}
            className="block rounded-2xl bg-white dark:bg-gray-800 p-4 shadow border border-black/5 dark:border-white/10 hover:shadow-md transition focus:outline-none focus-visible:ring-2 focus-visible:ring-backnewswhite dark:focus-visible:ring-backnewsdark"
          >
            <div className="flex items-center gap-3">
              <span className="font-bold text-gray-900 dark:text-gray-100">
                {t("about.phone")}
              </span>
              <span className="text-xs opacity-70 ml-auto text-gray-700 dark:text-gray-300">
                {t("about.hoursValue")}
              </span>
            </div>
            <div className="text-sm opacity-80 mt-1 text-gray-800 dark:text-gray-200">
              {PHONE}
            </div>
          </a>

          {/* Email */}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="block rounded-2xl bg-white dark:bg-gray-800 p-4 shadow border border-black/5 dark:border-white/10 hover:shadow-md transition focus:outline-none focus-visible:ring-2 focus-visible:ring-backnewswhite dark:focus-visible:ring-backnewsdark"
          >
            <div className="flex items-center gap-3">
              <span className="font-bold text-gray-900 dark:text-gray-100">
                {t("about.emailLabel")}
              </span>
              <span className="text-xs opacity-70 ml-auto text-gray-700 dark:text-gray-300">
                {t("about.hoursValue")}
              </span>
            </div>
            <div className="text-sm opacity-80 mt-1 text-gray-800 dark:text-gray-200">
              {SUPPORT_EMAIL}
            </div>
          </a>
        </div>

        {/* Address */}
        <div className="rounded-2xl bg-white dark:bg-gray-800 p-4 shadow border border-black/5 dark:border-white/10 mb-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-bold text-gray-900 dark:text-gray-100">
              {t("about.address")}:
            </span>
            <span className="opacity-80 text-gray-800 dark:text-gray-200">
              {t("about.addressValue")}
            </span>
          </div>
        </div>

        {isSuccess ? (
          <div className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded p-6 text-center font-semibold">
            {t("about.success")}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <label className="block font-semibold mb-2 text-gray-900 dark:text-gray-100">
                  {t("about.name")}
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  className="w-full border border-black/10 dark:border-white/10 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-backnewswhite dark:focus:ring-backnewsdark"
                />
              </div>
              <div className="flex-1">
                <label className="block font-semibold mb-2 text-gray-900 dark:text-gray-100">
                  {t("about.email")}
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  className="w-full border border-black/10 dark:border-white/10 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-backnewswhite dark:focus:ring-backnewsdark"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-2 text-gray-900 dark:text-gray-100">
                {t("about.message")}
              </label>
              <textarea
                name="message"
                value={form.message}
                onChange={handleChange}
                required
                className="w-full border border-black/10 dark:border-white/10 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-backnewswhite dark:focus:ring-backnewsdark min-h-[120px]"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center justify-center px-8 py-2 rounded font-semibold transition
                         bg-backnewswhite text-white hover:opacity-90
                         dark:bg-backnewsdark dark:text-marblewhite
                         disabled:opacity-60"
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
