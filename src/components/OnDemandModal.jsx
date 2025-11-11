import { useTranslation } from "react-i18next";
import { useEffect } from "react";

export default function OnDemandModal({
  open,
  onClose,
  onSubmit,
  initialEmail,
  productId,
}) {
  const { t } = useTranslation();
  // close on ESC
  useEffect(() => {
    // if modal isn't open, don't attach listener
    if (!open) return;
    const h = (e) => {
      if (e.key === "Escape") {
        onClose?.();
      }
    };
    window.addEventListener("keydown", h);
    return () => {
      window.removeEventListener("keydown", h);
    };
  }, [open, onClose]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      product: productId,
      name: (fd.get("name") || "").trim(),
      email: (fd.get("email") || "").trim(),
      quantity: Number(fd.get("quantity") || 1),
      message: (fd.get("message") || "").trim(),
    };
    onSubmit?.(payload);
  };

  // If not open, render nothing AFTER hooks ran
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-[92%] sm:w-full max-w-md rounded-2xl bg-marblewhite dark:bg-marbleblack p-6 shadow-lg text-gray-900 dark:text-gray-100">
        <h2 className="text-lg font-semibold mb-1 text-backnewswhite dark:text-backnewsdark">
          {t("onDemand.title")}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          {t("onDemand.description")}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium">
              {t("onDemand.nameLabel")}
            </label>
            <input
              name="name"
              className="mt-1 w-full border border-gray-200 dark:border-gray-700 rounded px-3 py-2 bg-white dark:bg-gray-800"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">
              {t("onDemand.emailLabel")}
            </label>
            <input
              name="email"
              type="email"
              required
              defaultValue={initialEmail || ""}
              className="mt-1 w-full border border-gray-200 dark:border-gray-700 rounded px-3 py-2 bg-white dark:bg-gray-800"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">
              {t("onDemand.quantityLabel")}
            </label>
            <input
              name="quantity"
              type="number"
              min={1}
              defaultValue={1}
              required
              className="mt-1 w-32 border rounded px-3 py-2 dark:bg-gray-800"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">
              {t("onDemand.messageLabel")}
            </label>
            <textarea
              name="message"
              rows={4}
              placeholder={t("onDemand.messagePlaceholder")}
              className="mt-1 w-full border border-gray-200 dark:border-gray-700 rounded px-3 py-2 bg-white dark:bg-gray-800"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded border border-gray-300 dark:border-gray-700"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded bg-backnewswhite text-white hover:opacity-90 dark:bg-backnewsdark dark:text-marbleblack"
            >
              {t("common.submit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
