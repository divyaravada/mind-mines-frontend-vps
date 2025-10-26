// src/components/OrderDialog.jsx
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
// If you followed my earlier advice, use the axios client with auth:
import http from "../services/http"; // <-- change to `../services/api` if that's your axios instance
import MessageDialog from "./MessageDialog";
import { toAbsoluteUrl } from "../utils/urls";

function formatMoney(v, locale = "en") {
  let n =
    typeof v === "number"
      ? v
      : parseFloat(
          String(v)
            .replace(/[^\d.,-]/g, "")
            .replace(",", ".")
        );
  if (!Number.isFinite(n)) n = 0;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "EUR",
    }).format(n);
  } catch {
    return `${n.toFixed(2)} €`;
  }
}

function parseDateLoose(v) {
  if (!v) return null;
  const d1 = new Date(v);
  if (!isNaN(d1.getTime())) return d1;

  const m = String(v).match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/
  );
  if (m) {
    const [, Y, M, D, h, mi, s] = m;
    const d2 = new Date(+Y, +M - 1, +D, +h, +mi, +(s || 0));
    if (!isNaN(d2.getTime())) return d2;
  }

  const ep = Number(v);
  if (Number.isFinite(ep)) {
    const d3 = new Date(ep);
    if (!isNaN(d3.getTime())) return d3;
  }
  return null;
}

export default function OrderDialog({ orderId, open, onClose }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language || "en";
  const lang = i18n.language?.startsWith("de") ? "de" : "en";

  // --- Load order via RTKQ ---
  const {
    data: order,
    isFetching,
    isError,
  } = useGetOrderQuery(orderId, {
    skip: !open || !orderId,
  });

  // mutations
  const [requestCancel, { isLoading: canceling }] = useRequestCancelMutation();
  const [requestReturn, { isLoading: returning }] = useRequestReturnMutation();

  // Cancel modal state
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelMsg, setCancelMsg] = useState("");
  const cancelMsgTrimmed = cancelMsg.trim();

  /// Return modal state
  const [retOpen, setRetOpen] = useState(false);
  const [retMsg, setRetMsg] = useState("");
  const retMsgTrimmed = retMsg.trim();
  const [retFiles, setRetFiles] = useState([]);
  const [retFilesError, setRetFilesError] = useState("");

  const MAX_UPLOAD_MB = 10;
  const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

  // Toast/message dialog
  const [msgOpen, setMsgOpen] = useState(false);
  const [msgKind, setMsgKind] = useState("success"); // "success" | "error"
  const [msgTitle, setMsgTitle] = useState("");
  const [msgText, setMsgText] = useState("");

  function showMessage(title, text, kind = "success") {
    setMsgTitle(title);
    setMsgText(text);
    setMsgKind(kind);
    setMsgOpen(true);
  }

  // Load order details when opened
  useEffect(() => {
    if (!open) {
      setCancelOpen(false);
      setRetOpen(false);
      setCancelMsg("");
      setRetMsg("");
      setRetFiles([]);
      setRetFilesError("");
    }
  }, [open]);

  if (!open || !orderId) return null;

  const productTitle = (p) =>
    (lang === "de" ? p?.title_de : p?.title_en) ||
    p?.title_en ||
    p?.title_de ||
    t("order.item");

  const totalQty = useMemo(
    () => order?.items?.reduce((sum, it) => sum + (it.quantity || 0), 0) ?? 0,
    [order]
  );

  const isDelivered = order?.status === "delivered";
  const isPaidOrLater =
    order?.status === "paid" ||
    order?.status === "shipped" ||
    order?.status === "delivered";
  const isBeforePaid =
    order?.status === "pending" || order?.status === "processing";
  const showInvoice = !!order?.invoice_pdf;

  const deliveredAt =
    order && order.status === "delivered"
      ? parseDateLoose(order.delivered_at || null) ||
        parseDateLoose(order.created_at || null)
      : null;

  const ageDays = deliveredAt
    ? Math.floor((Date.now() - deliveredAt.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const RETURN_WINDOW_DAYS = 15;
  const showReturnBtn = !!order && isDelivered;
  const returnDisabled =
    typeof ageDays === "number" ? ageDays > RETURN_WINDOW_DAYS : true;
  const daysLeft =
    typeof ageDays === "number"
      ? Math.max(0, RETURN_WINDOW_DAYS - ageDays)
      : null;

  const showCancelBtn = !!order && isBeforePaid;
  const showDownload = !!order && isPaidOrLater && showInvoice;

  // ---------- Return validation ----------
  const totalBytes = (files) =>
    files.reduce((sum, f) => sum + (f?.size || 0), 0);
  const hasFiles = retFiles.length > 0;
  const filesSizeOk = totalBytes(retFiles) <= MAX_UPLOAD_BYTES;
  const hasReason = !!retMsgTrimmed;
  const canSubmitReturn = hasReason && hasFiles && filesSizeOk;

  const onChangeFiles = (e) => {
    const files = Array.from(e.target.files || []);
    const size = totalBytes(files);
    if (size > MAX_UPLOAD_BYTES) {
      setRetFilesError(t("order.returnFilesTooLarge", { max: MAX_UPLOAD_MB }));
      setRetFiles(files); // keep selection but disallow submit
    } else {
      setRetFilesError("");
      setRetFiles(files);
    }
  };

  async function submitCancel() {
    if (!order) return;
    if (!cancelMsgTrimmed) {
      showMessage(
        t("order.cancelReasonRequiredTitle"),
        t("order.cancelReasonRequired"),
        "error"
      );
      return;
    }
    try {
      await requestCancel({ id: order.id, message: cancelMsgTrimmed }).unwrap();
      showMessage(
        t("order.cancelRequestedTitle"),
        t("order.cancelRequested"),
        "success"
      );
      setCancelOpen(false);
      setCancelMsg("");
    } catch (e) {
      showMessage(
        t("order.cancelFailedTitle"),
        e?.data?.detail || t("order.cancelFailed"),
        "error"
      );
    }
  }

  async function submitReturn() {
    if (!order) return;

    if (!hasReason) {
      showMessage(
        t("order.returnReasonRequiredTitle"),
        t("order.returnReasonRequired"),
        "error"
      );
      return;
    }
    if (!hasFiles) {
      showMessage(
        t("order.returnFileRequiredTitle"),
        t("order.returnFileRequired"),
        "error"
      );
      return;
    }
    if (!filesSizeOk) {
      showMessage(
        t("order.returnFailedTitle"),
        t("order.returnFilesTooLarge", { max: MAX_UPLOAD_MB }),
        "error"
      );
      return;
    }

    const fd = new FormData();
    fd.append("message", retMsgTrimmed);
    retFiles.forEach((f) => fd.append("files", f));

    try {
      await requestReturn({
        id: order.id,
        message: retMsgTrimmed,
        files: retFiles,
      }).unwrap();
      showMessage(
        t("order.returnRequestedTitle"),
        t("order.returnRequested"),
        "success"
      );
      setRetOpen(false);
      setRetMsg("");
      setRetFiles([]);
      setRetFilesError("");
    } catch (e) {
      showMessage(
        t("order.returnFailedTitle"),
        e?.data?.detail || t("order.returnFailed"),
        "error"
      );
    }
  }

  const statusClass = (s) =>
    s === "delivered"
      ? "bg-green-100 text-green-700"
      : s === "shipped"
      ? "bg-blue-100 text-blue-700"
      : s === "processing"
      ? "bg-yellow-100 text-yellow-700"
      : s === "cancelled" || s === "failed"
      ? "bg-red-100 text-red-700"
      : "bg-gray-100 text-gray-700";

  const statusLabel = (s) =>
    t(`order.status.${s}`, s.charAt(0).toUpperCase() + s.slice(1));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center "
      aria-modal="true"
      role="dialog"
    >
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 w-[95%] max-w-2xl rounded-lg shadow-xl p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4 text-backnewswhite dark:text-backnewsdark">
          <div>
            <h3 className="text-xl font-semibold">{t("order.details")}</h3>
            {order && (
              <p className="text-sm text-gray-500">
                {t("order.orderHash")} #{order.number || order.id} •{" "}
                {new Date(order.created_at).toLocaleString(locale)}
                {isDelivered && deliveredAt ? (
                  <span className="ml-2 text-xs text-gray-500">
                    ({t("order.delivered")}:{" "}
                    {deliveredAt.toLocaleDateString(locale)}
                    {typeof ageDays === "number"
                      ? ` • ${t("order.daysAgo", { count: ageDays })}`
                      : ""}
                    )
                  </span>
                ) : null}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded px-2 py-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label={t("common.close")}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        {isFetching && <div>{t("common.loading")}</div>}
        {isError && <div className="text-red-600">{t("order.loadError")}</div>}

        {order && (
          <div className="space-y-6 text-backnewswhite dark:text-backnewsdark">
            {/* Status & total */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span
                  className={`text-sm font-medium px-2 py-1 rounded ${statusClass(
                    order.status
                  )}`}
                >
                  {statusLabel(order.status)}
                </span>
                {order.tracking_number ? (
                  <span className="text-xs text-gray-500">
                    {t("order.tracking")}:{" "}
                    <span className="font-mono">{order.tracking_number}</span>
                  </span>
                ) : null}
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500">{t("order.total")}</div>
                <div className="text-lg font-semibold">
                  {formatMoney(order.total_price, locale)}
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="space-y-3 max-h-[50vh] overflow-auto pr-1">
              {order.items.map((it) => (
                <div key={it.id} className="flex gap-4 items-center">
                  {it.product?.image ? (
                    <img
                      src={it.product.image}
                      alt={productTitle(it.product)}
                      className="w-20 h-20 object-cover rounded"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-gray-100 rounded" />
                  )}
                  <div className="flex-1">
                    <div className="font-semibold">
                      {productTitle(it.product)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {t("order.qty")}: {it.quantity} • {t("order.unit")}:{" "}
                      {formatMoney(it.unit_price, locale)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="mt-2 border-t pt-3 grid grid-cols-2 gap-y-1 text-sm">
              <div className="text-gray-500">{t("order.items")}</div>
              <div className="text-right">{totalQty}</div>
              <div className="text-gray-500">{t("order.subtotal")}</div>
              <div className="text-right">{formatMoney(order.subtotal)}</div>
              <div className="text-gray-500">{t("order.shipping")}</div>
              <div className="text-right">
                {formatMoney(order.shipping_fee, locale)}
              </div>
              <div className="font-medium">{t("order.total", "Total")}</div>
              <div className="text-right font-semibold">
                {formatMoney(order.total_price, locale)}
              </div>
            </div>

            {/* Shipping address */}
            <div>
              <div className="text-sm font-semibold mb-1">
                {t("order.shippingAddress")}
              </div>
              {order.shipping_address ? (
                <div className="text-sm">
                  {order.shipping_address.first_name}{" "}
                  {order.shipping_address.last_name}
                  <br />
                  {order.shipping_address.address_line1}
                  {order.shipping_address.address_line2
                    ? `, ${order.shipping_address.address_line2}`
                    : ""}
                  <br />
                  {order.shipping_address.postal_code}{" "}
                  {order.shipping_address.city}
                  <br />
                  {order.shipping_address.country ||
                    order.shipping_address.state}{" "}
                  {order.shipping_address.pincode}
                  {order.shipping_address.phone ? (
                    <>
                      <br />
                      {t("order.phone", "Phone")}:{" "}
                      {order.shipping_address.phone}
                    </>
                  ) : null}
                </div>
              ) : (
                <div className="text-sm text-gray-500">
                  {t("order.noAddress")}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 flex-wrap text-backnewswhite dark:text-backnewsdark">
              {/* Return */}
              {showReturnBtn && (
                <button
                  onClick={() => !returnDisabled && setRetOpen(true)}
                  disabled={returnDisabled}
                  className={`px-4 py-2 rounded border ${
                    returnDisabled
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-gray-50"
                  }`}
                  title={returnDisabled ? t("order.returnExpired") : ""}
                >
                  {t("order.return", "Return")}
                  {!returnDisabled && typeof daysLeft === "number"
                    ? `  (${t("order.daysLeft", { count: daysLeft })})`
                    : ""}
                </button>
              )}

              {/* Cancel */}
              {showCancelBtn && (
                <button
                  onClick={() => setCancelOpen(true)}
                  className="px-4 py-2 rounded border hover:bg-gray-50"
                >
                  {t("order.cancel")}
                </button>
              )}

              {/* Invoice */}
              {showDownload && (
                <a
                  href={toAbsoluteUrl(order.invoice_pdf)}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded bg-black text-white text-backnewswhite dark:text-backnewsdark"
                >
                  {t("order.downloadInvoice")}
                </a>
              )}

              <button
                onClick={onClose}
                className="px-4 py-2 rounded border hover:bg-gray-50"
              >
                {t("common.close")}
              </button>
            </div>

            {/* Hint if invoice not ready */}
            {isPaidOrLater && !showInvoice && (
              <div className="text-xs text-backnewswhite dark:text-backnewsdark">
                {t("order.invoicePending")}
              </div>
            )}
          </div>
        )}

        {/* Cancel modal */}
        {cancelOpen && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-backnewswhite dark:text-backnewsdark">
            <div className="bg-white rounded shadow p-5 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-2">
                {t("order.cancelOrder")}
              </h3>
              <p className="text-sm text-gray-600 mb-2">
                {t("order.cancelExplainRequired")}
              </p>
              <textarea
                value={cancelMsg}
                onChange={(e) => setCancelMsg(e.target.value)}
                className="w-full border rounded p-2 h-28"
                placeholder={t("order.cancelReasonPlaceholder")}
                aria-invalid={!cancelMsgTrimmed}
              />
              {!cancelMsgTrimmed && (
                <div className="mt-1 text-xs text-red-600">
                  {t("order.cancelReasonInline")}
                </div>
              )}
              <div className="mt-3 flex justify-end gap-2">
                <button
                  onClick={() => setCancelOpen(false)}
                  className="px-3 py-2 border rounded"
                >
                  {t("common.close")}
                </button>
                <button
                  onClick={submitCancel}
                  disabled={!cancelMsgTrimmed || canceling}
                  className={`px-3 py-2 rounded text-white ${
                    cancelMsgTrimmed && !canceling
                      ? "bg-black"
                      : "bg-gray-400 cursor-not-allowed"
                  }`}
                  aria-disabled={!cancelMsgTrimmed || canceling}
                >
                  {canceling ? t("common.loading") : t("order.submit")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Return modal */}
        {retOpen && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-backnewswhite dark:text-backnewsdark">
            <div className="bg-white rounded shadow p-5 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-2">
                {t("order.returnOrder")}
              </h3>
              <p className="text-sm text-gray-600 mb-2">
                {t("order.returnExplainRequired", { max: MAX_UPLOAD_MB })}
              </p>

              <label
                className="block text-sm font-medium mb-1"
                htmlFor="retMessage"
              >
                {t("order.returnReasonLabel")}
              </label>
              <textarea
                id="retMessage"
                value={retMsg}
                onChange={(e) => setRetMsg(e.target.value)}
                className="w-full border rounded p-2 h-28"
                placeholder={t("order.returnReasonPlaceholder")}
                aria-invalid={!hasReason}
              />
              {!hasReason && (
                <div className="mt-1 text-xs text-red-600">
                  {t("order.returnReasonInline")}
                </div>
              )}

              <label
                className="block text-sm font-medium mt-3 mb-1"
                htmlFor="retFiles"
              >
                {t("order.returnFilesLabel")}
              </label>
              <input
                id="retFiles"
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={onChangeFiles}
                className="mt-1"
                aria-invalid={!hasFiles || !filesSizeOk}
              />
              {(!hasFiles || retFilesError) && (
                <div className="mt-1 text-xs text-red-600">
                  {retFilesError || t("order.returnFileInline")}
                </div>
              )}
              {!retFilesError && hasFiles && !filesSizeOk && (
                <div className="mt-1 text-xs text-red-600">
                  {t("order.returnFilesTooLarge", { max: MAX_UPLOAD_MB })}
                </div>
              )}

              <div className="mt-3 flex justify-end gap-2">
                <button
                  onClick={() => setRetOpen(false)}
                  className="px-3 py-2 border rounded"
                >
                  {t("common.close")}
                </button>
                <button
                  onClick={submitReturn}
                  disabled={!canSubmitReturn || returning}
                  className={`px-3 py-2 rounded text-white ${
                    canSubmitReturn && !returning
                      ? "bg-black"
                      : "bg-gray-400 cursor-not-allowed"
                  }`}
                  aria-disabled={!canSubmitReturn || returning}
                >
                  {returning ? t("common.loading") : t("order.submit")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <MessageDialog
        open={msgOpen}
        title={msgTitle}
        message={msgText}
        kind={msgKind}
        onClose={() => setMsgOpen(false)}
      />
    </div>
  );
}
