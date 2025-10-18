//src/pages/ShippingPolicyPage.jsx
import React from "react";
import { useTranslation } from "react-i18next";

export default function ShippingPolicyPage() {
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
      <h1>{t("legal.shipping.title")}</h1>
      <p>
        <em>{t("legal.lastUpdated", { date: today })}</em>
      </p>

      <h3>{t("legal.shipping.zones")}</h3>
      <p>{t("legal.shipping.zonesText")}</p>

      <h3>{t("legal.shipping.carriers")}</h3>
      <p>{t("legal.shipping.carriersText")}</p>

      <h3>{t("legal.shipping.times")}</h3>
      {list(t("legal.shipping.timesItems", { returnObjects: true }))}

      <h3>{t("legal.shipping.costs")}</h3>
      <p>{t("legal.shipping.costsText")}</p>

      <h3>{t("legal.shipping.risk")}</h3>
      <p>{t("legal.shipping.riskText")}</p>

      <h3>{t("legal.shipping.undeliverable")}</h3>
      <p>{t("legal.shipping.undeliverableText")}</p>
    </main>
  );
}
