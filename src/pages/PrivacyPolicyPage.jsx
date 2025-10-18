// src/pages/PrivacyPage.jsx
import React from "react";
import { useTranslation } from "react-i18next";

export default function PrivacyPolicyPage() {
  const { t } = useTranslation();
  const today = new Date().toISOString().slice(0, 10);

  const list = (items) => (
    <ul>
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  );

  return (
    <main className="max-w-4xl mx-auto px-4 py-10 prose prose-neutral">
      <h1>{t("legal.privacy.title")}</h1>
      <p>
        <em>{t("legal.lastUpdated", { date: today })}</em>
      </p>

      <h2>{t("legal.privacy.controller")}</h2>
      <p>{t("legal.privacy.controllerText")}</p>

      <h3>{t("legal.privacy.processing")}</h3>
      {list(t("legal.privacy.processingItems", { returnObjects: true }))}

      <h3>{t("legal.privacy.legalBases")}</h3>
      {list(t("legal.privacy.legalBasesItems", { returnObjects: true }))}

      <h3>{t("legal.privacy.cookies")}</h3>
      <p>{t("legal.privacy.cookiesText")}</p>

      <h3>{t("legal.privacy.recipients")}</h3>
      <p>{t("legal.privacy.recipientsText")}</p>

      <h3>{t("legal.privacy.eueea")}</h3>
      <p>{t("legal.privacy.eueeaText")}</p>

      <h3>{t("legal.privacy.retention")}</h3>
      <p>{t("legal.privacy.retentionText")}</p>

      <h3>{t("legal.privacy.rights")}</h3>
      {list(t("legal.privacy.rightsItems", { returnObjects: true }))}

      <h3>{t("legal.privacy.contact")}</h3>
      <p>{t("legal.privacy.contactText")}</p>
    </main>
  );
}
