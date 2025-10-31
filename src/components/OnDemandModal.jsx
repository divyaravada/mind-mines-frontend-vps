import { useEffect } from "react";

export default function OnDemandModal({
  open,
  onClose,
  onSubmit,
  initialEmail,
  productId,
}) {
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
      <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-lg">
        <h2 className="text-lg font-semibold mb-1">Order on demand</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          Tell us how many you need and any notes. We’ll email you shortly.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium">
              Your name (optional)
            </label>
            <input
              name="name"
              className="mt-1 w-full border rounded px-3 py-2 dark:bg-gray-800"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Email</label>
            <input
              name="email"
              type="email"
              required
              defaultValue={initialEmail || ""}
              className="mt-1 w-full border rounded px-3 py-2 dark:bg-gray-800"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Quantity</label>
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
              Purpose / message
            </label>
            <textarea
              name="message"
              rows={4}
              placeholder="e.g., office decor for lobby; need by mid-November"
              className="mt-1 w-full border rounded px-3 py-2 dark:bg-gray-800"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded border dark:border-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded bg-marbleblack text-white hover:bg-black"
            >
              Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
