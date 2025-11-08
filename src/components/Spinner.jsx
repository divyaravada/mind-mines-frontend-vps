import { useTranslation } from "react-i18next";
export default function Spinner({ size = 24, className = "", ariaLabel }) {
  const { t } = useTranslation();
  const label = ariaLabel || t("common.loading");
  return (
    <div
      className={
        "inline-block animate-spin rounded-full border-2 border-gray-300 border-t-gray-900 " +
        className
      }
      style={{
        width: size,
        height: size,
        borderTopColor: "rgb(17 24 39)", // gray-900 fallback
      }}
      aria-label={label}
    />
  );
}
