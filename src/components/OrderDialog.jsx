// src/components/OrderDialog.jsx
import { useEffect, useMemo, useState } from "react";
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
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value.replace(/[^\d.,-]/g, "").replace(",", "."));
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function formatMoney(v, locale = "en", currency = "EUR") {
  const parsed = toNumeric(v);
  const amount = parsed ?? 0;
  const fallbackCurrency = currency || "EUR";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: fallbackCurrency,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${fallbackCurrency}`;
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

function formatDateTime(value, locale) {
  const date = parseDateLoose(value);
  if (!date) return value || "";
  try {
    return date.toLocaleString(locale);
  } catch {
    return date.toString();
  }
}

function buildShippingLines(addr) {
  if (!addr) return [];
  const lines = [];
  const first = addr.first_name || addr.firstName;
  const last = addr.last_name || addr.lastName;
  const fullName = [first, last].filter(Boolean).join(" ").trim();
  if (fullName) lines.push(fullName);

  const streetFromParts = [addr.street_name, addr.house_number]
    .filter(Boolean)
    .join(" ")
    .trim();
  const line1 =
    addr.line1 ||
    addr.address_line1 ||
    addr.address1 ||
    streetFromParts ||
    addr.street;
  if (line1) lines.push(line1);

  const line2 = addr.line2 || addr.address_line2 || addr.address2;
  if (line2) lines.push(line2);

  const postal =
    addr.postal_code || addr.postalCode || addr.zip || addr.postcode || "";
  const city = addr.city || addr.town || "";
  const cityLine = [postal, city].filter(Boolean).join(" ").trim();
  if (cityLine) lines.push(cityLine);

  const country =
    addr.country || addr.country_code || addr.countryCode || addr.state;
  if (country) lines.push(country);

  return lines;
}

function resolveLineItem(item = {}, lang, t, fallbackImage = null) {
  const product =
    (item?.product && typeof item.product === "object" && item.product) ||
    item?.product_obj ||
    item?.product_data ||
    null;

  const fallbackTitle =
    item?.product_name ||
    item?.name ||
    item?.product_title ||
    item?.title ||
    t("order.item");

  const title =
    (lang === "de" ? product?.title_de : product?.title_en) ||
    product?.title_en ||
    product?.title_de ||
    product?.name ||
    fallbackTitle;

  const productImages = Array.isArray(product?.images)
    ? product.images
    : Array.isArray(product?.photos)
    ? product.photos
    : [];

  const itemImages = Array.isArray(item?.images)
    ? item.images
    : Array.isArray(item?.photos)
    ? item.photos
    : [];

  const imageSource =
    product?.image ||
    product?.image_url ||
    product?.cover ||
    product?.thumbnail ||
    product?.featured_image ||
    productImages[0] ||
    item?.image ||
    item?.product_image ||
    item?.product_image_url ||
    item?.image_url ||
    itemImages[0] ||
    item?.thumbnail ||
    item?.thumbnail_url ||
    fallbackImage ||
    null;

  const quantity = Number(item?.quantity ?? item?.qty ?? 1) || 1;
  const unitPriceRaw = item?.unit_price ?? item?.price ?? null;
  const parsedUnit = toNumeric(unitPriceRaw);
  const unitPrice = unitPriceRaw ?? parsedUnit ?? null;

  let lineTotalValue = item?.line_total ?? item?.total ?? null;
  const parsedLine = lineTotalValue !== null ? toNumeric(lineTotalValue) : null;
  if (parsedLine !== null) {
    lineTotalValue = parsedLine;
  } else if (parsedUnit !== null) {
    lineTotalValue = parsedUnit * quantity;
  }

  const normalizedTitle = typeof title === "string" ? title.trim() : "";
  const initial = normalizedTitle
    ? normalizedTitle.charAt(0).toUpperCase()
    : null;

  return {
    title,
    image: toAbsoluteUrl(imageSource),
    initial,
    quantity,
    unitPrice,
    lineTotal: lineTotalValue,
    sku: item?.sku || item?.product_sku || product?.sku || null,
  };
}

export default function OrderDialog({ orderId, open, onClose }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language || "en";
  const lang = i18n.language?.startsWith("de") ? "de" : "en";

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

  const items = useMemo(
    () => (Array.isArray(order?.items) ? order.items : []),
    [order]
  );

  const totalQty = useMemo(
    () =>
      items.reduce(
        (sum, it) => sum + (Number(it?.quantity ?? it?.qty) || 0),
        0
      ),
    [items]
  );

  const orderNumber = order?.number || order?.order_number || order?.id;
  const orderCurrency = order?.currency || order?.currency_code || "EUR";

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
  const showCancelBtn = !!order && isBeforePaid;

  const subtotalValue = order?.subtotal ?? 0;
  const shippingFeeValue = order?.shipping_price ?? order?.shipping_fee ?? 0;
  const discountValue = order?.discount_total ?? 0;
  const discountNumeric = toNumeric(discountValue);
  const hasDiscount =
    discountNumeric !== null ? discountNumeric !== 0 : Boolean(discountValue);
  const vatValue = order?.vat_total ?? order?.tax_total;
  const totalValue = order?.total_price ?? 0;

  const couponCode = order?.coupon_code || order?.coupon || null;

  const trackingNumber =
    order?.tracking_number || order?.tracking?.number || "";
  const trackingCarrier =
    order?.tracking_carrier || order?.tracking?.carrier || "";
  const trackingUrlRaw = order?.tracking_url || order?.tracking?.url || "";
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

  const returnDeadline = order ? parseDateLoose(order.return_deadline) : null;
  const apiReturnFlag = typeof order?.is_returnable === "boolean";
  const derivedReturnEligible = apiReturnFlag
    ? !!order?.is_returnable
    : isDelivered;
  const showReturnBtn = !!order && (apiReturnFlag || isDelivered);
  const returnDisabled = !derivedReturnEligible;
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
  const installmentsLabel = order?.installments_months
    ? t("order.installmentsMonths", {
        count: order.installments_months,
        defaultValue: "{{count}} monthly installments",
      })
    : null;

  const shippingLines = useMemo(
    () => buildShippingLines(shippingData),
    [shippingData]
  );
  const shippingPhone =
    shippingData?.phone ||
    shippingData?.phone_number ||
    shippingData?.phoneNumber ||
    null;
  const shippingEmail = order?.email || shippingData?.email || null;

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
      setRetFiles(files);
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

  const statusClass = (s) => {
    switch (s) {
      case "delivered":
        return "bg-green-100 text-green-700";
      case "shipped":
      case "paid":
        return "bg-blue-100 text-blue-700";
      case "processing":
      case "pending":
        return "bg-yellow-100 text-yellow-700";
      case "cancelled":
      case "failed":
      case "refunded":
        return "bg-red-100 text-red-700";
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
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-2xl bg-marblewhite dark:bg-marbleblack text-gray-800 dark:text-gray-100 rounded-lg shadow-xl p-4 sm:p-6 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between mb-4 gap-2">
          <div className="min-w-0">
            <h3 className="text-lg sm:text-xl font-semibold text-backnewswhite dark:text-backnewsdark truncate">
              {t("order.details")}
            </h3>
            {order && (
              <p className="mt-1 text-xs sm:text-sm text-gray-500 break-words">
                {t("order.orderHash")} #{orderNumber}
                {createdAtLabel ? <> | {createdAtLabel}</> : null}
                {isDelivered && deliveredAt ? (
                  <span className="block sm:inline text-xs text-gray-500 sm:ml-2">
                    ({t("order.delivered")}:{" "}
                    {deliveredAt.toLocaleDateString(locale)}
                    {typeof ageDays === "number"
                      ? ` - ${t("order.daysAgo", { count: ageDays })}`
                      : ""}
                    )
                  </span>
                ) : null}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded px-2 py-1 text-lg text-gray-500 dark:hover:text-backnewsdark hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label={t("common.close")}
          >
            &times;
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto pr-1 sm:pr-2 space-y-6">
          {isFetching && (
            <div className="text-sm text-gray-600">{t("common.loading")}</div>
          )}
          {isError && (
            <div className="text-sm text-red-600">{t("order.loadError")}</div>
          )}

          {order && (
            <div className="space-y-6 text-backnewswhite dark:text-backnewsdark">
              {/* Status + Total */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span
                      className={`text-xs sm:text-sm font-medium px-2 py-1 rounded ${statusClass(
                        order.status
                      )}`}
                    >
                      {statusLabel(order.status)}
                    </span>
                    {trackingCarrier && (
                      <span className="text-xs text-gray-500">
                        {trackingCarrier}
                      </span>
                    )}
                  </div>
                  {(trackingNumber || trackingHref) && (
                    <div className="text-xs text-gray-500 space-x-2 break-words">
                      {trackingNumber && (
                        <span>
                          {t("order.tracking")}:{" "}
                          <span className="font-mono">{trackingNumber}</span>
                        </span>
                      )}
                      {trackingHref && (
                        <a
                          href={trackingHref}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 underline"
                        >
                          {t("order.trackPackage", "Track shipment")}
                        </a>
                      )}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">
                    {t("order.total")}
                  </div>
                  <div className="text-lg font-semibold">
                    {formatMoney(totalValue, locale, orderCurrency)}
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="space-y-3 max-h-[40vh] sm:max-h-[50vh] overflow-auto pr-1">
                {items.length === 0 ? (
                  <div className="text-sm text-gray-500">
                    {t("order.noItems", "No items available")}
                  </div>
                ) : (
                  items.map((it, idx) => {
                    const line = resolveLineItem(
                      it,
                      lang,
                      t,
                      orderImageFallback
                    );
                    const key = it?.id ?? it?.line_id ?? `${line.title}-${idx}`;
                    const unitNumeric = toNumeric(line.unitPrice);
                    const lineTotal =
                      line.lineTotal ??
                      (unitNumeric !== null
                        ? unitNumeric * line.quantity
                        : null);
                    return (
                      <div
                        key={key}
                        className="flex gap-3 sm:gap-4 items-center"
                      >
                        {line.image ? (
                          <img
                            src={line.image}
                            alt={line.title}
                            className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded flex items-center justify-center text-gray-500">
                            {line.initial || "?"}
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm sm:text-base truncate">
                            {line.title}
                          </div>
                          {line.sku && (
                            <div className="text-xs text-gray-500">
                              {t("order.sku", "SKU")}: {line.sku}
                            </div>
                          )}
                          <div className="text-xs sm:text-sm text-gray-500">
                            {t("order.qty")}: {line.quantity}
                            {line.unitPrice != null && (
                              <>
                                {" | "}
                                {t("order.unit")}:{" "}
                                {formatMoney(
                                  line.unitPrice,
                                  locale,
                                  orderCurrency
                                )}
                              </>
                            )}
                          </div>
                        </div>
                        <div className="font-medium text-xs sm:text-sm shrink-0">
                          {lineTotal != null
                            ? formatMoney(lineTotal, locale, orderCurrency)
                            : line.unitPrice != null
                            ? formatMoney(line.unitPrice, locale, orderCurrency)
                            : "-"}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Totals */}
              <div className="mt-2 border-t pt-3 grid grid-cols-2 gap-y-1 text-xs sm:text-sm">
                <div className="text-gray-500">{t("order.items")}</div>
                <div className="text-right">{totalQty}</div>

                <div className="text-gray-500">{t("order.subtotal")}</div>
                <div className="text-right">
                  {formatMoney(subtotalValue, locale, orderCurrency)}
                </div>

                {hasDiscount && (
                  <>
                    <div className="text-gray-500">
                      {t("order.discount", "Discounts")}
                    </div>
                    <div className="text-right text-green-700">
                      -{formatMoney(discountValue, locale, orderCurrency)}
                    </div>
                  </>
                )}

                <div className="text-gray-500">{t("order.shipping")}</div>
                <div className="text-right">
                  {formatMoney(shippingFeeValue, locale, orderCurrency)}
                </div>

                {vatValue !== null && (
                  <>
                    <div className="text-gray-500">{t("order.vat", "VAT")}</div>
                    <div className="text-right">
                      {formatMoney(vatValue, locale, orderCurrency)}
                    </div>
                  </>
                )}

                <div className="font-medium">{t("order.total", "Total")}</div>
                <div className="text-right font-semibold">
                  {formatMoney(totalValue, locale, orderCurrency)}
                </div>
              </div>

              {couponCode && (
                <div className="text-xs text-gray-500">
                  {t("order.couponCode", "Coupon code")}: {couponCode}
                </div>
              )}

              {(paymentMethodLabel ||
                paymentStatusLabel ||
                installmentsLabel) && (
                <div>
                  <div className="text-sm font-semibold mb-1">
                    {t("order.paymentDetails", "Payment details")}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600 space-y-1">
                    {paymentMethodLabel && (
                      <div>
                        <span className="text-gray-500">
                          {t("order.paymentMethodLabel", "Method")}:
                        </span>{" "}
                        {paymentMethodLabel}
                      </div>
                    )}
                    {paymentStatusLabel && (
                      <div>
                        <span className="text-gray-500">
                          {t("order.paymentStatusLabel", "Status")}:
                        </span>{" "}
                        {paymentStatusLabel}
                      </div>
                    )}
                    {installmentsLabel && <div>{installmentsLabel}</div>}
                  </div>
                </div>
              )}

              {/* Shipping address */}
              <div>
                <div className="text-sm font-semibold mb-1">
                  {t("order.shippingAddress")}
                </div>
                {shippingLines.length > 0 ? (
                  <div className="text-xs sm:text-sm space-y-1">
                    {shippingLines.map((line, idx) => (
                      <div key={`${line}-${idx}`}>{line}</div>
                    ))}
                    {shippingPhone && (
                      <div>
                        {t("order.phone", "Phone")}: {shippingPhone}
                      </div>
                    )}
                    {shippingEmail && (
                      <div>
                        {t("order.email", "Email")}: {shippingEmail}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs sm:text-sm text-gray-500">
                    {t("order.noAddress")}
                  </div>
                )}
              </div>

              {isPaidOrLater && !showDownload && (
                <div className="text-xs text-backnewswhite dark:text-backnewsdark">
                  {t("order.invoicePending")}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer buttons */}
        {order && (
          <div className="mt-4 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 rounded border border-gray-300 hover:bg-gray-50 dark:hover:text-backnewsdark dark:border-gray-700"
            >
              {t("common.close")}
            </button>

            {showDownload && (
              <a
                href={invoiceHref}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto px-4 py-2 rounded bg-backnewswhite text-white text-center hover:opacity-90
                  dark:bg-backnewsdark dark:text-marbleblack"
              >
                {t("order.downloadInvoice")}
              </a>
            )}

            {showCancelBtn && (
              <button
                onClick={() => setCancelOpen(true)}
                className="w-full sm:w-auto px-4 py-2 rounded border border-gray-300 hover:bg-gray-50 dark:border-gray-700"
              >
                {t("order.cancel")}
              </button>
            )}

            {showReturnBtn && (
              <button
                onClick={() => !returnDisabled && setRetOpen(true)}
                disabled={returnDisabled}
                className={`w-full sm:w-auto px-4 py-2 rounded border ${
                  returnDisabled
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-gray-50"
                }`}
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
        )}

        {/* Cancel modal */}
        {cancelOpen && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center px-2">
            <div className="bg-marblewhite dark:bg-marbleblack rounded shadow p-4 sm:p-5 w-full max-w-md max-h-[90vh] overflow-y-auto text-gray-800 dark:text-gray-100">
              <h3 className="text-lg font-semibold mb-2">
                {t("order.cancelOrder")}
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 mb-2">
                {t("order.cancelExplainRequired")}
              </p>
              <textarea
                value={cancelMsg}
                onChange={(e) => setCancelMsg(e.target.value)}
                className="w-full border rounded p-2 h-28 text-sm"
                placeholder={t("order.cancelReasonPlaceholder")}
                aria-invalid={!cancelMsgTrimmed}
              />
              {!cancelMsgTrimmed && (
                <div className="mt-1 text-xs text-red-600">
                  {t("order.cancelReasonInline")}
                </div>
              )}
              <div className="mt-3 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                <button
                  onClick={() => setCancelOpen(false)}
                  className="w-full sm:w-auto px-3 py-2 border rounded"
                >
                  {t("common.close")}
                </button>
                <button
                  onClick={submitCancel}
                  disabled={!cancelMsgTrimmed || canceling}
                  className={`w-full sm:w-auto px-3 py-2 rounded text-white ${
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
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center px-2">
            <div className="bg-marblewhite dark:bg-marbleblack rounded shadow p-4 sm:p-5 w-full max-w-md max-h-[90vh] overflow-y-auto text-gray-800 dark:text-gray-100">
              <h3 className="text-lg font-semibold mb-2">
                {t("order.returnOrder")}
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 mb-2">
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
                className="w-full border rounded p-2 h-28 text-sm"
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
                className="mt-1 text-xs"
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

              <div className="mt-3 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                <button
                  onClick={() => setRetOpen(false)}
                  className="w-full sm:w-auto px-3 py-2 border rounded"
                >
                  {t("common.close")}
                </button>
                <button
                  onClick={submitReturn}
                  disabled={!canSubmitReturn || returning}
                  className={`w-full sm:w-auto px-3 py-2 rounded text-white ${
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
