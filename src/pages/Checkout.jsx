import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ShieldCheck, Truck, RotateCcw } from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import {
  selectCartItems,
  selectCartCount,
  clearCart,
} from "../features/cart/cartSlice";

import { useTranslation } from "react-i18next";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

import StripeSepa from "../components/StripeSepa";
import StripeSepaInstallments from "../components/StripeSepaInstallments";
import StripeCard from "../components/StripeCard";
import StripeCardInstallments from "../components/StripeCardInstallments";

import { usePreviewCouponMutation } from "../features/promos/promosApi";
import { normalizeCountry, buildAddressPayload } from "../utils/invoice";
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
import { useCreateOrderMutation } from "../features/orders/ordersApi";
import StripeProvider from "../components/StripeProvider";
import http from "../services/http";
import StripeRedirectPay from "../components/StripeRedirectPay";

const inputCls =
  "w-full rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900/60 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-backnewswhite/80 focus:border-transparent transition";

export default function Checkout() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language || "en";
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();

  const items = useSelector(selectCartItems);
  const itemsCount = useSelector(selectCartCount);
  // compute subtotal here so it respects priceRange when price is 0
  const subtotal = useMemo(
    () =>
      items.reduce((sum, it) => {
        const unitPrice =
          it.price && Number(it.price) > 0
            ? Number(it.price)
            : Number(it.priceRange ?? 0);
        const qty = it.qty || 1;
        return sum + unitPrice * qty;
      }, 0),
    [items]
  );
  const isAuth = useSelector((s) => !!s.auth?.access || !!s.auth?.user);

  const [previewCoupon] = usePreviewCouponMutation();
  const [paypalCreateOrder] = usePaypalCreateOrderMutation();
  const [paypalCaptureOrder] = usePaypalCaptureOrderMutation();
  const { data: acct } = useGetAccountQuery(undefined, { skip: !isAuth });

  const { data: addrListRaw, isFetching: addrLoading } = useGetAddressesQuery(
    undefined,
    { skip: !isAuth }
  );
  const addrList = useMemo(() => {
    if (Array.isArray(addrListRaw)) return addrListRaw;
    if (Array.isArray(addrListRaw?.results)) return addrListRaw.results;
    if (Array.isArray(addrListRaw?.addresses)) return addrListRaw.addresses;
    return [];
  }, [addrListRaw]);

  const [createAddress] = useCreateAddressMutation();
  const [updateAddress] = useUpdateAddressMutation();
  const [createOrder, { isLoading: creatingOrder }] = useCreateOrderMutation();

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

  // single guard flag for redirects related to cart clearing
  const skipCartGuardRef = useRef(false);
  const addressIdRef = useRef(null);
  const localOrderIdRef = useRef(null);

  // Prefill address from default
  useEffect(() => {
    if (!isAuth || addrLoading || addrList.length === 0) return;

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

  // also prefill email if we get account later
  useEffect(() => {
    if (acct?.email) {
      setForm((p) => ({ ...p, email: p.email || acct.email }));
    }
  }, [acct?.email]);

  // redirect away if cart is empty (single guard)
  useEffect(() => {
    if (skipCartGuardRef.current || items.length > 0) return;
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

  // shipping flat (0 for now)
  const shippingFee = 0;

  // backend items snapshot
  const backendItems = useMemo(
    () =>
      items.map((c) => ({
        product_id: c.id,
        qty: c.qty,
      })),
    [items]
  );

  // coupon preview apply
  const applyCoupon = async () => {
    setCouponErr("");
    setCouponInfo(null);
    const code = (couponCode || "").trim().toUpperCase();
    if (!code) return;
    setCouponCode(code);
    try {
      const r = await previewCoupon({ code, items: backendItems }).unwrap();
      if (r?.ok) setCouponInfo(r);
      else setCouponErr(r?.error || t("checkout.couponInvalid"));
    } catch (e) {
      setCouponErr(e?.data?.error || t("checkout.couponInvalid"));
    }
  };

  const autoAppliedRef = useRef(false);

  // A) If we’re already on checkout when user clicks the promo banner
  useEffect(() => {
    const handler = async (ev) => {
      if (autoAppliedRef.current) return;
      const incoming = String(ev?.detail?.code || "").toUpperCase();
      if (!incoming) return;
      autoAppliedRef.current = true;
      // put into input immediately
      setCouponCode(incoming);
      // wait until items are ready, then preview+apply
      const tryApply = async () => {
        if (backendItems.length === 0) return false;
        try {
          const r = await previewCoupon({
            code: incoming,
            items: backendItems,
          }).unwrap();
          if (r?.ok) setCouponInfo(r);
          return true;
        } catch {
          return false;
        }
      };
      // attempt now, and again on next tick if empty
      let applied = await tryApply();
      if (!applied) setTimeout(tryApply, 120);
    };
    window.addEventListener("mindmines:apply-coupon", handler);
    return () => window.removeEventListener("mindmines:apply-coupon", handler);
  }, [backendItems, previewCoupon]);

  // B) On first mount, pick up the stored code (from PromoBanner navigation)
  useEffect(() => {
    if (autoAppliedRef.current) return;
    const stored = (
      sessionStorage.getItem("coupon_auto_once") ||
      localStorage.getItem("coupon_auto") ||
      ""
    ).toUpperCase();
    if (!stored) return;
    autoAppliedRef.current = true;
    // show in input right away
    setCouponCode(stored);
    // apply as soon as items exist
    const doApply = async () => {
      if (backendItems.length === 0) return false;
      try {
        const r = await previewCoupon({
          code: stored,
          items: backendItems,
        }).unwrap();
        if (r?.ok) setCouponInfo(r);
        return true;
      } catch {
        return false;
      }
    };
    (async () => {
      let ok = await doApply();
      if (!ok) {
        const id = setInterval(async () => {
          ok = await doApply();
          if (ok) clearInterval(id);
        }, 120);
        setTimeout(() => clearInterval(id), 3000); // stop trying after ~3s
      }
      sessionStorage.removeItem("coupon_auto_once");
    })();
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const discount = useMemo(() => {
    const d = couponInfo?.ok ? Number(couponInfo.discount) : 0;
    return Number.isFinite(d) ? d : 0;
  }, [couponInfo]);

  const payTotal = useMemo(() => {
    const ttotal = subtotal + shippingFee - discount;
    return Number(Math.max(0, ttotal).toFixed(2));
  }, [subtotal, shippingFee, discount]);
  const klarnaInstallments = 3;
  const klarnaPerPayment = useMemo(
    () => fmtEUR((payTotal || 0) / klarnaInstallments, locale),
    [payTotal, locale]
  );
  const subtotalLabel =
    itemsCount === 1
      ? t("checkout.subtotal_one", { count: itemsCount })
      : t("checkout.subtotal_other", { count: itemsCount });

  // address save
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
        t("checkout.addrFail");
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
    } catch {}
  }, [dispatch]);

  const persistGuestInfo = useCallback(
    async (orderId) => {
      if (isAuth || !orderId) return;
      const guestEmail = (form.email || "").trim();
      if (!guestEmail) return;
      try {
        const { data } = await http.get(`orders/public/${orderId}/`);
        const orderNumber = data?.number || data?.id || orderId;
        const payload = {
          order_id: orderId,
          order_number: String(orderNumber || orderId),
          email: guestEmail,
        };
        sessionStorage.setItem("guest_checkout_info", JSON.stringify(payload));
        sessionStorage.setItem(
          "guest_lookup_last",
          JSON.stringify({
            order_number: payload.order_number,
            email: guestEmail,
          })
        );
      } catch (err) {
        try {
          const fallbackNumber = String(orderId);
          sessionStorage.setItem(
            "guest_checkout_info",
            JSON.stringify({
              order_id: orderId,
              order_number: fallbackNumber,
              email: guestEmail,
            })
          );
          sessionStorage.setItem(
            "guest_lookup_last",
            JSON.stringify({
              order_number: fallbackNumber,
              email: guestEmail,
            })
          );
        } catch {
          // ignore storage failures
        }
      }
    },
    [isAuth, form.email]
  );

  const onSuccessfulOrder = useCallback(
    async (id) => {
      await persistGuestInfo(id);
      wipeCart();
      if (id) {
        navigate(`/checkout/success?order=${encodeURIComponent(id)}`);
      } else {
        navigate("/account/orders/");
      }
    },
    [navigate, persistGuestInfo, wipeCart]
  );

  // payment UI state
  const [payment, setPayment] = useState("");
  const setPaymentSafe = useCallback((next) => setPayment(next), []);
  const [cardMonths, setCardMonths] = useState(null);
  const [sepaMonths, setSepaMonths] = useState(null);

  const [savedCardPaymentMethodId] = useState(null);
  const [savedSepaPaymentMethodId] = useState(null);

  // minimal address check
  const hasMinimalAddress = useCallback(() => {
    const needed = [
      "email",
      "fullName",
      "street",
      "postalCode",
      "city",
      "country",
    ];
    return needed.every((k) => (form[k] || "").toString().trim().length > 0);
  }, [form]);

  // handle country + DE-only restriction
  const handleCountryChange = (e) => {
    const newCode = normalizeCountry(e.target.value);
    const isDEOnly =
      payment === "sepa_debit" ||
      payment === "bank" ||
      (typeof payment === "string" && payment.startsWith("sepa_installments"));

    if (isDEOnly && newCode !== "DE") {
      alert(
        t(
          "checkout.deOnly",
          "SEPA / Bank Transfer is only available in Germany (DE)."
        )
      );
      setForm((prev) => ({ ...prev, country: "DE" }));
      return;
    }
    setForm((prev) => ({ ...prev, country: newCode }));
  };

  const countryCode = normalizeCountry(form.country);
  const deOnlyActive =
    payment === "sepa_debit" ||
    (typeof payment === "string" && payment.startsWith("sepa_installments"));
  useEffect(() => {
    if (deOnlyActive && countryCode !== "DE") {
      setForm((prev) => ({ ...prev, country: "DE" }));
    }
  }, [countryCode, deOnlyActive]);

  // === NEW: Create a local order for Stripe card ===
  const ensureStripeOrder = useCallback(
    async (pm) => {
      if (localOrderIdRef.current) return localOrderIdRef.current;
      if (!hasMinimalAddress()) {
        alert(t("checkout.fillFirst"));

        return null;
      }
      if (items.length === 0) {
        alert(t("checkout.emptyCart"));
        return null;
      }
      let installments_months = null;
      let pmToSave = pm;

      // card installments: e.g. "card_installments_3"
      if (pm && pm.startsWith("card_installments_")) {
        installments_months = Number(pm.split("_").pop());
        pmToSave = "card_installments";
      } else if (pm === "card") {
        pmToSave = "card";
      } else if (
        pm === "klarna_single" ||
        pm === "klarna_installments" ||
        pm === "giropay"
      ) {
        // keep as-is
        pmToSave = pm;
      }

      try {
        const res = await createOrder({
          email: (form.email || "").trim(),
          payment_method: pmToSave,
          installments_months,
          coupon_code: (couponCode || "").trim(),
          items: backendItems,
          shipping: {
            first_name: form.fullName.split(" ")[0] || form.fullName,
            last_name: form.fullName.split(" ").slice(1).join(" "),
            line1: `${form.street} ${form.houseNumber}`.trim(),
            line2: form.apartment || "",
            postal_code: form.postalCode,
            city: form.city,
            country: normalizeCountry(form.country),
            phone: form.telephone || "",
            street_name: form.street || "",
            house_number: form.houseNumber || "",
          },
        }).unwrap();

        // Expecting { id, number, ... }
        localOrderIdRef.current = res?.id;
        return res?.id || null;
      } catch (e) {
        const msg =
          e?.data?.detail ||
          e?.data?.non_field_errors?.[0] ||
          e?.error ||
          t("checkout.orderCreateFailed");
        alert(msg);
        return null;
      }
    },
    [
      createOrder,
      form,
      items.length,
      backendItems,
      couponCode,
      t,
      hasMinimalAddress,
    ]
  );

  // URL coupon code pickup
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const qCoupon = (params.get("coupon") || "").trim();
    if (!qCoupon) return;

    // set the field immediately
    setCouponCode(qCoupon.toUpperCase());

    // try preview/apply right away
    (async () => {
      try {
        const r = await previewCoupon({
          code: qCoupon,
          items: backendItems,
        }).unwrap();
        if (r?.ok) setCouponInfo(r);
      } catch {
        /* ignore */
      }
    })();

    // focus and scroll into view
    const el = document.getElementById("coupon-input");
    if (el) {
      el.focus();
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [location.search, backendItems, previewCoupon]);

  // PayPal block
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
      <label className="flex items-center gap-3 border rounded-lg p-3 cursor-pointer mt-3 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] dark:border-neutral-700 focus-within:ring-2 focus-within:ring-backnewswhite/80 transition">
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
        <div className="border dark:border-neutral-700 rounded-lg p-3">
          <PayPalButtons
            fundingSource={undefined}
            style={{ layout: "horizontal", label: "paypal" }}
            onClick={async (_, actions) => {
              if (!hasMinimalAddress()) {
                alert(
                  t(
                    "checkout.fillFirst",
                    "Please fill in contact + delivery first."
                  )
                );
                return actions.reject();
              }
              return actions.resolve();
            }}
            createOrder={async () => {
              const res = await paypalCreateOrder({
                email: form.email,
                payment_method: "paypal",
                coupon_code: (couponCode || "").trim(),
                items: backendItems,
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
              }).unwrap();

              // backend should return both: { id: <paypal_id>, order_id: <local_order_id> }
              localOrderIdRef.current = res?.order_id;
              return res?.id;
            }}
            onApprove={async (data) => {
              const cap = await paypalCaptureOrder({
                paypalOrderId: data.orderID,
                localOrderId: localOrderIdRef.current,
              }).unwrap();

              if (cap?.status === "COMPLETED") {
                await onSuccessfulOrder(localOrderIdRef.current);
              } else {
                alert(t("checkout.captureFailed"));
              }
            }}
          />
        </div>
      )}
    </PayPalScriptProvider>
  );

  // Card installments toggle + component
  const renderCardInstallmentsBlock = () => (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-blue-700 bg-blue-50 border border-blue-100 rounded px-2 py-1">
          {t("checkout.card0")}
        </div>
        <div className="text-sm text-gray-600">
          {t("checkout.chooseTerm")}
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
                    : "hover:bg-gray-50 dark:hover:bg-white/5 dark:border-neutral-700"
                }`}
              >
                {m} {t("checkout.months")}
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
          onSuccess={async (id) => {
            await onSuccessfulOrder(id);
          }}
        />
      )}
    </div>
  );

  // SEPA installments (DE only)
  const renderSepaInstallmentsBlock = () => (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-green-700 bg-green-50 border border-green-100 rounded px-2 py-1">
          {t("checkout.sepa0")}
        </div>
        <div className="text-sm text-gray-600">
          {t("checkout.term")}
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
                    : "hover:bg-gray-50 dark:hover:bg-white/5 dark:border-neutral-700"
                }`}
              >
                {m} {t("checkout.months_de")}
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
          onSuccess={async (id) => {
            await onSuccessfulOrder(id);
          }}
        />
      )}
    </div>
  );

  const onChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  // ---- RENDER ----
  return (
    <div className="min-h-screen bg-marblewhite dark:bg-marbleblack  dark:text-white ">
      <div className="container max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Contact + Address */}
          <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm ring-1 ring-black/5 dark:ring-white/5 p-6">
            <h2 className="text-lg font-semibold mb-2">
              {t("checkout.contact")}
            </h2>
            <input
              name="email"
              type="email"
              placeholder={t("checkout.emailPlaceholder")}
              value={form.email}
              onChange={onChange}
              className={`${inputCls} mb-4`}
            />

            <h2 className="text-lg font-semibold mb-2">
              {t("checkout.delivery")}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {t("checkout.deliveryNote")}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Country */}
              <div className="md:col-span-2">
                <label className="text-sm text-gray-600 dark:text-gray-300">
                  {t("checkout.country")}
                </label>
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
                        className={inputCls}
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
                      className={inputCls}
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
                <label className="text-sm text-gray-600 dark:text-gray-300">
                  {t("checkout.fullName")}
                </label>
                <input
                  name="fullName"
                  value={form.fullName}
                  onChange={onChange}
                  className={inputCls}
                  aria-required="true"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm text-gray-600 dark:text-gray-300">
                  {t("checkout.streetAddress")}
                </label>
                <input
                  name="street"
                  value={form.street}
                  onChange={onChange}
                  className={inputCls}
                  aria-required="true"
                  required
                />
              </div>

              <div>
                <label className="text-sm text-gray-600 dark:text-gray-300">
                  {t("checkout.houseNumber")}
                </label>
                <input
                  name="houseNumber"
                  value={form.houseNumber}
                  onChange={onChange}
                  className={inputCls}
                  aria-required="true"
                  required
                />
              </div>

              <div>
                <label className="text-sm text-gray-600 dark:text-gray-300">
                  {t("checkout.apartment")}
                </label>
                <input
                  name="apartment"
                  value={form.apartment}
                  onChange={onChange}
                  className={inputCls}
                />
              </div>

              <div>
                <label className="text-sm text-gray-600 dark:text-gray-300">
                  {t("checkout.postalCode")}
                </label>
                <input
                  name="postalCode"
                  value={form.postalCode}
                  onChange={onChange}
                  className={inputCls}
                  aria-required="true"
                  required
                />
              </div>

              <div>
                <label className="text-sm text-gray-600 dark:text-gray-300">
                  {t("checkout.city")}
                </label>
                <input
                  name="city"
                  value={form.city}
                  onChange={onChange}
                  className={inputCls}
                  aria-required="true"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm text-gray-600 dark:text-gray-300">
                  {t("checkout.telephone")}
                </label>
                <input
                  name="telephone"
                  value={form.telephone}
                  onChange={onChange}
                  className={inputCls}
                />
              </div>
            </div>

            <div className="mt-4 flex gap-3">
              <button
                onClick={saveAddress}
                disabled={savingAddr}
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-backnewswhite text-white hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-backnewswhite focus:ring-offset-2 dark:focus:ring-offset-neutral-900 disabled:opacity-60 transition"
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
          <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm ring-1 ring-black/5 dark:ring-white/5 p-6">
            <h2 className="text-lg font-semibold mb-3">
              {t("checkout.shipment")}
            </h2>
            <div className="flex items-center justify-between border rounded-lg p-3 dark:border-neutral-700">
              <div className="text-sm">{t("checkout.standardShipping")}</div>
              <div className="text-sm font-semibold">
                {shippingFee === 0
                  ? t("checkout.free")
                  : fmtEUR(shippingFee, locale)}
              </div>
            </div>
          </div>

          {/* Payment */}
          <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm ring-1 ring-black/5 dark:ring-white/5 p-6">
            <h2 className="text-lg font-semibold mb-2">
              {t("checkout.payment")}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {t("checkout.paymentNote")}
            </p>

            {!payment && (
              <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2 mb-3">
                {t(
                  "checkout.choosePayment",
                  "Please choose a payment method to continue."
                )}
              </div>
            )}

            {/*  Klarna / Giropay  */}
            {/* Klarna */}
            <label className="flex items-center gap-3 border rounded-lg p-3 cursor-pointer mt-3 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] dark:border-neutral-700 focus-within:ring-2 focus-within:ring-backnewswhite/80 transition">
              <input
                type="radio"
                name="payment"
                value="klarna_single"
                checked={payment === "klarna_single"}
                onChange={() => setPaymentSafe("klarna_single")}
              />
              <span className="flex-1">{t("checkout.klarnaSingleLabel")}</span>
              <span className="text-xs font-semibold">
                {t("checkout.processorStripeKlarna")}
              </span>
            </label>

            {payment === "klarna_single" && (
              <div className="border dark:border-neutral-700 rounded-lg p-3 mt-3">
                {!localOrderIdRef.current ? (
                  <button
                    type="button"
                    className="px-4 py-2 rounded-lg bg-backnewswhite text-white hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-backnewswhite focus:ring-offset-2 dark:focus:ring-offset-neutral-900 disabled:opacity-50 transition"
                    disabled={creatingOrder}
                    onClick={() => ensureStripeOrder("klarna_single")}
                  >
                    {creatingOrder
                      ? t("checkout.initializing")
                      : t("checkout.continueKlarnaNow")}
                  </button>
                ) : (
                  <StripeRedirectPay
                    orderId={localOrderIdRef.current}
                    method="klarna" // Stripe method stays "klarna"
                    orderPayload={{
                      email: form.email.trim(),
                      payment_method: "klarna_single", // <-- our internal method
                      coupon_code: (couponCode || "").trim(),
                      items: backendItems,
                      shipping: {
                        first_name:
                          form.fullName.split(" ")[0] || form.fullName,
                        last_name: form.fullName.split(" ").slice(1).join(" "),
                        line1: `${form.street} ${form.houseNumber}`.trim(),
                        line2: form.apartment || "",
                        postal_code: form.postalCode,
                        city: form.city,
                        country: normalizeCountry(form.country),
                        phone: form.telephone || "",
                        street_name: form.street || "",
                        house_number: form.houseNumber || "",
                      },
                    }}
                    onSuccess={async () =>
                      await onSuccessfulOrder(localOrderIdRef.current)
                    }
                    onError={(m) => alert(m)}
                  />
                )}
              </div>
            )}

            {/* Klarna – installments */}
            <label className="flex items-center gap-3 border rounded-lg p-3 cursor-pointer mt-3 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] dark:border-neutral-700 focus-within:ring-2 focus-within:ring-backnewswhite/80 transition">
              <input
                type="radio"
                name="payment"
                value="klarna_installments"
                checked={payment === "klarna_installments"}
                onChange={() => setPaymentSafe("klarna_installments")}
              />
              <span className="flex-1">
                {t("checkout.klarnaInstallmentsLabel", {
                  count: klarnaInstallments, // 3
                  per: klarnaPerPayment, // e.g. "€33,33"
                })}
              </span>
              <span className="text-xs font-semibold">
                {t("checkout.processorStripeKlarna")}
              </span>
            </label>

            {payment === "klarna_installments" && (
              <div className="border dark:border-neutral-700 rounded-lg p-3 mt-3">
                {!localOrderIdRef.current ? (
                  <button
                    type="button"
                    className="px-4 py-2 rounded-lg bg-backnewswhite text-white hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-backnewswhite focus:ring-offset-2 dark:focus:ring-offset-neutral-900 disabled:opacity-50 transition"
                    disabled={creatingOrder}
                    onClick={() => ensureStripeOrder("klarna_installments")}
                  >
                    {creatingOrder
                      ? t("checkout.initializing")
                      : t("checkout.continueKlarnaInst")}
                  </button>
                ) : (
                  <StripeRedirectPay
                    orderId={localOrderIdRef.current}
                    method="klarna" // still just "klarna" for Stripe
                    orderPayload={{
                      email: form.email.trim(),
                      payment_method: "klarna_installments", // <-- our internal method
                      coupon_code: (couponCode || "").trim(),
                      items: backendItems,
                      shipping: {
                        first_name:
                          form.fullName.split(" ")[0] || form.fullName,
                        last_name: form.fullName.split(" ").slice(1).join(" "),
                        line1: `${form.street} ${form.houseNumber}`.trim(),
                        line2: form.apartment || "",
                        postal_code: form.postalCode,
                        city: form.city,
                        country: normalizeCountry(form.country),
                        phone: form.telephone || "",
                        street_name: form.street || "",
                        house_number: form.houseNumber || "",
                      },
                    }}
                    onSuccess={async () =>
                      await onSuccessfulOrder(localOrderIdRef.current)
                    }
                    onError={(m) => alert(m)}
                  />
                )}
              </div>
            )}
            {/* giropay */}
            <label className="flex items-center gap-3 border rounded-lg p-3 cursor-pointer mt-3 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] dark:border-neutral-700 focus-within:ring-2 focus-within:ring-backnewswhite/80 transition">
              <input
                type="radio"
                name="payment"
                value="giropay"
                checked={payment === "giropay"}
                onChange={() => setPaymentSafe("giropay")}
              />
              <span className="flex-1">{t("checkout.giropayLabel")}</span>
              <span className="text-xs font-semibold">
                {t("checkout.processorStripe")}
              </span>
            </label>

            {payment === "giropay" && (
              <div className="border dark:border-neutral-700 rounded-lg p-3 mt-3">
                {!localOrderIdRef.current ? (
                  <button
                    type="button"
                    className="px-4 py-2 rounded-lg bg-backnewswhite text-white hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-backnewswhite focus:ring-offset-2 dark:focus:ring-offset-neutral-900 disabled:opacity-50 transition"
                    disabled={creatingOrder}
                    onClick={() => ensureStripeOrder("giropay")}
                  >
                    {creatingOrder
                      ? t("checkout.initializing")
                      : t("checkout.continueGiropay")}
                  </button>
                ) : (
                  <StripeRedirectPay
                    orderId={localOrderIdRef.current}
                    method="giropay"
                    orderPayload={{
                      email: form.email.trim(),
                      payment_method: "giropay",
                      coupon_code: (couponCode || "").trim(),
                      items: backendItems,
                      shipping: {
                        first_name:
                          form.fullName.split(" ")[0] || form.fullName,
                        last_name: form.fullName.split(" ").slice(1).join(" "),
                        line1: `${form.street} ${form.houseNumber}`.trim(),
                        line2: form.apartment || "",
                        postal_code: form.postalCode,
                        city: form.city,
                        country: normalizeCountry(form.country),
                        phone: form.telephone || "",
                        street_name: form.street || "",
                        house_number: form.houseNumber || "",
                      },
                    }}
                    onSuccess={async () =>
                      await onSuccessfulOrder(localOrderIdRef.current)
                    }
                    onError={(m) => alert(m)}
                  />
                )}
              </div>
            )}

            {/* === NEW: Card selector (Stripe) === */}
            <label className="flex items-center gap-3 border rounded-lg p-3 cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03] dark:border-neutral-700 focus-within:ring-2 focus-within:ring-backnewswhite/80 transition">
              <input
                type="radio"
                name="payment"
                value="card"
                checked={payment === "card"}
                onChange={() => setPaymentSafe("card")}
              />
              <span className="flex-1">{t("checkout.card")}</span>
              <span className="text-xs font-semibold">
                {t("checkout.processorStripe")}
              </span>
            </label>

            {/* When Card is chosen: ensure local order, then show StripeCard */}
            {payment === "card" && (
              <div className="border dark:border-neutral-700 rounded-lg p-3 mt-3">
                {!localOrderIdRef.current ? (
                  <button
                    type="button"
                    className="px-4 py-2 rounded-lg bg-backnewswhite text-white hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-backnewswhite focus:ring-offset-2 dark:focus:ring-offset-neutral-900 disabled:opacity-50 transition"
                    disabled={creatingOrder}
                    onClick={() => ensureStripeOrder("card")}
                  >
                    {creatingOrder
                      ? t("checkout.initializing")
                      : t("checkout.continueCard")}
                  </button>
                ) : (
                  <StripeProvider>
                    <StripeCard
                      orderId={localOrderIdRef.current}
                      onSuccess={async () => {
                        await onSuccessfulOrder(localOrderIdRef.current);
                      }}
                      onError={(m) => alert(m)}
                    />
                  </StripeProvider>
                )}
              </div>
            )}

            {/* Card installments */}
            {renderCardInstallmentsBlock()}

            {/* PayPal / PayPal Pay Later */}
            {renderPayPalSection()}

            {/* SEPA (one-shot + installments) */}
            <StripeSepa
              active={payment === "sepa_debit"}
              setActive={(val) => setPaymentSafe(val)}
              form={form}
              items={items}
              couponCode={couponCode}
              total={payTotal}
              customerEmail={form.email}
              setLocalOrderId={(id) => (localOrderIdRef.current = id)}
              onSuccess={async (id) => {
                await onSuccessfulOrder(id || localOrderIdRef.current);
              }}
            />

            {/* SEPA installments (DE only) */}
            {renderSepaInstallmentsBlock()}

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-700 dark:text-gray-300">
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
          <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm ring-1 ring-black/5 dark:ring-white/5 p-6 lg:sticky lg:top-24">
            <h2 className="text-xl font-semibold mb-4">
              {t("checkout.overview")}
            </h2>

            <div className="space-y-4">
              {items.map((it) => {
                const unitPrice =
                  it.price && Number(it.price) > 0
                    ? Number(it.price)
                    : Number(it.priceRange ?? 0);

                return (
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
                      {fmtEUR(unitPrice * it.qty, locale)}
                    </div>
                  </div>
                );
              })}
            </div>

            <hr className="my-4" />

            <div className="mt-3 border dark:border-neutral-700 rounded-lg p-3 space-y-2">
              <div className="flex gap-2">
                <input
                  id="coupon-input"
                  className={`${inputCls} flex-1`}
                  placeholder={t("checkout.couponPlaceholder")}
                  value={couponCode}
                  onChange={(e) =>
                    setCouponCode((e.target.value || "").toUpperCase())
                  }
                />
                <button
                  onClick={applyCoupon}
                  className="px-4 py-2 rounded-lg bg-backnewswhite text-white hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-backnewswhite focus:ring-offset-2 dark:focus:ring-offset-neutral-900 transition"
                >
                  {t("checkout.apply")}
                </button>
              </div>
              {couponErr && (
                <div className="text-red-600 text-sm">{couponErr}</div>
              )}
              {couponInfo?.ok && (
                <div className="text-green-700 dark:text-green-500 text-sm">
                  {t("checkout.applied")} <b>{couponInfo.code}</b>:{" "}
                  <span>-{fmtEUR(discount, locale)}</span>
                </div>
              )}
            </div>

            {couponInfo?.ok && couponInfo.code && Number(discount) > 0 && (
              <Row
                label={t("checkout.couponLine", { code: couponInfo.code })}
                value={`-${fmtEUR(discount, locale)}`}
              />
            )}

            <Row label={subtotalLabel} value={fmtEUR(subtotal, locale)} />
            <Row
              label={t("checkout.shipmentShort")}
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
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t("checkout.inclTax")}
            </div>

            <Link
              to="/cart"
              className="mt-5 inline-block w-full text-center py-2 rounded-lg border dark:border-neutral-700 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition"
            >
              {t("checkout.backToCart")}
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between text-sm mt-1">
      <div className="text-gray-600 dark:text-gray-300">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}

function Badge({ icon, text }) {
  return (
    <div className="flex items-center gap-2">
      <div className="p-1.5 rounded-md bg-backnewswhite/10 dark:bg-backnewswhite/15">
        {icon}
      </div>
      <span className="text-gray-800 dark:text-gray-200">{text}</span>
    </div>
  );
}
