//src / components / LowStockBanner.jsx;
import { useTranslation } from "react-i18next";

export default function LowStockBanner({ stock }) {
  const { t } = useTranslation();
  if (stock == null) return null;

  const n = Number(stock);

  if (n <= 0) {
    return (
      <div className="mt-3 p-3 rounded border border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200 font-semibold">
        {t("product.lowStockBanner.out")}
      </div>
    );
  }

  if (n < 5) {
    return (
      <div className="mt-3 p-3 rounded border border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200 font-semibold">
        {t("product.lowStockBanner.low", { count: n })}
      </div>
    );
  }

  return null;
}
