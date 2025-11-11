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
      : "border-red-300 dark:border-red-800";
  const icon = kind === "success" ? "✅" : "⚠️";

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] px-4">
      <div
        className={`bg-marblewhite dark:bg-marbleblack rounded-2xl shadow-xl w-full max-w-md border ${toneBorder}`}
      >
        <div className="p-5">
          <div className="flex items-start gap-3">
            <div className="text-xl">{icon}</div>
            <div className="flex-1">
              <h4 className="text-lg font-semibold mb-1 text-backnewswhite dark:text-backnewsdark">
                {title}
              </h4>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                {message}
              </p>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded bg-backnewswhite text-white hover:opacity-90 dark:bg-backnewsdark dark:text-marblewhite"
            >
              {t("common.ok")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
