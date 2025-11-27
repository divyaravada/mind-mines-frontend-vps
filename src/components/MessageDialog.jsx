// src/components/MessageDialog.jsx
import { useTranslation } from "react-i18next";

export default function MessageDialog({
  open,
  title,
  message,
  kind = "success",
  onClose,
}) {
  const { t } = useTranslation();
  if (!open) return null;

  const toneBorder =
    kind === "success"
      ? "border-green-300 dark:border-green-800"
      : kind === "error"
      ? "border-red-300 dark:border-red-800"
      : "border-gray-300 dark:border-gray-700";

  const toneBg =
    kind === "success"
      ? "bg-green-50 dark:bg-green-950/60"
      : kind === "error"
      ? "bg-red-50 dark:bg-red-950/60"
      : "bg-gray-50 dark:bg-gray-900/60";

  const toneIcon = kind === "success" ? "✅" : kind === "error" ? "⚠️" : "ℹ️";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center px-4"
      aria-modal="true"
      role="alertdialog"
    >
      <div
        className="fixed inset-0 bg-black/40 dark:bg-black/70"
        onClick={onClose}
      />
      <div
        className={`relative max-w-md w-full rounded-2xl shadow-2xl ${toneBg} border ${toneBorder} p-5 sm:p-6`}
      >
        <div className="flex items-start gap-3">
          <div className="text-xl sm:text-2xl">{toneIcon}</div>
          <div className="flex-1">
            {title && (
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-1">
                {title}
              </h3>
            )}
            {message && (
              <p className="text-sm sm:text-base text-gray-700 dark:text-gray-200 whitespace-pre-line">
                {message}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-backnewswhite text-marbleblack hover:opacity-90 dark:bg-backnewsdark dark:text-marblewhite"
          >
            {t("common.ok")}
          </button>
        </div>
      </div>
    </div>
  );
}
