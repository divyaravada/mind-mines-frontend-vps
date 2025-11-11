// src/components/InstallmentsSchedulePreview.jsx
import React from "react";
import { useTranslation } from "react-i18next";

export default function InstallmentsSchedulePreview({
  months,
  total,
  serverSchedule,
}) {
  const { t } = useTranslation();
  const amounts = serverSchedule?.amounts?.map(Number);
  const dates = serverSchedule?.dates;
  let rows = [];

  if (amounts && dates && amounts.length === dates.length) {
    rows = amounts.map((a, i) => ({ amount: a, date: dates[i] }));
  } else if (months && total != null) {
    const cents = Math.round(Number(total) * 100);
    const base = Math.floor(cents / months);
    const rem = cents - base * months;
    const parts = Array.from({ length: months }, (_, i) =>
      i === months - 1 ? base + rem : base
    );
    rows = parts.map((c, i) => {
      const dt = new Date();
      dt.setMonth(dt.getMonth() + i);
      return {
        amount: (c / 100).toFixed(2),
        date: dt.toISOString().slice(0, 10),
      };
    });
  }

  return (
    <div className="border border-black/10 dark:border-white/10 rounded-xl p-4 mt-2 text-sm bg-white dark:bg-gray-800">
      <div className="font-semibold mb-3 text-backnewswhite dark:text-backnewsdark">
        {t("installments.summaryTitle")}
      </div>

      <div className="grid grid-cols-2 gap-y-1">
        {rows.map((r, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between px-2 py-1 rounded even:bg-black/[0.03] dark:even:bg-white/[0.06]"
          >
            <span className="text-gray-800 dark:text-gray-100">{r.date}</span>
            <span className="text-gray-900 dark:text-gray-100">
              {t("installments.amountEuro", {
                amount: Number(r.amount).toFixed(2),
              })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
