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

  const tone = kind === "success" ? "border-green-200" : "border-red-200";
  const icon = kind === "success" ? "✅" : "⚠️";

  return (
    <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-[60]">
      <div
        className={`bg-white rounded-lg shadow-xl w-full max-w-md border ${tone}`}
      >
        <div className="p-5">
          <div className="flex items-start gap-3">
            <div className="text-xl">{icon}</div>
            <div className="flex-1">
              <h4 className="text-lg font-semibold mb-1">{title}</h4>
              <p className="text-sm text-gray-600 whitespace-pre-line">
                {message}
              </p>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded bg-black text-white"
            >
              {t("common.ok")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
