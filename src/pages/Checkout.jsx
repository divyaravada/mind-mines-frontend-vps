// src/pages/Checkout.jsx
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck, Truck, RotateCcw } from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import {
  selectCartItems,
  selectCartCount,
  selectCartSubtotal,
  clearCart,
} from "../features/cart/cartSlice";
import http from "../services/http";
import { useTranslation } from "react-i18next";

import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

import StripeSepa from "../components/StripeSepa";
import StripeSepaInstallments from "../components/StripeSepaInstallments";
import StripeCard from "../components/StripeCard";
import StripeCardInstallments from "../components/StripeCardInstallments";

const INSTALLMENT_THRESHOLDS = { 3: 100, 6: 200, 9: 500 };

const toCents = (n) => Math.round(Number(n || 0) * 100);
const splitInstallments = (total, months) => {
  const tc = toCents(total);
  const base = Math.floor(tc / months);
  const rem = tc - base * months;
  const parts = Array(months).fill(base);
  if (rem) parts[months - 1] += rem;
  return parts.map((c) => c / 100);
};
const fmtEUR = (n, locale = "en") => {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "EUR",
    }).format(n);
  } catch {
    const v = Number.isFinite(n) ? n : 0;
    return `${v.toFixed(2)} €`;
  }
};

const normalizeCountry = (c) => {
  if (!c) return "DE";
  const s = String(c).trim();
  if (s.length === 2) return s.toUpperCase();
  const map = {
    Germany: "DE",
    Deutschland: "DE",
    Austria: "AT",
    Österreich: "AT",
    Switzerland: "CH",
    Schweiz: "CH",
    Italy: "IT",
    Italia: "IT",
    France: "FR",
    Frankreich: "FR",
    Netherlands: "NL",
    Niederlande: "NL",
  };
  return map[s] || "DE";
};

export default function Checkout() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language || "en";
  const items = useSelector(selectCartItems);
  const itemsCount = useSelector(selectCartCount);
  const subtotal = useSelector(selectCartSubtotal);
  const dispatch = useDispatch();

  const [couponCode, setCouponCode] = useState("");
  const [couponInfo, setCouponInfo] = useState(null);
  const [couponErr, setCouponErr] = useState("");

  const navigate = useNavigate();
  const skipCartGuardRef = useRef(false);
  const addressIdRef = useRef(null);
  const isAuth = useSelector((s) => !!s.auth?.access || !!s.auth?.user);
  const authEmail = useSelector((s) => s.auth?.user?.email) || "";

  // Wait for possible localStorage cart before redirecting
  useEffect(() => {
    if (skipCartGuardRef.current) return;
    if (items.length > 0) return; // we have items, do nothing

    // Double-check localStorage (supports your "cart" or "mm_cart" keys)
    try {
      const lsCart =
        JSON.parse(localStorage.getItem("mm_cart") || "[]") ||
        JSON.parse(localStorage.getItem("cart") || "[]");
      if (Array.isArray(lsCart) && lsCart.length > 0) return; // still loading redux, don't redirect
    } catch {}

    // Use a tiny delay to let rehydration finish on slower devices
    const id = setTimeout(() => {
      if (!skipCartGuardRef.current && items.length === 0) {
        navigate("/decorative-products");
      }
    }, 150);
    return () => clearTimeout(id);
  }, [items.length, navigate]);

  const applyCoupon = async () => {
    setCouponErr("");
    try {
      const r = await http.post("coupons/apply/", {
        code: couponCode.trim(),
        items: lineItems,
      });
      if (r.data?.ok) {
        setCouponInfo(r.data);
      } else {
        setCouponInfo(null);
        setCouponErr(r.data?.error || "Invalid coupon");
      }
    } catch (e) {
      setCouponInfo(null);
      setCouponErr(e?.response?.data?.error || "Invalid coupon");
    }
  };

  const shippingFee = 0;
  const discount = useMemo(() => {
    const d = couponInfo?.ok ? Number(couponInfo.discount) : 0;
    return Number.isFinite(d) ? d : 0;
  }, [couponInfo]);

  const payTotal = useMemo(() => {
    const t = subtotal + shippingFee - discount;
    return Number(Math.max(0, t).toFixed(2));
  }, [subtotal, shippingFee, discount]);

  const lineItems = items.map((c) => ({ product_id: c.id, qty: c.qty }));

  // Address form
  const [form, setForm] = useState({
    email: "",
    country: "DE",
    fullName: "",
    street: "",
    houseNumber: "",
    apartment: "",
    postalCode: "",
    city: "",
    telephone: "",
  });
  const countryCode = normalizeCountry(form.country);
  const sepaAllowed = countryCode === "DE";

  const onChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const splitName = (full) => {
    const parts = (full || "").trim().split(/\s+/);
    if (parts.length === 1) return { first_name: parts[0], last_name: "" };
    return {
      first_name: parts.slice(0, -1).join(" "),
      last_name: parts.slice(-1).join(" "),
    };
  };
  const splitAddressLine1 = (line) => {
    const m = (line || "").trim().match(/^(.+?)\s+(\d+[a-zA-Z]?)$/);
    return m
      ? { street: m[1], houseNumber: m[2] }
      : { street: line || "", houseNumber: "" };
  };
  const buildAddressPayload = () => {
    const { first_name, last_name } = splitName(form.fullName);
    return {
      address_id: addressIdRef.current ?? undefined,
      first_name,
      last_name,
      address_line1: `${form.street}${
        form.houseNumber ? ` ${form.houseNumber}` : ""
      }`.trim(),
      address_line2: form.apartment || "",
      postal_code: form.postalCode || "",
      city: form.city || "",
      country: normalizeCountry(form.country),
      phone: form.telephone || "",
      is_default: true,
    };
  };

  // Prefill
  useEffect(() => {
    (async () => {
      if (!isAuth) {
        // Guest: try to hydrate email/address from localStorage if available
        try {
          const savedGuest = JSON.parse(
            localStorage.getItem("guest_address") || "{}"
          );
          if (savedGuest && typeof savedGuest === "object") {
            setForm((p) => ({
              ...p,
              email: savedGuest.email || p.email,
              country: savedGuest.country || p.country,
              fullName:
                [savedGuest.first_name, savedGuest.last_name]
                  .filter(Boolean)
                  .join(" ") || p.fullName,
              ...(() => {
                const { street, houseNumber } = splitAddressLine1(
                  savedGuest.address_line1 || ""
                );
                return {
                  street: street || p.street,
                  houseNumber: houseNumber || p.houseNumber,
                };
              })(),
              apartment: savedGuest.address_line2 || p.apartment,
              postalCode: savedGuest.postal_code || p.postalCode,
              city: savedGuest.city || p.city,
              telephone: savedGuest.phone || p.telephone,
            }));
          }
        } catch {}
        return;
      }

      // Authenticated: prefill from backend (DO NOT redirect on 401)
      try {
        const a = await http.get("dashboard/addresses/", {
          params: { page_size: 20 },
        });
        const list = a.data?.results ?? a.data ?? [];
        const main = list.find((x) => x?.is_default) ?? list[0] ?? null;
        if (main) {
          addressIdRef.current = Number(main.id);
          const line1 =
            main.address_line1 ||
            `${main.street_name || ""} ${main.house_number || ""}`.trim();
          const { street, houseNumber } = splitAddressLine1(line1);
          const computedFullName =
            [main.first_name, main.last_name]
              .filter(Boolean)
              .join(" ")
              .trim() ||
            main.full_name ||
            "";
          setForm((p) => ({
            ...p,
            fullName: computedFullName || p.fullName,
            country: main.country ?? p.country ?? "Germany",
            street,
            houseNumber,
            apartment: main.address_line2 ?? main.apartment ?? p.apartment,
            postalCode: main.postal_code ?? main.pincode ?? p.postalCode,
            city: main.city ?? main.state ?? p.city,
            telephone: main.phone ?? p.telephone,
          }));
        }
      } catch (err) {
        if (err?.response?.status === 401) {
          console.error("Unauthorized when fetching account data");
          return;
        }
      }

      try {
        const u = await http.get("dashboard/account/");
        setForm((p) => ({ ...p, email: u.data?.email || p.email }));
      } catch (err) {
        if (err?.response?.status === 401) {
          console.error("Unauthorized when fetching account data");
          return;
        }
      }
    })();
  }, [navigate, isAuth]);

  useEffect(() => {
    const saved = localStorage.getItem("coupon_auto");
    if (saved && !couponInfo?.ok && !couponCode) {
      setCouponCode(saved.toUpperCase());
      (async () => {
        try {
          const r = await http.post("coupons/apply/", {
            code: saved,
            items: lineItems,
          });
          if (r.data?.ok) {
            setCouponInfo(r.data);
          }
        } catch {}
      })();
    }
  }, [couponCode, couponInfo, lineItems]);

  // Save address
  const [savingAddr, setSavingAddr] = useState(false);
  const [addrSaved, setAddrSaved] = useState(false);
  const saveAddress = async () => {
    setSavingAddr(true);
    try {
      const payload = buildAddressPayload();
      if (isAuth) {
        if (addressIdRef.current) {
          await http.put(
            `dashboard/addresses/${addressIdRef.current}/`,
            payload
          );
          setAddrSaved(true);
          setTimeout(() => setAddrSaved(false), 2000);
        } else {
          const r = await http.post("dashboard/addresses/", payload);
          addressIdRef.current = r.data?.id ?? null;
          setAddrSaved(true);
        }
      } else {
        // Guest path: store locally so we can reuse during this session
        localStorage.setItem(
          "guest_address",
          JSON.stringify({ ...payload, email: form.email })
        );
        addressIdRef.current = null; // no server id for guests
        setAddrSaved(true);
      }
    } catch {
      setAddrSaved(false);
      alert("Failed to save address.");
    } finally {
      setSavingAddr(false);
    }
  };

  // wipe cart after success
  const wipeCart = useCallback(() => {
    skipCartGuardRef.current = true;
    dispatch(clearCart());
    try {
      localStorage.removeItem("cart");
      localStorage.removeItem("mm_cart");
    } catch {}
  }, [dispatch]);

  const onSuccessfulOrder = (id) => {
    wipeCart();
    if (id) navigate(`/checkout/success?order=${id}`);
    else navigate("/dashboard/orders");
  };

  const [payment, setPayment] = useState("");

  const setPaymentSafe = useCallback((next) => {
    setPayment(next);
    // if leaving card, clear card months
    if (!next.startsWith("card")) setCardMonths(null);
    // if leaving sepa, clear sepa months
    if (!next.startsWith("sepa")) setSepaMonths(null);
    // if choosing a base method (not installments), ensure its own months are cleared
    if (next === "card") setCardMonths(null);
    if (next === "sepa_debit") setSepaMonths(null);
  }, []);

  const [cardMonths, setCardMonths] = useState(null);
  const [sepaMonths, setSepaMonths] = useState(null);

  const localOrderIdRef = useRef(null);

  const hasMinimalAddress = () => {
    const needed = [
      "email",
      "fullName",
      "street",
      "postalCode",
      "city",
      "country",
    ];
    return needed.every((k) => (form[k] || "").toString().trim().length > 0);
  };

  const handleCountryChange = (e) => {
    const newCode = normalizeCountry(e.target.value);

    const isDEOnlyMethod =
      payment === "sepa_debit" ||
      payment === "bank" ||
      payment.startsWith("sepa_installments");

    if (isDEOnlyMethod && newCode !== "DE") {
      alert(
        "⚠️ Direct Bank Transfer / SEPA is only available in Germany (DE). Please choose Germany or select another payment method."
      );
      setForm((prev) => ({ ...prev, country: "DE" })); // revert to DE
      return;
    }

    setForm((prev) => ({ ...prev, country: newCode }));
  };

  // Safety net: if payment is DE-only and country changes elsewhere
  useEffect(() => {
    const code = normalizeCountry(form.country);
    if (
      (payment === "sepa_debit" ||
        payment === "bank" ||
        payment.startsWith("sepa_installments")) &&
      code !== "DE"
    ) {
      setForm((prev) => ({ ...prev, country: "DE" }));
    }
  }, [payment, form.country]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-2">
            {t("checkout.contact")}
          </h2>
          <input
            name="email"
            type="email"
            placeholder={t("checkout.emailPlaceholder")}
            value={form.email}
            onChange={onChange}
            className="w-full border rounded px-3 py-2 mb-4"
          />

          <h2 className="text-lg font-semibold mb-2">
            {t("checkout.delivery")}
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            {t("checkout.deliveryNote")}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className="text-sm text-gray-600">
                {t("checkout.country")}
              </label>

              {/** read grouped data from i18n */}
              {/** `returnObjects: true` lets us get nested objects */}
              {(() => {
                const groups = t("countryGroups", { returnObjects: true });
                const grouped = t("countries", { returnObjects: true });

                const isGrouped =
                  grouped &&
                  typeof grouped === "object" &&
                  !Array.isArray(grouped) &&
                  Object.values(grouped).every(
                    (v) => v && typeof v === "object"
                  );

                if (!isGrouped) {
                  // Flat fallback for early setups
                  const flat =
                    grouped && typeof grouped === "object"
                      ? grouped
                      : {
                          DE: "Germany",
                          AT: "Austria",
                          CH: "Switzerland",
                          IT: "Italy",
                          FR: "France",
                          NL: "Netherlands",
                        };
                  return (
                    <select
                      name="country"
                      value={form.country}
                      onChange={handleCountryChange}
                      className="w-full border rounded px-3 py-2"
                    >
                      {Object.entries(flat).map(([code, label]) => (
                        <option key={code} value={code}>
                          {label}
                        </option>
                      ))}
                    </select>
                  );
                }

                return (
                  <select
                    name="country"
                    value={form.country}
                    onChange={handleCountryChange}
                    className="w-full border rounded px-3 py-2"
                  >
                    {Object.entries(grouped).map(([groupKey, countryMap]) => (
                      <optgroup
                        key={groupKey}
                        label={(groups && groups[groupKey]) || groupKey}
                      >
                        {Object.entries(countryMap).map(([code, label]) => (
                          <option key={code} value={code}>
                            {label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                );
              })()}
            </div>

            <div className="md:col-span-2">
              <label className="text-sm text-gray-600">
                {" "}
                {t("checkout.fullName")}
              </label>
              <input
                name="fullName"
                value={form.fullName}
                onChange={onChange}
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm text-gray-600">
                {" "}
                {t("checkout.streetAddress")}
              </label>
              <input
                name="street"
                value={form.street}
                onChange={onChange}
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="text-sm text-gray-600">
                {" "}
                {t("checkout.houseNumber")}
              </label>
              <input
                name="houseNumber"
                value={form.houseNumber}
                onChange={onChange}
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="text-sm text-gray-600">
                {" "}
                {t("checkout.apartment")}
              </label>
              <input
                name="apartment"
                value={form.apartment}
                onChange={onChange}
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="text-sm text-gray-600">
                {" "}
                {t("checkout.postalCode")}
              </label>
              <input
                name="postalCode"
                value={form.postalCode}
                onChange={onChange}
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="text-sm text-gray-600">
                {" "}
                {t("checkout.city")}
              </label>
              <input
                name="city"
                value={form.city}
                onChange={onChange}
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm text-gray-600">
                {" "}
                {t("checkout.telephone")}
              </label>
              <input
                name="telephone"
                value={form.telephone}
                onChange={onChange}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <button
              onClick={saveAddress}
              disabled={savingAddr}
              className="px-4 py-2 rounded bg-gray-900 text-white hover:bg-black disabled:opacity-60"
            >
              {savingAddr ? t("checkout.saving") : t("checkout.saveAddress")}
            </button>
            {addrSaved && (
              <span className="text-green-600 self-center">
                {t("checkout.saved")} ✓
              </span>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-3">
            {t("checkout.shipment")}
          </h2>
          <div className="flex items-center justify-between border rounded p-3">
            <div className="text-sm">{t("checkout.standardShipping")}</div>
            <div className="text-sm font-semibold">
              {shippingFee === 0
                ? t("checkout.free")
                : fmtEUR(shippingFee, locale)}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-2">
            {t("checkout.payment")}
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            {t("checkout.deliveryNote")}
          </p>
          {!payment && (
            <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 mb-3">
              Please choose a payment method to continue.
            </div>
          )}
          <StripeCard
            active={payment === "card"}
            setActive={() => setPaymentSafe("card")}
            lineItems={lineItems}
            addressPayload={buildAddressPayload()}
            setLocalOrderId={(id) => (localOrderIdRef.current = id)}
            onSuccess={() => onSuccessfulOrder(localOrderIdRef.current)}
            total={payTotal}
            couponCode={couponCode}
            couponInfo={couponInfo}
            customerEmail={authEmail || form.email || ""}
          />

          {/* CARD installments */}
          {payment.startsWith("card") && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-blue-700 bg-blue-50 border border-blue-100 rounded px-2 py-1">
                  0% financing with card
                </div>
                <div className="text-sm text-gray-600">
                  Choose term:
                  <span className="ml-2 inline-flex gap-2">
                    {[3, 6, 9].map((m) => (
                      <button
                        key={`card-${m}`}
                        type="button"
                        onClick={() => {
                          setCardMonths((prev) => {
                            const same = prev === m;
                            const nextMonths = same ? null : m;
                            setPaymentSafe(
                              same ? "card" : `card_installments_${m}`
                            );
                            return nextMonths;
                          });
                        }}
                        className={`px-2 py-1 rounded border text-sm ${
                          cardMonths === m
                            ? "bg-blue-600 text-white border-blue-600"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        {m} months
                      </button>
                    ))}
                  </span>
                </div>
              </div>

              {cardMonths ? (
                <div className="text-sm text-gray-700 mb-3">
                  <div className="font-medium">
                    Monthly payments ({cardMonths}):{" "}
                    {(() => {
                      const parts = splitInstallments(payTotal, cardMonths);
                      return Array.isArray(parts) && parts.length > 0
                        ? parts.map((amt) => fmtEUR(amt, locale)).join(" • ")
                        : fmtEUR(payTotal, locale);
                    })()}
                  </div>
                  <div className="text-xs text-gray-500">
                    Note: last month may differ by a few cents due to rounding.
                  </div>
                </div>
              ) : null}

              {cardMonths && (
                <StripeCardInstallments
                  active={payment === `card_installments_${cardMonths}`}
                  setActive={() =>
                    setPaymentSafe(`card_installments_${cardMonths}`)
                  }
                  months={cardMonths}
                  lineItems={lineItems}
                  addressPayload={buildAddressPayload()}
                  setLocalOrderId={(id) => (localOrderIdRef.current = id)}
                  onSuccess={() => onSuccessfulOrder(localOrderIdRef.current)}
                  total={payTotal}
                  couponCode={couponCode}
                  couponInfo={couponInfo}
                />
              )}
            </div>
          )}
          <PayPalScriptProvider
            options={{
              clientId: process.env.REACT_APP_PAYPAL_CLIENT_ID || "",
              currency: "EUR",
              intent: "capture",
              components: "buttons",
              locale: i18n.language === "de" ? "de_DE" : "en_US",
              disableFunding: "card",
            }}
          >
            <label className="flex items-center gap-3 border rounded p-3 cursor-pointer">
              <input
                type="radio"
                name="payment"
                value="paypal"
                checked={payment === "paypal"}
                onChange={() => setPaymentSafe("paypal")}
              />
              <span className="flex-1">PayPal</span>
              <span className="text-xs font-semibold text-[#003087]">
                PayPal
              </span>
            </label>

            {payment === "paypal" && (
              <div className="border rounded p-3">
                <PayPalButtons
                  fundingSource="paypal"
                  style={{ layout: "horizontal", label: "paypal" }}
                  onClick={async (_, actions) => {
                    if (!hasMinimalAddress()) {
                      alert(t("checkout.saveAddressFirst"));
                      return actions.reject();
                    }
                    return actions.resolve();
                  }}
                  createOrder={async () => {
                    try {
                      const res = await http.post(
                        "payments/paypal/create-order/",
                        {
                          items: lineItems,
                          payment_method: "paypal",
                          ...buildAddressPayload(),
                          coupon_code: (
                            couponCode ||
                            couponInfo?.code ||
                            ""
                          ).trim(),
                        }
                      );
                      localOrderIdRef.current = res.data.order_id;
                      return res.data.id;
                    } catch (e) {
                      alert("Failed to create PayPal order.");
                      throw e;
                    }
                  }}
                  onApprove={async (data) => {
                    try {
                      const cap = await http.post(
                        `payments/paypal/capture/${data.orderID}/`,
                        {
                          local_order_id: localOrderIdRef.current,
                        }
                      );
                      if (cap.data?.status === "COMPLETED") {
                        onSuccessfulOrder(localOrderIdRef.current);
                      } else {
                        alert("Payment capture failed.");
                      }
                    } catch (e) {
                      alert("Capture request failed.");
                      throw e;
                    }
                  }}
                />
              </div>
            )}
          </PayPalScriptProvider>

          <label className="flex items-center gap-3 border rounded p-3 cursor-pointer mt-3">
            <input
              type="radio"
              name="payment"
              value="sepa_debit"
              checked={payment === "sepa_debit"}
              onChange={() => {
                if (!sepaAllowed) {
                  alert(
                    "SEPA Lastschrift ist nur in Deutschland (DE) verfügbar."
                  );
                  return;
                }
                setPaymentSafe("sepa_debit");
              }}
              disabled={!sepaAllowed}
            />
            <span className="flex-1">SEPA Lastschrift — DE only</span>
          </label>
          {payment === "sepa_debit" && (
            <StripeSepa
              active
              setActive={() => setPaymentSafe("sepa_debit")}
              lineItems={lineItems}
              addressPayload={buildAddressPayload()}
              setLocalOrderId={(id) => (localOrderIdRef.current = id)}
              onSuccess={() => onSuccessfulOrder(localOrderIdRef.current)}
              form={form}
              total={payTotal}
              couponCode={couponCode}
              couponInfo={couponInfo}
            />
          )}

          {/* SEPA installments */}
          {(payment === "sepa_debit" ||
            payment.startsWith("sepa_installments")) && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-green-700 bg-green-50 border border-green-100 rounded px-2 py-1">
                  0% Finanzierung verfügbar
                </div>
                <div className="text-sm text-gray-600">
                  Wählen Sie die Laufzeit:
                  <span className="ml-2 inline-flex gap-2">
                    {[3, 6, 9].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          setSepaMonths((prev) => {
                            const same = prev === m;
                            const nextMonths = same ? null : m;
                            setPaymentSafe(
                              same ? "sepa_debit" : `sepa_installments_${m}`
                            );
                            return nextMonths;
                          });
                        }}
                        className={`px-2 py-1 rounded border text-sm ${
                          sepaMonths === m
                            ? "bg-pink-600 text-white border-pink-600"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        {m} Monate
                      </button>
                    ))}
                  </span>
                </div>
              </div>

              {sepaMonths ? (
                <div className="text-sm text-gray-700 mb-3">
                  <div className="font-medium">
                    Monatsraten ({sepaMonths}):{" "}
                    {(() => {
                      const parts = splitInstallments(payTotal, sepaMonths);
                      return Array.isArray(parts) && parts.length > 0
                        ? parts.map((amt) => fmtEUR(amt, locale)).join(" • ")
                        : fmtEUR(payTotal, locale);
                    })()}
                  </div>
                  <div className="text-xs text-gray-500">
                    Hinweis: Die letzte Rate kann wegen Rundung ein paar Cent
                    abweichen.
                  </div>
                </div>
              ) : null}

              {sepaMonths && (
                <StripeSepaInstallments
                  active={payment === `sepa_installments_${sepaMonths}`}
                  setActive={() =>
                    setPaymentSafe(`sepa_installments_${sepaMonths}`)
                  }
                  months={sepaMonths}
                  lineItems={lineItems}
                  addressPayload={buildAddressPayload()}
                  setLocalOrderId={(id) => (localOrderIdRef.current = id)}
                  onSuccess={() => onSuccessfulOrder(localOrderIdRef.current)}
                  form={form}
                  total={payTotal}
                  couponCode={couponCode}
                  couponInfo={couponInfo}
                />
              )}
            </div>
          )}

          {/* Direct bank transfer*/}
          <label className="flex items-center gap-3 border rounded p-3 cursor-pointer mt-3">
            <input
              type="radio"
              name="payment"
              value="bank"
              checked={payment === "bank"}
              onChange={() => setPaymentSafe("bank")}
            />
            <span className="flex-1">{t("checkout.bank")}</span>
            <span className="text-xs">{t("checkout.ibanbic")}</span>
          </label>
          {payment === "bank" && (
            <div className="border rounded p-3 space-y-3">
              <p className="text-sm text-gray-600">{t("checkout.bankNote")}</p>
              <button
                onClick={async () => {
                  try {
                    const res = await http.post("payments/bank/create/", {
                      items: lineItems,
                      ...buildAddressPayload(),
                      coupon_code: (
                        couponCode ||
                        couponInfo?.code ||
                        ""
                      ).trim(),
                    });
                    const id =
                      res.data?.order_id ?? res.data?.order?.id ?? null;

                    sessionStorage.setItem(
                      "bank_checkout_info",
                      JSON.stringify({
                        order_id: id,
                        order_number: res.data?.order_number,
                        amount: res.data?.amount,
                        iban: res.data?.iban,
                        bic: res.data?.bic,
                        beneficiary: res.data?.beneficiary,
                        reference: res.data?.reference,
                        instructions: res.data?.instructions,
                      })
                    );
                    onSuccessfulOrder(id);
                  } catch {
                    alert(t("checkout.bankCreateFailed"));
                  }
                }}
                className="w-full py-3 rounded bg-gray-900 text-white font-semibold hover:bg-black"
              >
                {t("checkout.placeBankOrder", {
                  total: fmtEUR(payTotal, locale),
                  defaultValue: "Place order (bank transfer) — {{total}}",
                })}
              </button>
            </div>
          )}

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-700">
            <Badge
              icon={<ShieldCheck className="w-4 h-4" />}
              text={t("checkout.badgeSecure")}
            />
            <Badge
              icon={<RotateCcw className="w-4 h-4" />}
              text={t("checkout.badgeReturn")}
            />
            <Badge
              icon={<Truck className="w-4 h-4" />}
              text={t("checkout.badgeDelivery")}
            />
          </div>
        </div>
      </div>

      {/* RIGHT summary */}
      <aside className="lg:col-span-1">
        <div className="bg-white rounded-lg shadow p-6 sticky top-24">
          <h2 className="text-xl font-semibold mb-4">
            {t("checkout.overview")}
          </h2>
          <div className="space-y-4">
            {items.map((it) => (
              <div key={it.id} className="flex items-center gap-3">
                <div className="relative">
                  <img
                    src={it.image}
                    alt={it.name}
                    className="w-16 h-16 object-cover rounded"
                  />
                  <span className="absolute -top-2 -right-2 bg-black text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                    {it.qty}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">{it.name}</div>
                </div>
                <div className="font-medium text-sm">
                  {fmtEUR(it.price * it.qty, locale)}
                </div>
              </div>
            ))}
          </div>

          <hr className="my-4" />
          <div className="mt-3 border rounded p-3 space-y-2">
            <div className="flex gap-2">
              <input
                className="flex-1 border rounded px-3 py-2"
                placeholder="Coupon code"
                value={couponCode}
                onChange={(e) =>
                  setCouponCode((e.target.value || "").toUpperCase())
                }
              />
              <button
                onClick={applyCoupon}
                className="px-4 py-2 rounded bg-gray-900 text-white"
              >
                Apply
              </button>
            </div>
            {couponErr && (
              <div className="text-red-600 text-sm">{couponErr}</div>
            )}
            {couponInfo?.ok && (
              <div className="text-green-700 text-sm">
                Applied <b>{couponInfo.code}</b>: −{couponInfo.discount} €
              </div>
            )}
          </div>
          {discount > 0 && couponInfo?.code && (
            <Row
              label={`Coupon (${couponInfo.code})`}
              value={`− ${fmtEUR(discount, locale)}`}
            />
          )}

          <Row
            label={t("checkout.subtotal", { count: itemsCount })}
            value={fmtEUR(subtotal, locale)}
          />
          <Row
            label={t("checkout.shipmentShort", "Shipment")}
            value={
              shippingFee === 0
                ? t("checkout.free")
                : fmtEUR(shippingFee, locale)
            }
          />
          <div className="flex items-center justify-between mt-2">
            <div className="text-base font-semibold">
              {t("checkout.inTotal")}
            </div>
            <div className="text-base font-semibold">
              {fmtEUR(payTotal, locale)}
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {t("checkout.inclTax")}
          </div>

          <Link
            to="/cart"
            className="mt-5 inline-block w-full text-center py-2 rounded border hover:bg-gray-50"
          >
            {t("checkout.backToCart")}
          </Link>
        </div>
      </aside>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between text-sm mt-1">
      <div className="text-gray-600">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function Badge({ icon, text }) {
  return (
    <div className="flex items-center gap-2">
      <div className="p-1 bg-gray-100 rounded">{icon}</div>
      <span>{text}</span>
    </div>
  );
}
