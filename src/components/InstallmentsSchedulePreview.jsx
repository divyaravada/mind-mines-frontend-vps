// src/components/InstallmentsSchedulePreview.jsx
import React from "react";

export default function InstallmentsSchedulePreview({
  months,
  total,
  serverSchedule,
}) {
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
    <div className="border rounded p-3 mt-2 text-sm">
      <div className="font-medium mb-2">Installment plan summary</div>
      <div className="grid grid-cols-2 gap-1">
        {rows.map((r, idx) => (
          <div key={idx} className="flex items-center justify-between">
            <span>{r.date}</span>
            <span>€ {Number(r.amount).toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
