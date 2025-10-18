//src/pages/ReturnsPage.jsx
import React from "react";
import { useTranslation } from "react-i18next";

export default function ReturnsPage() {
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
      <h1>{t("legal.returns.title")}</h1>
      <p>
        <em>{t("legal.lastUpdated", { date: today })}</em>
      </p>

      <p>{t("legal.returns.intro")}</p>

      <h3>{t("legal.returns.how")}</h3>
      {list(t("legal.returns.howItems", { returnObjects: true }))}

      <h3>{t("legal.returns.condition")}</h3>
      <p>{t("legal.returns.conditionText")}</p>

      <h3>{t("legal.returns.refunds")}</h3>
      <p>{t("legal.returns.refundsText")}</p>

      <h3>{t("legal.returns.returnAddress")}</h3>
      <p>{t("legal.returns.address")}</p>
    </main>
  );
}
