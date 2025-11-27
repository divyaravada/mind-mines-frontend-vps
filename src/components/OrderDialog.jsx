// src/components/OrderDialog.jsx
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import MessageDialog from "./MessageDialog";
import { toAbsoluteUrl } from "../utils/urls";
import {
  useGetOrderQuery,
  useRequestCancelMutation,
  useRequestReturnMutation,
} from "../features/orders/ordersApi";

const MS_IN_DAY = 1000 * 60 * 60 * 24;
const FALLBACK_RETURN_WINDOW = 15;

function toNumeric(value) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseFloat(value) || 0;
  return 0;
}

function formatCurrency(value, currency = "EUR", locale = "de-DE") {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch (e) {
    return `${value.toFixed(2)} €`;
  }
}

function formatDateTime(dateString, locale = "de-DE") {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  try {
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch (e) {
    return date.toLocaleString();
  }
}

function parseDateLoose(value) {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function totalBytes(files) {
  return files.reduce((acc, f) => acc + (f.size || 0), 0);
}

export default function OrderDialog({ open, orderId, onClose }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "de" ? "de-DE" : "en-GB";

  const {
    data: order,
    isFetching,
    isError,
  } = useGetOrderQuery(orderId, {
    skip: !open || !orderId,
  });

  const shippingData =
    order?.shipping_snapshot ||
    order?.shipping_address ||
    order?.shipping ||
    order?.shippingAddress ||
    order?.delivery_address ||
    null;

  const billingData =
    order?.billing_snapshot ||
    order?.billing_address ||
    order?.billing ||
    order?.billingAddress ||
    null;

  const items = Array.isArray(order?.items)
    ? order.items
    : Array.isArray(order?.order_items)
    ? order.order_items
    : Array.isArray(order?.lines)
    ? order.lines
    : [];

  const trackingUrlRaw =
    order?.tracking_url || order?.trackingUrl || order?.tracking_link || null;
  const trackingHref = trackingUrlRaw ? toAbsoluteUrl(trackingUrlRaw) : null;

  const invoiceHref = order?.invoice_pdf
    ? toAbsoluteUrl(order.invoice_pdf)
    : null;
  const showDownload = !!invoiceHref;

  const orderImageFallback =
    order?.first_item_image ||
    order?.primary_image ||
    order?.preview_image ||
    order?.cover_image ||
    order?.thumbnail ||
    null;

  const createdAtLabel = order ? formatDateTime(order.created_at, locale) : "";
  const deliveredAt =
    order && order.status === "delivered"
      ? parseDateLoose(order.delivered_at) ||
        parseDateLoose(order.shipped_at) ||
        parseDateLoose(order.created_at)
      : parseDateLoose(order?.delivered_at);
  const ageDays = deliveredAt
    ? Math.floor((Date.now() - deliveredAt.getTime()) / MS_IN_DAY)
    : null;

  const isDelivered = order?.status === "delivered";
  const isPaidOrLater =
    order?.status === "paid" ||
    order?.status === "shipped" ||
    order?.status === "delivered" ||
    order?.payment_status === "paid";
  const isBeforePaid =
    order?.status === "pending" || order?.status === "processing";

  const [requestCancel, { isLoading: canceling }] = useRequestCancelMutation();
  const [requestReturn, { isLoading: returning }] = useRequestReturnMutation();

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelMsg, setCancelMsg] = useState("");
  const cancelMsgTrimmed = cancelMsg.trim();

  const [retOpen, setRetOpen] = useState(false);
  const [retMsg, setRetMsg] = useState("");
  const retMsgTrimmed = retMsg.trim();
  const [retFiles, setRetFiles] = useState([]);
  const [retFilesError, setRetFilesError] = useState("");

  // NEW: local flags to avoid duplicate requests
  const [cancelRequested, setCancelRequested] = useState(false);
  const [returnRequested, setReturnRequested] = useState(false);

  // Sync flags with server data whenever the order changes
  useEffect(() => {
    if (!order) {
      setCancelRequested(false);
      setReturnRequested(false);
      return;
    }

    if (
      order.status === "cancelled" ||
      order.status === "refunded" ||
      order.status === "failed"
    ) {
      setCancelRequested(true);
    }
    if (order.status === "returned") {
      setReturnRequested(true);
    }

    if (order.has_cancel_request) {
      setCancelRequested(true);
    }
    if (order.has_return_request) {
      setReturnRequested(true);
    }
  }, [order]);

  const MAX_UPLOAD_MB = 10;
  const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

  const [msgOpen, setMsgOpen] = useState(false);
  const [msgKind, setMsgKind] = useState("success");
  const [msgTitle, setMsgTitle] = useState("");
  const [msgText, setMsgText] = useState("");

  function showMessage(title, text, kind = "success") {
    setMsgTitle(title);
    setMsgText(text);
    setMsgKind(kind);
    setMsgOpen(true);
  }

  const returnDeadline = order ? parseDateLoose(order.return_deadline) : null;
  const apiReturnFlag = typeof order?.is_returnable === "boolean";
  const derivedReturnEligible = apiReturnFlag
    ? !!order?.is_returnable
    : isDelivered;

  // NEW: check if there is already a return request
  const hasReturnRequest =
    !!order &&
    (order.status === "returned" ||
      order.has_return_request ||
      returnRequested);

  const showReturnBtn =
    !!order && (apiReturnFlag || isDelivered) && !hasReturnRequest;
  const returnDisabled = !derivedReturnEligible || hasReturnRequest;
  const daysLeft =
    !returnDisabled && returnDeadline
      ? Math.max(
          0,
          Math.ceil((returnDeadline.getTime() - Date.now()) / MS_IN_DAY)
        )
      : !apiReturnFlag && typeof ageDays === "number"
      ? Math.max(0, FALLBACK_RETURN_WINDOW - ageDays)
      : null;

  const paymentMethodLabel =
    order?.payment_method_label || order?.payment_method || null;
  const paymentStatusLabel = order?.payment_status
    ? t(
        `order.paymentStatus.${order.payment_status}`,
        order.payment_status.charAt(0).toUpperCase() +
          order.payment_status.slice(1)
      )
    : null;

  const subtotalValue = order?.subtotal ?? 0;
  const shippingFeeValue = order?.shipping_price ?? order?.shipping_fee ?? 0;
  const discountValue = order?.discount ?? order?.discount_total ?? 0;
  const totalValue = order?.total ?? 0;

  const formattedSubtotal = formatCurrency(
    toNumeric(subtotalValue),
    "EUR",
    locale
  );
  const formattedShipping = formatCurrency(
    toNumeric(shippingFeeValue),
    "EUR",
    locale
  );
  const formattedDiscount = formatCurrency(
    -Math.abs(toNumeric(discountValue)),
    "EUR",
    locale
  );
  const formattedTotal = formatCurrency(toNumeric(totalValue), "EUR", locale);

  // NEW: whether a cancel request already exists
  const hasCancelRequest =
    !!order &&
    (order.status === "cancelled" ||
      order.status === "refunded" ||
      order.status === "failed" ||
      order.has_cancel_request ||
      cancelRequested);

  const showCancelBtn = !!order && isBeforePaid && !hasCancelRequest;

  const addressLines = (addr) => {
    if (!addr) return [];
    const lines = [];
    if (addr.name) lines.push(addr.name);
    const line2 =
      [addr.street, addr.street2, addr.houseNumber].filter(Boolean).join(" ") ||
      null;
    if (line2) lines.push(line2);
    const cityLine =
      [addr.postcode || addr.zip, addr.city].filter(Boolean).join(" ") || null;
    if (cityLine) lines.push(cityLine);
    if (addr.state) lines.push(addr.state);
    if (addr.country) lines.push(addr.country);
    if (addr.phone) lines.push(`${t("order.phone")}: ${addr.phone}`);
    return lines;
  };

  const detailedShippingLines = (addr) => {
    if (!addr) return [];
    const lines = [];
    if (addr.company) lines.push(addr.company);
    if (addr.attention) lines.push(addr.attention);
    if (addr.street) lines.push(addr.street);
    if (addr.houseNumber) lines.push(addr.houseNumber);
    if (addr.street2) lines.push(addr.street2);
    const cityLine =
      [addr.postcode || addr.zip, addr.city].filter(Boolean).join(" ") || null;
    if (cityLine) lines.push(cityLine);
    if (addr.state) lines.push(addr.state);
    if (addr.country) lines.push(addr.country);
    if (addr.phone) lines.push(`${t("order.phone")}: ${addr.phone}`);
    return lines;
  };

  const onChangeFiles = (e) => {
    const files = Array.from(e.target.files || []);
    const size = totalBytes(files);
    if (size > MAX_UPLOAD_BYTES) {
      setRetFilesError(t("order.returnFilesTooLarge", { max: MAX_UPLOAD_MB }));
      setRetFiles(files);
    } else {
      setRetFilesError("");
      setRetFiles(files);
    }
  };

  const hasReason = !!retMsgTrimmed;
  const hasFiles = retFiles.length > 0;
  const filesSizeOk = totalBytes(retFiles) <= MAX_UPLOAD_BYTES;
  const canSubmitReturn =
    hasReason && hasFiles && filesSizeOk && !returnDisabled && !returning;

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
    if (hasCancelRequest) {
      showMessage(
        t("order.cancelUnavailableTitle", "Cancellation not possible"),
        t(
          "order.cancelUnavailable",
          "A cancellation request has already been submitted for this order."
        ),
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
      // NEW: mark locally as requested so user cannot send again
      setCancelRequested(true);
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
    if (hasReturnRequest || returnDisabled) {
      showMessage(
        t("order.returnUnavailableTitle", "Return not possible"),
        t(
          "order.returnUnavailable",
          "A return request has already been submitted for this order."
        ),
        "error"
      );
      return;
    }
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
      // NEW: mark locally as requested so user cannot send again
      setReturnRequested(true);
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

  const statusClass = (s) => {
    switch (s) {
      case "pending":
        return "bg-gray-100 text-gray-700";
      case "paid":
      case "shipped":
      case "delivered":
        return "bg-green-100 text-green-700";
      case "processing":
      case "pending":
        return "bg-yellow-100 text-yellow-700";
      case "cancelled":
      case "failed":
      case "refunded":
        return "bg-red-100 text-red-700";
      case "returned":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const statusLabel = (s) =>
    s
      ? t(`order.status.${s}`, s.charAt(0).toUpperCase() + s.slice(1))
      : t("order.status.unknown", "Unknown");

  if (!open || !orderId) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-2 sm:px-4 py-4 sm:py-6"
      aria-modal="true"
      role="dialog"
    >
      <div
        className="fixed inset-0 bg-black/40 dark:bg-black/60"
        onClick={onClose}
      />
      <div className="relative bg-white dark:bg-marbleblack rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
              {t("order.detailsTitle", "Order Details")}
            </h2>
            {order?.number && (
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                {t("order.orderNumber", "Order")} #{order.number}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-6">
          {isFetching && (
            <div className="text-center text-gray-500 dark:text-gray-300 py-10">
              {t("order.loading", "Loading order details...")}
            </div>
          )}

          {isError && (
            <div className="text-center text-red-600 dark:text-red-400 py-10">
              {t(
                "order.loadError",
                "Could not load order details. Please try again later."
              )}
            </div>
          )}

          {order && (
            <>
              {/* Status + created date */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusClass(
                      order.status
                    )}`}
                  >
                    {statusLabel(order.status)}
                  </span>
                  {paymentStatusLabel && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-100">
                      {paymentStatusLabel}
                    </span>
                  )}
                </div>
                {createdAtLabel && (
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-right">
                    {t("order.createdAt", "Placed on")} {createdAtLabel}
                  </p>
                )}
              </div>

              {/* Items */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <table className="min-w-full text-xs sm:text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-3 sm:px-4 py-2 text-left text-gray-600 dark:text-gray-300">
                        {t("order.product", "Product")}
                      </th>
                      <th className="px-3 sm:px-4 py-2 text-right text-gray-600 dark:text-gray-300">
                        {t("order.quantity", "Qty")}
                      </th>
                      <th className="px-3 sm:px-4 py-2 text-right text-gray-600 dark:text-gray-300">
                        {t("order.price", "Price")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr
                        key={idx}
                        className="border-t border-gray-200 dark:border-gray-700"
                      >
                        <td className="px-3 sm:px-4 py-2">
                          <div className="flex items-center gap-2 sm:gap-3">
                            {item.image || orderImageFallback ? (
                              <img
                                src={item.image || orderImageFallback}
                                alt={item.name}
                                className="w-10 h-10 rounded object-cover border border-gray-200 dark:border-gray-700"
                              />
                            ) : null}
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">
                                {item.name}
                              </div>
                              {item.sku && (
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {t("order.sku", "SKU")}: {item.sku}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 sm:px-4 py-2 text-right text-gray-900 dark:text-white">
                          {item.quantity || item.qty || 1}
                        </td>
                        <td className="px-3 sm:px-4 py-2 text-right text-gray-900 dark:text-white">
                          {formatCurrency(
                            toNumeric(item.total || item.price || 0),
                            "EUR",
                            locale
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary */}
              <div className="flex flex-col items-end gap-1 text-sm">
                <div className="flex justify-between w-full sm:w-auto sm:min-w-[260px]">
                  <span className="text-gray-500 dark:text-gray-300">
                    {t("order.subtotal", "Subtotal")}
                  </span>
                  <span className="text-gray-900 dark:text-white">
                    {formattedSubtotal}
                  </span>
                </div>
                <div className="flex justify-between w-full sm:w-auto sm:min-w-[260px]">
                  <span className="text-gray-500 dark:text-gray-300">
                    {t("order.shipping", "Shipping")}
                  </span>
                  <span className="text-gray-900 dark:text-white">
                    {formattedShipping}
                  </span>
                </div>
                {toNumeric(discountValue) !== 0 && (
                  <div className="flex justify-between w-full sm:w-auto sm:min-w-[260px]">
                    <span className="text-gray-500 dark:text-gray-300">
                      {t("order.discount", "Discount")}
                    </span>
                    <span className="text-red-600 dark:text-red-400">
                      {formattedDiscount}
                    </span>
                  </div>
                )}
                <div className="flex justify-between w-full sm:w-auto sm:min-w-[260px] font-semibold border-t border-gray-200 dark:border-gray-700 pt-1 mt-1">
                  <span className="text-gray-900 dark:text-white">
                    {t("order.total", "Total")}
                  </span>
                  <span className="text-gray-900 dark:text-white">
                    {formattedTotal}
                  </span>
                </div>
              </div>

              {/* Addresses */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    {t("order.shippingAddress", "Shipping address")}
                  </h3>
                  <div className="text-xs sm:text-sm text-gray-700 dark:text-gray-200 space-y-1">
                    {detailedShippingLines(shippingData).map((line, idx) => (
                      <div key={idx}>{line}</div>
                    ))}
                  </div>
                </div>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    {t("order.billingAddress", "Billing address")}
                  </h3>
                  <div className="text-xs sm:text-sm text-gray-700 dark:text-gray-200 space-y-1">
                    {addressLines(billingData).map((line, idx) => (
                      <div key={idx}>{line}</div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Extra info */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 space-y-1">
                  {paymentMethodLabel && (
                    <div>
                      {t("order.paymentMethod", "Payment method")}:{" "}
                      <span className="font-medium">{paymentMethodLabel}</span>
                    </div>
                  )}
                  {trackingHref && (
                    <div>
                      {t("order.tracking", "Tracking")}:{" "}
                      <a
                        href={trackingHref}
                        target="_blank"
                        rel="noreferrer"
                        className="underline text-blue-600 dark:text-blue-400"
                      >
                        {t("order.trackShipment", "Track shipment")}
                      </a>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 justify-end">
                  {showDownload && (
                    <a
                      href={invoiceHref}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full sm:w-auto px-4 py-2 rounded border border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800 text-sm"
                    >
                      {t("order.downloadInvoice")}
                    </a>
                  )}

                  {showCancelBtn && (
                    <button
                      onClick={() => setCancelOpen(true)}
                      className="w-full sm:w-auto px-4 py-2 rounded border border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800 text-sm"
                    >
                      {t("order.cancelOrder", "Cancel order")}
                    </button>
                  )}

                  {showReturnBtn && (
                    <button
                      onClick={() => setRetOpen(true)}
                      disabled={returnDisabled}
                      className={`w-full sm:w-auto px-4 py-2 rounded border ${
                        returnDisabled
                          ? "opacity-50 cursor-not-allowed"
                          : "border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
                      } text-sm`}
                      title={
                        returnDisabled
                          ? t(
                              "order.returnUnavailable",
                              "Return request is not available for this order"
                            )
                          : ""
                      }
                    >
                      {t("order.return", "Return")}
                      {!returnDisabled && typeof daysLeft === "number"
                        ? ` (${t("order.daysLeft", { count: daysLeft })})`
                        : !returnDisabled && returnDeadline
                        ? ` (${returnDeadline.toLocaleDateString(locale)})`
                        : ""}
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Cancel dialog */}
        {cancelOpen && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center px-4">
            <div className="bg-white dark:bg-marbleblack rounded-2xl shadow-xl max-w-md w-full p-4 sm:p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t("order.cancelDialogTitle", "Request cancellation")}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {t(
                  "order.cancelDialogDescription",
                  "Please tell us why you want to cancel this order. Our team will review your request."
                )}
              </p>
              <textarea
                className="w-full min-h-[100px] rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-marbleblack text-sm text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-marbleorange/60"
                placeholder={t(
                  "order.cancelReasonPlaceholder",
                  "Write your reason here..."
                )}
                value={cancelMsg}
                onChange={(e) => setCancelMsg(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setCancelOpen(false)}
                  className="w-full sm:w-auto px-3 py-2 border rounded text-sm"
                >
                  {t("common.close")}
                </button>
                <button
                  onClick={submitCancel}
                  disabled={!cancelMsgTrimmed || canceling || hasCancelRequest}
                  className={`w-full sm:w-auto px-3 py-2 rounded text-sm text-white ${
                    cancelMsgTrimmed && !canceling && !hasCancelRequest
                      ? "bg-marbleorange hover:bg-marbleorange/90"
                      : "bg-gray-400 cursor-not-allowed"
                  }`}
                >
                  {canceling
                    ? t("order.canceling", "Sending...")
                    : t("order.submitCancel", "Submit request")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Return dialog */}
        {retOpen && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center px-4">
            <div className="bg-white dark:bg-marbleblack rounded-2xl shadow-xl max-w-md w-full p-4 sm:p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t("order.returnDialogTitle", "Request a return")}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {t(
                  "order.returnDialogDescription",
                  "Please explain why you want to return the product and upload at least one image or video that shows the issue."
                )}
              </p>
              <textarea
                className="w-full min-h-[100px] rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-marbleblack text-sm text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-marbleorange/60"
                placeholder={t(
                  "order.returnReasonPlaceholder",
                  "Write your reason here..."
                )}
                value={retMsg}
                onChange={(e) => setRetMsg(e.target.value)}
              />

              <div className="space-y-1">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200">
                  {t(
                    "order.returnFilesLabel",
                    "Upload images or a short video (required)"
                  )}
                </label>
                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={onChangeFiles}
                  className="block w-full text-xs sm:text-sm text-gray-700 dark:text-gray-200"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t(
                    "order.returnFilesHint",
                    "Max. 10 MB in total. Supported: images and short videos."
                  )}
                </p>
                {retFilesError && (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {retFilesError}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setRetOpen(false)}
                  className="w-full sm:w-auto px-3 py-2 border rounded text-sm"
                >
                  {t("common.close")}
                </button>
                <button
                  onClick={submitReturn}
                  disabled={!canSubmitReturn}
                  className={`w-full sm:w-auto px-3 py-2 rounded text-sm text-white ${
                    canSubmitReturn
                      ? "bg-marbleorange hover:bg-marbleorange/90"
                      : "bg-gray-400 cursor-not-allowed"
                  }`}
                >
                  {returning
                    ? t("order.returning", "Sending...")
                    : t("order.submitReturn", "Submit request")}
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
