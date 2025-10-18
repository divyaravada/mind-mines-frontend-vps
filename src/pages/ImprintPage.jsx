// src/pages/ImprintPage.jsx
import React from "react";
import { useTranslation } from "react-i18next";

export default function ImprintPage() {
  const { t } = useTranslation();
  const today = new Date().toISOString().slice(0, 10);

  return (
    <main className="max-w-4xl mx-auto px-4 py-10 prose prose-neutral">
      <h1>{t("legal.imprint.title")}</h1>
      <p>
        <em>{t("legal.lastUpdated", { date: today })}</em>
      </p>

      <section>
        <h2>{t("legal.imprint.company")}</h2>
        <p>
          <strong>{t("legal.imprint.addressLabel")}:</strong>
          <br />
          {t("legal.imprint.address")}
        </p>
        <p>
          <strong>{t("legal.imprint.managingPartners")}:</strong>
          <br />
          {t("legal.imprint.partnersList")}
        </p>
      </section>

      <section>
        <h3>{t("legal.imprint.contact")}</h3>
        <p>
          <strong>{t("legal.imprint.email")}:</strong> info@mindmines.eu
          <br />
          <strong>{t("legal.imprint.supportEmail")}:</strong>{" "}
          support@mindmines.eu
          <br />
          <strong>{t("legal.imprint.whatsapp")}:</strong> +49 170 4658188
        </p>
        <p>
          <strong>{t("legal.imprint.vat")}:</strong>{" "}
          {t("legal.imprint.vatValue")}
        </p>
        <p>
          <strong>{t("legal.imprint.hours")}:</strong>{" "}
          {t("legal.imprint.hoursValue")}
        </p>
        <p>
          <strong>{t("legal.imprint.businessType")}:</strong>{" "}
          {t("legal.imprint.businessTypeValue")}
        </p>
      </section>

      <section>
        <h3>{t("legal.imprint.dispute")}</h3>
        <p>{t("legal.imprint.disputeText")}</p>
      </section>

      <section>
        <h3>{t("legal.imprint.liability")}</h3>
        <p>{t("legal.imprint.liabilityText")}</p>
      </section>
    </main>
  );
}
