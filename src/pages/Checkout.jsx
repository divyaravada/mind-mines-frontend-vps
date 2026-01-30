// src/pages/Checkout.jsx
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ShieldCheck, Truck, RotateCcw } from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { Helmet } from "react-helmet-async";

import { useTranslation } from "react-i18next";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

import {
  selectCartItems,
  selectCartCount,
  clearCart,
} from "../features/cart/cartSlice";

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
import { lookupCityFromPostal } from "../utils/addressApi";
import { parsePhoneNumberFromString } from "libphonenumber-js";

const inputCls =
  "w-full rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900/60 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-backnewswhite/80 focus:border-transparent transition";

const EUROPE_COUNTRIES = [
  "AT",
  "BE",
  "BG",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "HU",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SK",
  "SI",
  "ES",
  "SE",
  "NO",
  "IS",
  "LI",
  "CH",
  "GB",
];

function isEuropeanCountry(code) {
  const c = (code || "").toUpperCase();
  return EUROPE_COUNTRIES.includes(c);
}

// small debounce helper
function useDebouncedFn(fn, delay = 250) {
  const timer = useRef(null);
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  return useCallback(
    (...args) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => fnRef.current(...args), delay);
    },
    [delay],
  );
}

function toNum(v) {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Rule:
 * - product discount always applies (orig -> final)
 * - percent coupon sets a target total discount percent of ORIGINAL
 *   so effective discount = max(productDiscount, couponTargetDiscount)
 */
function calcTotalsNoStack(items, couponInfo) {
  const kind = couponInfo?.ok ? couponInfo.kind : null; // "percent" | "amount"
  const couponPct = kind === "percent" ? toNum(couponInfo.value) : 0;
  const couponAmt = kind === "amount" ? toNum(couponInfo.value) : 0;

  let originalSubtotal = 0;
  let finalSubtotal = 0;
  let productDiscountTotal = 0;

  // We'll compute line-by-line totals
  const lines = items.map((it) => {
    const qty = Math.max(1, Number(it.qty || 1));

    const origUnit =
      toNum(it.price_gross) ||
      toNum(it.base_gross) ||
      toNum(it.original_price) ||
      toNum(it.priceRange) ||
      toNum(it.price) ||
      0;

    const finalUnit =
      toNum(it.final_price_gross) ||
      toNum(it.final_price) ||
      toNum(it.price) ||
      origUnit;

    const origLine = origUnit * qty;
    const finalLine = finalUnit * qty;

    originalSubtotal += origLine;
    finalSubtotal += finalLine;

    const productDisc = Math.max(0, origLine - finalLine);
    productDiscountTotal += productDisc;

    return {
      id: it.id,
      qty,
      origLine,
      finalLine,
      productDisc,
      // coupon portion computed later
      couponDisc: 0,
      payLine: finalLine,
    };
  });

  // If no coupon, return product discount totals
  if (!couponInfo?.ok || (!couponPct && !couponAmt)) {
    const total = Math.max(0, finalSubtotal);
    return {
      originalSubtotal: round2(originalSubtotal),
      subtotal: round2(finalSubtotal),
      productDiscount: round2(productDiscountTotal),
      couponDiscount: 0,
      total: round2(total),
    };
  }

  // --- Percent coupon: "top up" to coupon percent of ORIGINAL per line ---
  if (couponPct > 0) {
    const pct = Math.min(100, Math.max(0, couponPct)) / 100;

    let couponDiscountEffective = 0;
    let total = 0;

    for (const line of lines) {
      const couponTargetDisc = line.origLine * pct; // target discount on ORIGINAL
      const effectiveDisc = Math.max(line.productDisc, couponTargetDisc);
      const cappedDisc = Math.min(line.origLine, effectiveDisc);

      const payLine = Math.max(0, line.origLine - cappedDisc);

      line.couponDisc = Math.max(0, cappedDisc - line.productDisc); // "extra" due to coupon
      line.payLine = payLine;

      couponDiscountEffective += line.couponDisc;
      total += payLine;
    }

    return {
      originalSubtotal: round2(originalSubtotal),
      subtotal: round2(finalSubtotal), // after product discount
      productDiscount: round2(productDiscountTotal),
      couponDiscount: round2(couponDiscountEffective),
      total: round2(total),
    };
  }

  // --- Amount coupon: apply across ORIGINAL proportionally, but never reduce below product-discounted floor ---
  if (couponAmt > 0 && originalSubtotal > 0) {
    const targetCouponTotal = Math.min(couponAmt, originalSubtotal);

    let couponDiscountEffective = 0;
    let total = 0;

    for (const line of lines) {
      const share = line.origLine / originalSubtotal;
      const alloc = targetCouponTotal * share;

      // coupon target tries to discount alloc from ORIGINAL
      const couponTargetDisc = alloc;

      const effectiveDisc = Math.max(
        line.productDisc,
        line.productDisc + couponTargetDisc,
      );
      const cappedDisc = Math.min(line.origLine, effectiveDisc);

      const payLine = Math.max(0, line.origLine - cappedDisc);

      line.couponDisc = Math.max(0, cappedDisc - line.productDisc);
      line.payLine = payLine;

      couponDiscountEffective += line.couponDisc;
      total += payLine;
    }

    return {
      originalSubtotal: round2(originalSubtotal),
      subtotal: round2(finalSubtotal),
      productDiscount: round2(productDiscountTotal),
      couponDiscount: round2(couponDiscountEffective),
      total: round2(total),
    };
  }

  const total = Math.max(0, finalSubtotal);
  return {
    originalSubtotal: round2(originalSubtotal),
    subtotal: round2(finalSubtotal),
    productDiscount: round2(productDiscountTotal),
    couponDiscount: 0,
    total: round2(total),
  };
}

function round2(n) {
  return Number(Math.round((Number(n) + Number.EPSILON) * 100) / 100);
}

export default function Checkout() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language || "en";
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();

  const items = useSelector(selectCartItems);
  const itemsCount = useSelector(selectCartCount);

  // ✅ "subtotal after product discount" still shown, but we also track original subtotal
  const totals = useMemo(() => {
    return calcTotalsNoStack(items, couponInfo);
  }, [items, couponInfo]);

  const subtotal = totals.subtotal; // after product discount
  const payTotal = totals.total; // after coupon "top-up" rule
  const productDiscount = totals.productDiscount; // original - final
  const couponDiscount = totals.couponDiscount; // extra due to coupon

  const isAuth = useSelector((s) => !!s.auth?.access || !!s.auth?.user);

  const [previewCoupon] = usePreviewCouponMutation();
  const [paypalCreateOrder] = usePaypalCreateOrderMutation();
  const [paypalCaptureOrder] = usePaypalCaptureOrderMutation();
  const { data: acct } = useGetAccountQuery(undefined, { skip: !isAuth });

  const { data: addrListRaw, isFetching: addrLoading } = useGetAddressesQuery(
    undefined,
    { skip: !isAuth },
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

  const [addrErrors, setAddrErrors] = useState({});
  const [cityOptions, setCityOptions] = useState([]);
  const [cityLoading, setCityLoading] = useState(false);

  const [couponCode, setCouponCode] = useState("");
  const [couponInfo, setCouponInfo] = useState(null);
  const [couponErr, setCouponErr] = useState("");

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

  useEffect(() => {
    if (acct?.email) setForm((p) => ({ ...p, email: p.email || acct.email }));
  }, [acct?.email]);

  // redirect away if cart is empty
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

  const shippingFee = 0;

  const backendItems = useMemo(
    () =>
      items.map((c) => ({
        product_id: c.id,
        qty: c.qty,
      })),
    [items],
  );

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

  useEffect(() => {
    const handler = async (ev) => {
      if (autoAppliedRef.current) return;
      const incoming = String(ev?.detail?.code || "").toUpperCase();
      if (!incoming) return;
      autoAppliedRef.current = true;

      setCouponCode(incoming);

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

      let applied = await tryApply();
      if (!applied) setTimeout(tryApply, 120);
    };

    window.addEventListener("mindmines:apply-coupon", handler);
    return () => window.removeEventListener("mindmines:apply-coupon", handler);
  }, [backendItems, previewCoupon]);

  useEffect(() => {
    if (autoAppliedRef.current) return;
    const stored = (
      sessionStorage.getItem("coupon_auto_once") ||
      localStorage.getItem("coupon_auto") ||
      ""
    ).toUpperCase();
    if (!stored) return;
    autoAppliedRef.current = true;

    setCouponCode(stored);

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
        setTimeout(() => clearInterval(id), 3000);
      }
      sessionStorage.removeItem("coupon_auto_once");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const klarnaInstallments = 3;
  const klarnaPerPayment = useMemo(
    () => fmtEUR((payTotal || 0) / klarnaInstallments, locale),
    [payTotal, locale],
  );

  const installmentsEnabled = payTotal >= 50;
  const subtotalLabel =
    itemsCount === 1
      ? t("checkout.subtotal_one", { count: itemsCount })
      : t("checkout.subtotal_other", { count: itemsCount });

  const [savingAddr, setSavingAddr] = useState(false);
  const [addrSaved, setAddrSaved] = useState(false);

  const validatePhone = useCallback(
    (phone, country) => {
      const trimmed = (phone || "").trim();
      if (!trimmed) {
        return t("checkout.errPhoneRequired", "Telephone is required.");
      }
      try {
        const cc = normalizeCountry(country || "DE");
        const parsed = parsePhoneNumberFromString(trimmed, cc || "DE");
        if (!parsed || !parsed.isValid()) {
          return t(
            "checkout.errPhoneFormat",
            "Please enter a valid phone number for the selected country.",
          );
        }
      } catch {
        return t(
          "checkout.errPhoneFormat",
          "Please enter a valid phone number for the selected country.",
        );
      }
      return null;
    },
    [t],
  );

  const validateAddress = useCallback(() => {
    const errors = {};

    const email = (form.email || "").trim();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      errors.email = t("checkout.errEmail", "Please enter a valid email.");
    }

    if (!form.fullName.trim()) {
      errors.fullName = t("checkout.errFullName", "Full name is required.");
    }

    if (!form.street.trim()) {
      errors.street = t("checkout.errStreet", "Street name is required.");
    }

    if (!form.houseNumber.trim()) {
      errors.houseNumber = t(
        "checkout.errHouseNumberRequired",
        "House number is required.",
      );
    } else if (!/^\d+[a-zA-Z]?$/.test(form.houseNumber.trim())) {
      errors.houseNumber = t(
        "checkout.errHouseNumberFormat",
        "House number must start with digits (letters like 12a are ok).",
      );
    }

    if (!form.postalCode.trim()) {
      errors.postalCode = t("checkout.errPostal", "Postal code is required.");
    }

    if (!form.city.trim()) {
      errors.city = t("checkout.errCity", "City is required.");
    }

    const phoneErr = validatePhone(form.telephone, form.country);
    if (phoneErr) {
      errors.telephone = phoneErr;
    }

    setAddrErrors(errors);
    return Object.keys(errors).length === 0;
  }, [form, t, validatePhone]);

  const saveAddress = async () => {
    if (!isAuth) {
      alert(t("checkout.saveAddressLogin"));
      return;
    }

    const ok = validateAddress();
    if (!ok) return;

    setSavingAddr(true);
    try {
      const payload = buildAddressPayload(form, addressIdRef.current);

      let res;
      if (addressIdRef.current) {
        res = await updateAddress({
          id: addressIdRef.current,
          ...payload,
        }).unwrap();
      } else {
        res = await createAddress(payload).unwrap();
      }

      if (res?.id) {
        addressIdRef.current = res.id;
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

  const doPostalLookup = useCallback(async () => {
    const postal = (form.postalCode || "").trim();
    if (!postal) return;

    setCityLoading(true);
    try {
      const cities = await lookupCityFromPostal(form.country, postal);
      setCityOptions(cities);
      if (cities.length === 1 && !form.city.trim()) {
        setForm((prev) => ({ ...prev, city: cities[0] }));
      }
    } catch (err) {
      console.warn("Checkout city lookup failed", err);
    } finally {
      setCityLoading(false);
    }
  }, [form.country, form.postalCode, form.city]);

  const debouncedPostalLookup = useDebouncedFn(doPostalLookup, 250);

  const handlePostalBlur = () => {
    debouncedPostalLookup();
  };

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
          }),
        );
      } catch {
        try {
          const fallbackNumber = String(orderId);
          sessionStorage.setItem(
            "guest_checkout_info",
            JSON.stringify({
              order_id: orderId,
              order_number: fallbackNumber,
              email: guestEmail,
            }),
          );
          sessionStorage.setItem(
            "guest_lookup_last",
            JSON.stringify({
              order_number: fallbackNumber,
              email: guestEmail,
            }),
          );
        } catch {}
      }
    },
    [isAuth, form.email],
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
    [navigate, persistGuestInfo, wipeCart],
  );

  const [payment, setPayment] = useState("");
  const setPaymentSafe = useCallback((next) => setPayment(next), []);
  const [cardMonths, setCardMonths] = useState(null);
  const [sepaMonths, setSepaMonths] = useState(null);

  const [savedCardPaymentMethodId] = useState(null);
  const [savedSepaPaymentMethodId] = useState(null);

  const hasMinimalAddress = useCallback(
    () => validateAddress(),
    [validateAddress],
  );

  const handleCountryChange = (e) => {
    const newCode = normalizeCountry(e.target.value);
    setForm((prev) => ({ ...prev, country: newCode }));
  };

  const countryCode = normalizeCountry(form.country);
  const isEuropean = isEuropeanCountry(countryCode);

  useEffect(() => {
    if (
      !isEuropean &&
      typeof payment === "string" &&
      payment.startsWith("sepa")
    ) {
      setPaymentSafe("");
      setSepaMonths(null);
    }
  }, [isEuropean, payment, setPaymentSafe]);

  useEffect(() => {
    if (!installmentsEnabled) {
      setCardMonths(null);
      setSepaMonths(null);
      if (
        typeof payment === "string" &&
        (payment.startsWith("card_installments") ||
          payment.startsWith("sepa_installments"))
      ) {
        setPaymentSafe("");
      }
    }
  }, [installmentsEnabled, payment, setPaymentSafe]);

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
    ],
  );

  // URL coupon code pickup
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const qCoupon = (params.get("coupon") || "").trim();
    if (!qCoupon) return;

    setCouponCode(qCoupon.toUpperCase());

    (async () => {
      try {
        const r = await previewCoupon({
          code: qCoupon,
          items: backendItems,
        }).unwrap();
        if (r?.ok) setCouponInfo(r);
      } catch {}
    })();

    // reduce forced reflow: schedule focus/scroll
    requestAnimationFrame(() => {
      const el = document.getElementById("coupon-input");
      if (el) {
        el.focus();
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  }, [location.search, backendItems, previewCoupon]);

  const renderPayPalSection = () => (
    <PayPalScriptProvider
      options={{
        clientId: process.env.REACT_APP_PAYPAL_CLIENT_ID || "",
        currency: "EUR",
        intent: "capture",
        components: "buttons",
        locale: i18n.language === "de" ? "de_DE" : "en_US",
      }}
      // ✅ key improvement: defer PayPal script until needed
      deferLoading={payment !== "paypal"}
    >
      <label className="flex items-center gap-3 border rounded-lg p-3 cursor-pointer mt-3 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] dark:border-neutral-700 focus-within:ring-2 focus-within:ring-backnewswhite/80 transition">
        <input
          type="radio"
          name="payment"
          value="paypal"
          checked={payment === "paypal"}
          onChange={() => setPaymentSafe("paypal")}
          aria-label="PayPal"
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
                    "Please fill in contact + delivery first.",
                  ),
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

  const renderCardInstallmentsBlock = () => (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-blue-800 bg-blue-50 border border-blue-100 rounded px-2 py-1">
          {t("checkout.card0")}
        </div>
        <div className="text-sm text-gray-700 dark:text-gray-200">
          {t("checkout.chooseTerm")}
          <span className="ml-2 inline-flex gap-2">
            {[3, 6, 9].map((m) => (
              <button
                key={`card-${m}`}
                type="button"
                onClick={() => {
                  if (!installmentsEnabled) return;
                  setCardMonths((prev) => {
                    const same = prev === m;
                    const next = same ? null : m;
                    setPaymentSafe(same ? "card" : `card_installments_${m}`);
                    return next;
                  });
                }}
                className={`px-2 py-1 rounded border text-sm ${
                  cardMonths === m
                    ? "bg-blue-700 text-white border-blue-700"
                    : "hover:bg-gray-50 dark:hover:bg-white/5 dark:border-neutral-700"
                }`}
                aria-label={`${m} ${t("checkout.months")}`}
              >
                {m} {t("checkout.months")}
              </button>
            ))}
          </span>
        </div>
      </div>

      {!installmentsEnabled && (
        <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
          {t(
            "checkout.installmentsMinTotal",
            "Installment payments are available from an order value of 50 €.",
          )}
        </p>
      )}

      {cardMonths && installmentsEnabled && (
        <>
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
          <div className="mt-2 text-xs text-gray-700 dark:text-gray-200">
            {t("checkout.installmentSchedule", {
              total: fmtEUR(payTotal, locale),
              months: cardMonths,
              per: fmtEUR((payTotal || 0) / cardMonths, locale),
            })}
          </div>
        </>
      )}
    </div>
  );

  const renderSepaInstallmentsBlock = () => (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-green-800 bg-green-50 border border-green-100 rounded px-2 py-1">
          {t("checkout.sepa0")}
        </div>
        <div className="text-sm text-gray-700 dark:text-gray-200">
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
                      same ? "sepa_debit" : `sepa_installments_${m}`,
                    );
                    return next;
                  });
                }}
                className={`px-2 py-1 rounded border text-sm ${
                  sepaMonths === m
                    ? "bg-pink-700 text-white border-pink-700"
                    : "hover:bg-gray-50 dark:hover:bg-white/5 dark:border-neutral-700"
                }`}
                aria-label={`${m} ${t("checkout.months_de")}`}
              >
                {m} {t("checkout.months_de")}
              </button>
            ))}
          </span>
        </div>
      </div>

      {sepaMonths && installmentsEnabled && (
        <>
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
          <div className="mt-2 text-xs text-gray-700 dark:text-gray-200">
            {t("checkout.installmentSchedule", {
              total: fmtEUR(payTotal, locale),
              months: sepaMonths,
              per: fmtEUR((payTotal || 0) / sepaMonths, locale),
            })}
          </div>
        </>
      )}
    </div>
  );

  const onChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  return (
    <>
      <Helmet>
        <meta name="robots" content="noindex,nofollow" />
        <meta name="googlebot" content="noindex,nofollow" />
        <title>Checkout | MindMines</title>
      </Helmet>

      {/* ✅ main landmark */}
      <main className="min-h-screen bg-marblewhite dark:bg-marbleblack dark:text-white">
        <div className="container max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Contact + Address */}
            <section
              className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm ring-1 ring-black/5 dark:ring-white/5 p-6"
              aria-label="Contact and delivery address"
            >
              <h1 className="text-xl font-semibold mb-2">
                {t("checkout.contact")}
              </h1>

              <input
                name="email"
                type="email"
                placeholder={t("checkout.emailPlaceholder")}
                value={form.email}
                onChange={onChange}
                className={`${inputCls} mb-1`}
                aria-label={t("checkout.emailPlaceholder")}
              />
              {addrErrors.email && (
                <p className="text-xs text-red-600 mb-3">{addrErrors.email}</p>
              )}

              <h2 className="text-lg font-semibold mb-2">
                {t("checkout.delivery")}
              </h2>
              <p className="text-sm text-gray-700 dark:text-gray-200 mb-4">
                {t("checkout.deliveryNote")}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label className="text-sm text-gray-700 dark:text-gray-200">
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
                        (v) => v && typeof v === "object",
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
                          aria-label={t("checkout.country")}
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
                        aria-label={t("checkout.country")}
                      >
                        {Object.entries(grouped).map(
                          ([groupKey, countryMap]) => (
                            <optgroup
                              key={groupKey}
                              label={(groups && groups[groupKey]) || groupKey}
                            >
                              {Object.entries(countryMap).map(
                                ([code, label]) => (
                                  <option key={code} value={code}>
                                    {label}
                                  </option>
                                ),
                              )}
                            </optgroup>
                          ),
                        )}
                      </select>
                    );
                  })()}
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm text-gray-700 dark:text-gray-200">
                    {t("checkout.fullName")}
                  </label>
                  <input
                    name="fullName"
                    value={form.fullName}
                    onChange={onChange}
                    className={inputCls}
                    aria-required="true"
                    aria-label={t("checkout.fullName")}
                    required
                  />
                  {addrErrors.fullName && (
                    <p className="mt-1 text-xs text-red-600">
                      {addrErrors.fullName}
                    </p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm text-gray-700 dark:text-gray-200">
                    {t("checkout.streetAddress")}
                  </label>
                  <input
                    name="street"
                    value={form.street}
                    onChange={onChange}
                    className={inputCls}
                    aria-required="true"
                    aria-label={t("checkout.streetAddress")}
                    required
                  />
                  {addrErrors.street && (
                    <p className="mt-1 text-xs text-red-600">
                      {addrErrors.street}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm text-gray-700 dark:text-gray-200">
                    {t("checkout.houseNumber")}
                  </label>
                  <input
                    name="houseNumber"
                    value={form.houseNumber}
                    onChange={onChange}
                    className={inputCls}
                    aria-required="true"
                    aria-label={t("checkout.houseNumber")}
                    required
                  />
                  {addrErrors.houseNumber && (
                    <p className="mt-1 text-xs text-red-600">
                      {addrErrors.houseNumber}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm text-gray-700 dark:text-gray-200">
                    {t("checkout.apartment")}
                  </label>
                  <input
                    name="apartment"
                    value={form.apartment}
                    onChange={onChange}
                    className={inputCls}
                    aria-label={t("checkout.apartment")}
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-700 dark:text-gray-200">
                    {t("checkout.postalCode")}
                  </label>
                  <input
                    name="postalCode"
                    value={form.postalCode}
                    onChange={onChange}
                    onBlur={handlePostalBlur}
                    className={inputCls}
                    aria-required="true"
                    aria-label={t("checkout.postalCode")}
                    required
                  />
                  {addrErrors.postalCode && (
                    <p className="mt-1 text-xs text-red-600">
                      {addrErrors.postalCode}
                    </p>
                  )}
                  {cityLoading && (
                    <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                      {t("checkout.lookupCity", "Looking up city…")}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm text-gray-700 dark:text-gray-200">
                    {t("checkout.city")}
                  </label>
                  <input
                    name="city"
                    value={form.city}
                    onChange={onChange}
                    list="checkout-city-options"
                    className={inputCls}
                    aria-required="true"
                    aria-label={t("checkout.city")}
                    required
                  />
                  <datalist id="checkout-city-options">
                    {cityOptions.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                  {addrErrors.city && (
                    <p className="mt-1 text-xs text-red-600">
                      {addrErrors.city}
                    </p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm text-gray-700 dark:text-gray-200">
                    {t("checkout.telephone")}
                  </label>
                  <input
                    name="telephone"
                    value={form.telephone}
                    onChange={onChange}
                    className={inputCls}
                    aria-label={t("checkout.telephone")}
                  />
                  {addrErrors.telephone && (
                    <p className="mt-1 text-xs text-red-600">
                      {addrErrors.telephone}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 flex gap-3">
                <button
                  onClick={saveAddress}
                  disabled={savingAddr}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-backnewswhite text-white hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-backnewswhite focus:ring-offset-2 dark:focus:ring-offset-neutral-900 disabled:opacity-60 transition"
                  aria-label={t("checkout.saveAddress")}
                >
                  {savingAddr
                    ? t("checkout.saving")
                    : t("checkout.saveAddress")}
                </button>
                {addrSaved && (
                  <span className="text-green-700 self-center">
                    {t("checkout.saved")} ✓
                  </span>
                )}
              </div>
            </section>

            {/* Shipping */}
            <section
              className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm ring-1 ring-black/5 dark:ring-white/5 p-6"
              aria-label="Shipping"
            >
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
            </section>

            {/* Payment */}
            <section
              className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm ring-1 ring-black/5 dark:ring-white/5 p-6"
              aria-label="Payment"
            >
              <h2 className="text-lg font-semibold mb-2">
                {t("checkout.payment")}
              </h2>
              <p className="text-sm text-gray-700 dark:text-gray-200 mb-4">
                {t("checkout.paymentNote")}
              </p>

              {!payment && (
                <div className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded px-3 py-2 mb-3">
                  {t(
                    "checkout.choosePayment",
                    "Please choose a payment method to continue.",
                  )}
                </div>
              )}

              {/* Klarna single */}
              <label className="flex items-center gap-3 border rounded-lg p-3 cursor-pointer mt-3 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] dark:border-neutral-700 focus-within:ring-2 focus-within:ring-backnewswhite/80 transition">
                <input
                  type="radio"
                  name="payment"
                  value="klarna_single"
                  checked={payment === "klarna_single"}
                  onChange={() => setPaymentSafe("klarna_single")}
                  aria-label={t("checkout.klarnaSingleLabel")}
                />
                <span className="flex-1">
                  {t("checkout.klarnaSingleLabel")}
                </span>
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
                      aria-label={t("checkout.continueKlarnaNow")}
                    >
                      {creatingOrder
                        ? t("checkout.initializing")
                        : t("checkout.continueKlarnaNow")}
                    </button>
                  ) : (
                    <StripeRedirectPay
                      orderId={localOrderIdRef.current}
                      method="klarna"
                      orderPayload={{
                        email: form.email.trim(),
                        payment_method: "klarna_single",
                        coupon_code: (couponCode || "").trim(),
                        items: backendItems,
                        shipping: {
                          first_name:
                            form.fullName.split(" ")[0] || form.fullName,
                          last_name: form.fullName
                            .split(" ")
                            .slice(1)
                            .join(" "),
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

              {/* Klarna installments */}
              <label className="flex items-center gap-3 border rounded-lg p-3 cursor-pointer mt-3 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] dark:border-neutral-700 focus-within:ring-2 focus-within:ring-backnewswhite/80 transition">
                <input
                  type="radio"
                  name="payment"
                  value="klarna_installments"
                  checked={payment === "klarna_installments"}
                  onChange={() =>
                    installmentsEnabled && setPaymentSafe("klarna_installments")
                  }
                  aria-label={t("checkout.klarnaInstallmentsLabel")}
                />
                <span className="flex-1">
                  {t("checkout.klarnaInstallmentsLabel", {
                    count: klarnaInstallments,
                    per: klarnaPerPayment,
                  })}
                </span>
                <span className="text-xs font-semibold">
                  {t("checkout.processorStripeKlarna")}
                </span>
              </label>

              {!installmentsEnabled && (
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                  {t(
                    "checkout.installmentsMinTotal",
                    "Installment payments are available from an order value of 50 €.",
                  )}
                </p>
              )}

              {payment === "klarna_installments" && (
                <div className="border dark:border-neutral-700 rounded-lg p-3 mt-3">
                  {!localOrderIdRef.current ? (
                    <button
                      type="button"
                      className="px-4 py-2 rounded-lg bg-backnewswhite text-white hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-backnewswhite focus:ring-offset-2 dark:focus:ring-offset-neutral-900 disabled:opacity-50 transition"
                      disabled={creatingOrder}
                      onClick={() => ensureStripeOrder("klarna_installments")}
                      aria-label={t("checkout.continueKlarnaInst")}
                    >
                      {creatingOrder
                        ? t("checkout.initializing")
                        : t("checkout.continueKlarnaInst")}
                    </button>
                  ) : (
                    <StripeRedirectPay
                      orderId={localOrderIdRef.current}
                      method="klarna"
                      orderPayload={{
                        email: form.email.trim(),
                        payment_method: "klarna_installments",
                        coupon_code: (couponCode || "").trim(),
                        items: backendItems,
                        shipping: {
                          first_name:
                            form.fullName.split(" ")[0] || form.fullName,
                          last_name: form.fullName
                            .split(" ")
                            .slice(1)
                            .join(" "),
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

                  <div className="mt-2 text-xs text-gray-700 dark:text-gray-200">
                    {t("checkout.installmentSchedule", {
                      total: fmtEUR(payTotal, locale),
                      months: klarnaInstallments,
                      per: klarnaPerPayment,
                    })}
                  </div>
                </div>
              )}

              {/* Card (Stripe) */}
              <label className="flex items-center gap-3 border rounded-lg p-3 cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03] dark:border-neutral-700 focus-within:ring-2 focus-within:ring-backnewswhite/80 transition">
                <input
                  type="radio"
                  name="payment"
                  value="card"
                  checked={payment === "card"}
                  onChange={() => setPaymentSafe("card")}
                  aria-label={t("checkout.card")}
                />
                <span className="flex-1">{t("checkout.card")}</span>
                <span className="text-xs font-semibold">
                  {t("checkout.processorStripe")}
                </span>
              </label>

              {payment === "card" && (
                <div className="border dark:border-neutral-700 rounded-lg p-3 mt-3">
                  {!localOrderIdRef.current ? (
                    <button
                      type="button"
                      className="px-4 py-2 rounded-lg bg-backnewswhite text-white hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-backnewswhite focus:ring-offset-2 dark:focus:ring-offset-neutral-900 disabled:opacity-50 transition"
                      disabled={creatingOrder}
                      onClick={() => ensureStripeOrder("card")}
                      aria-label={t("checkout.continueCard")}
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

              {/* PayPal (lazy) */}
              {renderPayPalSection()}

              {/* SEPA */}
              {isEuropean ? (
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
              ) : (
                <p className="mt-3 text-xs text-gray-600 dark:text-gray-300">
                  {t(
                    "checkout.sepaEuropeOnly",
                    "SEPA direct debit is only available for European billing addresses.",
                  )}
                </p>
              )}

              {/* SEPA installments */}
              {isEuropean &&
                installmentsEnabled &&
                renderSepaInstallmentsBlock()}
              {isEuropean && !installmentsEnabled && (
                <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                  {t(
                    "checkout.installmentsMinTotal",
                    "Installment payments are available from an order value of 50 €.",
                  )}
                </p>
              )}

              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-800 dark:text-gray-200">
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
            </section>
          </div>

          {/* RIGHT Summary */}
          <aside className="lg:col-span-1" aria-label="Order summary">
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
                        {/* ✅ fix CLS/aspect ratio: width/height + aspect-square, remove fetchPriority */}
                        <img
                          src={it.image}
                          alt={it.name}
                          className="w-16 h-16 aspect-square object-cover rounded"
                          width="64"
                          height="64"
                          loading="lazy"
                          decoding="async"
                        />
                        <span
                          className="absolute -top-2 -right-2 bg-black text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center"
                          aria-label={`${t("cart.quantity")}: ${it.qty}`}
                        >
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
                    aria-label={t("checkout.couponPlaceholder")}
                  />
                  <button
                    onClick={applyCoupon}
                    className="px-4 py-2 rounded-lg bg-backnewswhite text-white hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-backnewswhite focus:ring-offset-2 dark:focus:ring-offset-neutral-900 transition"
                    aria-label={t("checkout.apply")}
                  >
                    {t("checkout.apply")}
                  </button>
                </div>

                {couponErr && (
                  <div className="text-red-700 text-sm">{couponErr}</div>
                )}
                {couponInfo?.ok && (
                  <div className="text-green-700 dark:text-green-500 text-sm">
                    {t("checkout.applied")} <b>{couponInfo.code}</b>:{" "}
                    <span>-{fmtEUR(couponDiscount, locale)}</span>
                  </div>
                )}
              </div>
              {couponInfo?.ok && couponInfo.code && couponDiscount > 0 && (
                <Row
                  label={t("checkout.couponLine", { code: couponInfo.code })}
                  value={`-${fmtEUR(couponDiscount, locale)}`}
                />
              )}
              {productDiscount > 0 && (
                <Row
                  label={t("checkout.productDiscountLine", "Store discount")}
                  value={`-${fmtEUR(productDiscount, locale)}`}
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
              <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">
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
      </main>
    </>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between text-sm mt-1">
      <div className="text-gray-700 dark:text-gray-200">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}

function Badge({ icon, text }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="p-1.5 rounded-md bg-backnewswhite/10 dark:bg-backnewswhite/15"
        aria-hidden="true"
      >
        {icon}
      </div>
      <span className="text-gray-800 dark:text-gray-200">{text}</span>
    </div>
  );
}
