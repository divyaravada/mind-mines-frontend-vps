import { useTranslation } from "react-i18next";
//src / components / LowStockBanner.jsx;
export default function LowStockBanner({ stock }) {
  const { t } = useTranslation();
  if (stock == null) return null;
  const n = Number(stock);
  if (n <= 0) {
    return (
      <div className="mt-3 p-3 rounded bg-gray-100 text-gray-800 font-semibold">
        {t("product.lowStockBanner.out")}
      </div>
    );
  }
  if (n < 5) {
    return (
      <div className="mt-3 p-3 rounded bg-amber-100 text-amber-900 font-semibold">
        {t("product.lowStockBanner.low", { count: n })}
      </div>
    );
  }
  return null;
}
