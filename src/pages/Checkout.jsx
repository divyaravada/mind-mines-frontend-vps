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

import { useTranslation } from "react-i18next";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

import StripeSepa from "../components/StripeSepa";
import StripeSepaInstallments from "../components/StripeSepaInstallments";
import StripeCard from "../components/StripeCard";
import StripeCardInstallments from "../components/StripeCardInstallments";

import { usePreviewCouponMutation } from "../features/promos/promosApi";
import {
  normalizeCountry,
  buildOrderPayload,
  buildAddressPayload,
} from "../utils/orderPayload";
import {
  usePaypalCaptureOrderMutation,
  usePaypalCreateOrderMutation,
} from "../features/payments/paymentsApi";

import { useGetAccountQuery } from "../features/account/accountApi";

import {
  useGetAddressesQuery,
  useCreateAddressMutation,
  useUpdateAddressMutation,
} from "../features/addresses/addressApi";
import { fmtEUR } from "../lib/money";

const toCents = (n) => Math.round(Number(n || 0) * 100);

const splitInstallments = (total, months) => {
  const tc = toCents(total);
  const base = Math.floor(tc / months);
  const rem = tc - base * months;
  const parts = Array(months).fill(base);
  if (rem) parts[months - 1] += rem;
  return parts.map((c) => c / 100);
};

export default function Checkout() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language || "en";
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const items = useSelector(selectCartItems);
  const itemsCount = useSelector(selectCartCount);
  const subtotal = useSelector(selectCartSubtotal);

  const isAuth = useSelector((s) => !!s.auth?.access || !!s.auth?.user);

  const [previewCoupon] = usePreviewCouponMutation();

  const [paypalCreateOrder] = usePaypalCreateOrderMutation();
  const [paypalCaptureOrder] = usePaypalCaptureOrderMutation();

  const { data: acct } = useGetAccountQuery(undefined, { skip: !isAuth });

  // addresses for logged-in users
  const { data: addrListRaw, isFetching: addrLoading } = useGetAddressesQuery(
    undefined,
    { skip: !isAuth }
  );

  // Address/delivery form
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

  // coupon state
  const [couponCode, setCouponCode] = useState("");
  const [couponInfo, setCouponInfo] = useState(null);
  const [couponErr, setCouponErr] = useState("");

  const skipCartGuardRef = useRef(false);

  // Normalize backend address list responses
  const addrList = Array.isArray(addrListRaw)
    ? addrListRaw
    : Array.isArray(addrListRaw?.results)
    ? addrListRaw.results
    : Array.isArray(addrListRaw?.addresses)
    ? addrListRaw.addresses
    : [];

  // which address we are editing
  const addressIdRef = useRef(null);

  const [createAddress] = useCreateAddressMutation();
  const [updateAddress] = useUpdateAddressMutation();

  // Prefill address from account default
  useEffect(() => {
    if (
      !isAuth ||
      addrLoading ||
      !Array.isArray(addrList) ||
      addrList.length === 0
    )
      return;

    const splitAddressLine1 = (line) => {
      const m = (line || "").trim().match(/^(.+?)\s+(\d+[a-zA-Z]?)$/);
      return m
        ? { street: m[1], houseNumber: m[2] }
        : { street: line || "", houseNumber: "" };
    };

    const main = addrList.find((x) => x?.is_default) ?? addrList[0];
    if (main) {
      addressIdRef.current = Number(main.id);
      const line1 =
        main.address_line1 ||
        `${main.street_name || ""} ${main.house_number || ""}`.trim();
      const { street, houseNumber } = splitAddressLine1(line1);
      const fullName =
        [main.first_name, main.last_name].filter(Boolean).join(" ") ||
        main.full_name ||
        "";

      setForm((p) => ({
        ...p,
        email: acct?.email || p.email,
        fullName,
        country: main.country || "DE",
        street,
        houseNumber,
        apartment: main.address_line2 || "",
        postalCode: main.postal_code || "",
        city: main.city || "",
        telephone: main.phone || "",
      }));
    }
  }, [addrList, addrLoading, isAuth, acct?.email]);

  // guard: don't allow checkout if cart is really empty
  useEffect(() => {
    if (skipCartGuardRef.current) return;
    if (items.length > 0) return;

    try {
      // use correct key from cartSlice
      const raw = localStorage.getItem("cart_v1");
      const lsItems = raw ? JSON.parse(raw) : [];
      if (Array.isArray(lsItems) && lsItems.length > 0) return;
    } catch {
      /* ignore */
    }

    const id = setTimeout(() => {
      if (!skipCartGuardRef.current && items.length === 0) {
        navigate("/decorative-products");
      }
    }, 150);
    return () => clearTimeout(id);
  }, [items.length, navigate]);

  // shipping right now is flat 0
  const shippingFee = 0;

  // these `backendItems` are what we send to serializer
  const backendItems = useMemo(
    () =>
      items.map((c) => ({
        product_id: c.id,
        qty: c.qty,
      })),
    [items]
  );

  // fill in email if we got it from account
  useEffect(() => {
    if (acct?.email) {
      setForm((p) => ({ ...p, email: p.email || acct.email }));
    }
  }, [acct]);

  // override email from accountData again (in case it arrives later)
  const { data: accountData } = useGetAccountQuery(undefined, {
    skip: !isAuth,
  });
  useEffect(() => {
    if (accountData?.email) {
      setForm((p) => ({ ...p, email: p.email || accountData.email }));
    }
  }, [accountData]);

  // coupon preview apply
  const applyCoupon = async () => {
    setCouponErr("");
    setCouponInfo(null);

    const code = (couponCode || "").trim().toUpperCase();
    if (!code) return;

    try {
      // Standardize on { code, items }
      const r = await previewCoupon({ code, items: backendItems }).unwrap();
      if (r?.ok) {
        setCouponInfo(r);
      } else {
        setCouponErr(r?.error || t("checkout.couponInvalid", "Invalid coupon"));
      }
    } catch (e) {
      setCouponErr(
        e?.data?.error || t("checkout.couponInvalid", "Invalid coupon")
      );
    }
  };

  // auto-apply coupon if stored
  useEffect(() => {
    const saved = localStorage.getItem("coupon_auto");
    if (!saved || couponInfo?.ok || couponCode) return;
    (async () => {
      try {
        const r = await previewCoupon({
          code: saved,
          items: backendItems,
        }).unwrap();
        if (r?.ok) {
          setCouponCode(saved.toUpperCase());
          setCouponInfo(r);
        }
      } catch {
        /* ignore */
      }
    })();
  }, [couponCode, couponInfo, backendItems, previewCoupon]);

  // computed discounts, totals
  const discount = useMemo(() => {
    const d = couponInfo?.ok ? Number(couponInfo.discount) : 0;
    return Number.isFinite(d) ? d : 0;
  }, [couponInfo]);

  const payTotal = useMemo(() => {
    const t = subtotal + shippingFee - discount;
    return Number(Math.max(0, t).toFixed(2));
  }, [subtotal, shippingFee, discount]);

  // address save status
  const [savingAddr, setSavingAddr] = useState(false);
  const [addrSaved, setAddrSaved] = useState(false);

  const saveAddress = async () => {
    setSavingAddr(true);
    try {
      const payload = buildAddressPayload(form, addressIdRef);
      if (addressIdRef.current) {
        await updateAddress({ id: addressIdRef.current, ...payload }).unwrap();
      } else {
        const res = await createAddress(payload).unwrap();
        addressIdRef.current = res?.id ?? null;
      }
      setAddrSaved(true);
      setTimeout(() => setAddrSaved(false), 1800);
    } catch (e) {
      const msg =
        e?.data?.detail ||
        e?.data?.non_field_errors?.[0] ||
        e?.error ||
        "Failed to save address.";
      alert(msg);
    } finally {
      setSavingAddr(false);
    }
  };

  // wipe cart after success
  const wipeCart = useCallback(() => {
    skipCartGuardRef.current = true;
    dispatch(clearCart());
    try {
      localStorage.removeItem("cart_v1");
    } catch {
      /* ignore */
    }
  }, [dispatch]);

  const onSuccessfulOrder = (id) => {
    wipeCart();
    if (id) {
      navigate(`/checkout/success?order=${id}`);
    } else {
      navigate("/account/orders/");
    }
  };

  // state for payment UI
  const [payment, setPayment] = useState("");
  const setPaymentSafe = useCallback((next) => setPayment(next), []);
  const [cardMonths, setCardMonths] = useState(null);
  const [sepaMonths, setSepaMonths] = useState(null);
  const localOrderIdRef = useRef(null);

  const [savedCardPaymentMethodId] = useState(null);
  const [savedSepaPaymentMethodId] = useState(null);

  // validate minimum required address fields
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

  // handle country changes and payment restrictions
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
      setForm((prev) => ({ ...prev, country: "DE" }));
      return;
    }

    setForm((prev) => ({ ...prev, country: newCode }));
  };

  const countryCode = normalizeCountry(form.country);
  const deOnlyMethod =
    payment === "sepa_debit" || payment.startsWith("sepa_installments");
  useEffect(() => {
    if (deOnlyMethod && countryCode !== "DE") {
      setForm((prev) => ({ ...prev, country: "DE" }));
    }
  }, [countryCode, deOnlyMethod]);

  const renderPayPalSection = () => (
    <PayPalScriptProvider
      options={{
        clientId: process.env.REACT_APP_PAYPAL_CLIENT_ID || "",
        currency: "EUR",
        intent: "capture",
        components: "buttons",
        locale: i18n.language === "de" ? "de_DE" : "en_US",
      }}
    >
      <label className="flex items-center gap-3 border rounded p-3 cursor-pointer mt-3">
        <input
          type="radio"
          name="payment"
          value="paypal"
          checked={payment === "paypal"}
          onChange={() => setPaymentSafe("paypal")}
        />
        <span className="flex-1">PayPal / PayPal Pay Later</span>
        <span className="text-xs font-semibold text-[#003087]">PayPal</span>
      </label>

      {payment === "paypal" && (
        <div className="border rounded p-3">
          <PayPalButtons
            fundingSource={undefined} // allow PayPal to offer Pay Later
            style={{ layout: "horizontal", label: "paypal" }}
            onClick={async (_, actions) => {
              if (!hasMinimalAddress()) {
                alert("Please fill in contact + delivery first.");
                return actions.reject();
              }
              return actions.resolve();
            }}
            createOrder={async () => {
              const orderPayload = {
                email: form.email,
                payment_method: "paypal",
                coupon_code: couponCode,
                items: items.map((c) => ({
                  product_id: c.id,
                  qty: c.qty,
                })),
                shipping: {
                  first_name: form.fullName.split(" ")[0] || form.fullName,
                  last_name: form.fullName.split(" ").slice(1).join(" "),
                  line1: `${form.street} ${form.houseNumber}`.trim(),
                  line2: form.apartment || "",
                  postal_code: form.postalCode,
                  city: form.city,
                  country: normalizeCountry(form.country),
                  phone: form.telephone || "",
                },
              };

              const res = await paypalCreateOrder(orderPayload).unwrap();
              localOrderIdRef.current = res?.order_id;
              return res?.id; // PayPal order id
            }}
            onApprove={async (data) => {
              const cap = await paypalCaptureOrder({
                paypalOrderId: data.orderID,
                localOrderId: localOrderIdRef.current,
              }).unwrap();

              if (cap?.status === "COMPLETED") {
                onSuccessfulOrder(localOrderIdRef.current);
              } else {
                alert("Payment capture failed.");
              }
            }}
          />
        </div>
      )}
    </PayPalScriptProvider>
  );

  // UI for card installments choice
  const renderCardInstallmentsBlock = () => (
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
                    const next = same ? null : m;
                    setPaymentSafe(same ? "card" : `card_installments_${m}`);
                    return next;
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

      {cardMonths && (
        <StripeCardInstallments
          active={payment === `card_installments_${cardMonths}`}
          setActive={() => setPaymentSafe(`card_installments_${cardMonths}`)}
          months={cardMonths}
          form={form}
          items={items}
          couponCode={couponCode}
          paymentMethodId={savedCardPaymentMethodId}
          setLocalOrderId={(id) => (localOrderIdRef.current = id)}
          onSuccess={(id) => onSuccessfulOrder(id)}
        />
      )}
    </div>
  );

  // UI for SEPA installments (DE only)
  const renderSepaInstallmentsBlock = () => (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-green-700 bg-green-50 border border-green-100 rounded px-2 py-1">
          0% Finanzierung (SEPA Lastschrift)
        </div>
        <div className="text-sm text-gray-600">
          Laufzeit:
          <span className="ml-2 inline-flex gap-2">
            {[3, 6, 9].map((m) => (
              <button
                key={`sepa-${m}`}
                type="button"
                onClick={() => {
                  setSepaMonths((prev) => {
                    const same = prev === m;
                    const next = same ? null : m;
                    setPaymentSafe(
                      same ? "sepa_debit" : `sepa_installments_${m}`
                    );
                    return next;
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

      {sepaMonths && (
        <StripeSepaInstallments
          active={payment === `sepa_installments_${sepaMonths}`}
          setActive={() => setPaymentSafe(`sepa_installments_${sepaMonths}`)}
          months={sepaMonths}
          form={form}
          items={items}
          couponCode={couponCode}
          paymentMethodId={savedSepaPaymentMethodId}
          countryCode={normalizeCountry(form.country)}
          setLocalOrderId={(id) => (localOrderIdRef.current = id)}
          onSuccess={(id) => onSuccessfulOrder(id)}
        />
      )}
    </div>
  );

  // redirect away if cart is empty
  useEffect(() => {
    if (skipCartGuardRef.current) return;
    if (items.length > 0) return;

    try {
      const raw = localStorage.getItem("cart_v1");
      const lsItems = raw ? JSON.parse(raw) : [];
      if (Array.isArray(lsItems) && lsItems.length > 0) return;
    } catch {}

    const id = setTimeout(() => {
      if (!skipCartGuardRef.current && items.length === 0) {
        navigate("/decorative-products");
      }
    }, 150);
    return () => clearTimeout(id);
  }, [items.length, navigate]);

  const fmtEUR = (n) => {
    try {
      return new Intl.NumberFormat(i18n.language || "en", {
        style: "currency",
        currency: "EUR",
      }).format(n);
    } catch {
      return `${Number(n || 0).toFixed(2)} €`;
    }
  };

  const onChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  // ---- RENDER ----
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        {/* Contact + Address */}
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
            {/* Country dropdown */}
            <div className="md:col-span-2">
              <label className="text-sm text-gray-600">
                {t("checkout.country")}
              </label>
              {(() => {
                // reading options from i18n if available
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
                  const fallback =
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
                      {Object.entries(fallback).map(([code, label]) => (
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

        {/* Shipping */}
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

        {/* Payment */}
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

          {/* Stripe Card / Klarna / Giropay / Sofort */}
          <StripeCard
            active={
              payment === "card" || payment.startsWith("card_installments")
            }
            setActive={(val) => setPaymentSafe(val)}
            form={form}
            items={items}
            couponCode={couponCode}
            total={payTotal}
            customerEmail={form.email}
            setLocalOrderId={(id) => (localOrderIdRef.current = id)}
            getPendingOrderId={() => localOrderIdRef.current}
            onSuccess={() => onSuccessfulOrder(localOrderIdRef.current)}
          />

          {/* Card installments */}
          {renderCardInstallmentsBlock()}

          {/* PayPal / PayPal Pay Later */}
          {renderPayPalSection()}

          <StripeSepa
            active={
              payment === "sepa_debit" ||
              payment.startsWith("sepa_installments")
            }
            setActive={(val) => setPaymentSafe(val)}
            form={form}
            items={items}
            couponCode={couponCode}
            total={payTotal}
            customerEmail={form.email}
            setLocalOrderId={(id) => (localOrderIdRef.current = id)}
            onSuccess={(id) => onSuccessfulOrder(id || localOrderIdRef.current)}
          />

          {/* SEPA installments (DE only) */}
          {renderSepaInstallmentsBlock()}

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

      {/* RIGHT Summary */}
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
                {t("checkout.apply", "Apply")}
              </button>
            </div>
            {couponErr && (
              <div className="text-red-600 text-sm">{couponErr}</div>
            )}
            {couponInfo?.ok && (
              <div className="text-green-700 text-sm">
                {t("checkout.applied", "Applied")} <b>{couponInfo.code}</b>: −
                {couponInfo.discount} €
              </div>
            )}
          </div>

          {couponInfo?.ok && couponInfo.code && Number(discount) > 0 && (
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
