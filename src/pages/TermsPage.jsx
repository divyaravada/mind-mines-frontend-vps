// src/pages/TermsPage.jsx
import React from "react";
import { useTranslation } from "react-i18next";

export default function TermsPage() {
  const { t } = useTranslation();
  const today = new Date().toISOString().slice(0, 10);

  return (
    <main className="max-w-4xl mx-auto px-4 py-10 prose prose-neutral">
      <h1>{t("legal.terms.title")}</h1>
      <p>
        <em>{t("legal.lastUpdated", { date: today })}</em>
      </p>

      <h2>{t("legal.terms.scope")}</h2>
      <p>{t("legal.terms.scopeText")}</p>

      <h3>{t("legal.terms.definitions")}</h3>
      <p>{t("legal.terms.definitionsText")}</p>

      <h3>{t("legal.terms.ordering")}</h3>
      <p>{t("legal.terms.orderingText")}</p>

      <h3>{t("legal.terms.pricing")}</h3>
      <p>{t("legal.terms.pricingText")}</p>

      <h3>{t("legal.terms.payment")}</h3>
      <p>{t("legal.terms.paymentText")}</p>

      <h3>{t("legal.terms.shipping")}</h3>
      <p>{t("legal.terms.shippingText")}</p>

      <h3>{t("legal.terms.withdrawal")}</h3>
      <p>{t("legal.terms.withdrawalText")}</p>

      <h3>{t("legal.terms.warranty")}</h3>
      <p>{t("legal.terms.warrantyText")}</p>

      <h3>{t("legal.terms.titleRetention")}</h3>
      <p>{t("legal.terms.titleRetentionText")}</p>

      <h3>{t("legal.terms.liability")}</h3>
      <p>{t("legal.terms.liabilityText")}</p>

      <h3>{t("legal.terms.data")}</h3>
      <p>{t("legal.terms.dataText")}</p>

      <h3>{t("legal.terms.jurisdiction")}</h3>
      <p>{t("legal.terms.jurisdictionText")}</p>

      <h3>{t("legal.terms.final")}</h3>
      <p>{t("legal.terms.finalText")}</p>
    </main>
  );
}
