// src/components/Addresses.jsx
import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  useGetAddressesQuery,
  useCreateAddressMutation,
  useUpdateAddressMutation,
  useDeleteAddressMutation,
  useMakeDefaultAddressMutation,
} from "../features/addresses/addressApi";
import { useTranslation } from "react-i18next";
import { normalizeCountry } from "../utils/invoice";

const DEFAULT_COUNTRY = "DE";

const FALLBACK_COUNTRIES = {
  DE: "Germany",
  FR: "France",
  IE: "Ireland",
  BE: "Belgium",
  NL: "Netherlands",
  LU: "Luxembourg",
  DK: "Denmark",
  SE: "Sweden",
  FI: "Finland",
  NO: "Norway",
  IS: "Iceland",
  AT: "Austria",
  CH: "Switzerland",
  PL: "Poland",
  CZ: "Czech Republic",
  HU: "Hungary",
  SK: "Slovakia",
  IT: "Italy",
  ES: "Spain",
  PT: "Portugal",
  MT: "Malta",
  GR: "Greece",
  CY: "Cyprus",
  EE: "Estonia",
  LV: "Latvia",
  LT: "Lithuania",
  SI: "Slovenia",
  HR: "Croatia",
  RO: "Romania",
  BG: "Bulgaria",
  LI: "Liechtenstein",
};

const initial = {
  first_name: "",
  last_name: "",
  address_line1: "",
  address_line2: "",
  postal_code: "",
  city: "",
  country: DEFAULT_COUNTRY,
  phone: "",
  is_default: true,
};

export default function AccountAddresses() {
  const { t } = useTranslation();

  const rawGroups = t("countryGroups", { returnObjects: true });
  const groupLabels =
    rawGroups && typeof rawGroups === "object" && !Array.isArray(rawGroups)
      ? rawGroups
      : {};

  const rawCountries = t("countries", { returnObjects: true });
  const maybeGrouped =
    rawCountries &&
    typeof rawCountries === "object" &&
    !Array.isArray(rawCountries) &&
    Object.values(rawCountries).every(
      (val) => val && typeof val === "object" && !Array.isArray(val)
    );

  let groupedCountries = null;
  let flatCountries = FALLBACK_COUNTRIES;
  if (maybeGrouped) {
    groupedCountries = rawCountries;
    flatCountries = Object.values(rawCountries).reduce((acc, group) => {
      if (group && typeof group === "object") {
        Object.entries(group).forEach(([code, label]) => {
          acc[code] = label;
        });
      }
      return acc;
    }, {});
  } else if (
    rawCountries &&
    typeof rawCountries === "object" &&
    !Array.isArray(rawCountries)
  ) {
    flatCountries = rawCountries;
  }

  const ensureCountryCode = (value) => {
    const normalized = normalizeCountry(value, null);
    if (normalized && flatCountries[normalized]) return normalized;
    const trimmed = (value || "").trim().toUpperCase();
    if (trimmed && flatCountries[trimmed]) return trimmed;
    return DEFAULT_COUNTRY;
  };

  const formatCountry = (value) => {
    const normalized = normalizeCountry(value, null);
    if (normalized && flatCountries[normalized])
      return flatCountries[normalized];
    const trimmed = (value || "").trim();
    if (!trimmed) return "";
    if (flatCountries[trimmed]) return flatCountries[trimmed];
    return trimmed;
  };

  const { data: list = [], isFetching } = useGetAddressesQuery();
  const [createAddress, { isLoading: creating }] = useCreateAddressMutation();
  const [updateAddress, { isLoading: updating }] = useUpdateAddressMutation();
  const [deleteAddress] = useDeleteAddressMutation();
  const [makeDefault] = useMakeDefaultAddressMutation();

  const [form, setForm] = useState(initial);
  const [editingId, setEditingId] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  // 🔴 NEW: field-level validation errors
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!isFetching && !editingId) setForm(initial);
  }, [isFetching, editingId]);

  // 🔵 Simple postal → city lookup (DE only)
  const lookupCityByPostal = useCallback((country, postal) => {
    if (!postal) return "";
    if (country !== "DE") return "";
    const mapDE = {
      21640: "Horneburg",
      20095: "Hamburg",
      10115: "Berlin",
    };
    return mapDE[postal] || "";
  }, []);

  useEffect(() => {
    const postal = (form.postal_code || "").trim();
    const country = normalizeCountry(form.country);
    if (!postal || country !== "DE") return;

    const foundCity = lookupCityByPostal(country, postal);
    if (foundCity && !form.city) {
      setForm((prev) => ({ ...prev, city: foundCity }));
      setErrors((prev) => ({ ...prev, city: "" }));
    }
  }, [form.postal_code, form.country, form.city, lookupCityByPostal]);

  // 🔧 Validation logic (similar style as Checkout)

  const validateField = useCallback(
    (name, value, currentForm) => {
      const v = (value || "").toString().trim();
      const country = normalizeCountry(currentForm.country);

      if (name === "first_name") {
        if (!v)
          return t(
            "addresses.errors.firstNameRequired",
            "First name is required."
          );
        return "";
      }

      if (name === "last_name") {
        if (!v)
          return t(
            "addresses.errors.lastNameRequired",
            "Last name is required."
          );
        return "";
      }

      if (name === "address_line1") {
        if (!v)
          return t(
            "addresses.errors.streetRequired",
            "Street and house number are required."
          );
        // must contain at least one digit (house number check)
        if (!/\d/.test(v)) {
          return t(
            "addresses.errors.streetHouseInvalid",
            "Please include a house number with digits (letters allowed)."
          );
        }
        return "";
      }

      if (name === "postal_code") {
        if (!v)
          return t(
            "addresses.errors.postalRequired",
            "Postal code is required."
          );
        if (country === "DE") {
          if (!/^\d{5}$/.test(v)) {
            return t(
              "addresses.errors.postalDE",
              "Please enter a 5-digit German postal code."
            );
          }
        }
        return "";
      }

      if (name === "city") {
        if (!v) return t("addresses.errors.cityRequired", "City is required.");
        return "";
      }

      if (name === "phone") {
        if (!v)
          return t(
            "addresses.errors.phoneRequired",
            "Telephone number is required."
          );
        const numeric = v.replace(/\s+/g, "");
        if (country === "DE") {
          if (!/^(?:\+49|0)\d{6,14}$/.test(numeric)) {
            return t(
              "addresses.errors.phoneDE",
              "Please enter a valid German phone number (e.g. 01701234567 or +491701234567)."
            );
          }
          return "";
        }
        if (!/^\+?[0-9][0-9\s\-()]{6,}$/.test(v)) {
          return t(
            "addresses.errors.phoneGeneric",
            "Please enter a valid phone number including country/area code."
          );
        }
        return "";
      }

      return "";
    },
    [t]
  );

  const validateAll = useCallback(
    (f) => {
      const toCheck = [
        "first_name",
        "last_name",
        "address_line1",
        "postal_code",
        "city",
        "phone",
      ];
      const nextErrors = {};
      toCheck.forEach((name) => {
        const err = validateField(name, f[name], f);
        if (err) nextErrors[name] = err;
      });
      setErrors(nextErrors);
      return Object.keys(nextErrors).length === 0;
    },
    [validateField]
  );

  const save = async () => {
    setErrorMsg("");
    const ok = validateAll(form);
    if (!ok) return; // stop if invalid

    const payload = {
      ...form,
      country: ensureCountryCode(form.country),
    };

    if (editingId) {
      await updateAddress({ id: editingId, ...payload }).unwrap();
    } else {
      await createAddress(payload).unwrap();
    }
    setForm(initial);
    setEditingId(null);
    setErrors({});
  };

  const edit = (a) => {
    setEditingId(a.id);
    setForm({
      ...initial,
      ...a,
      country: ensureCountryCode(a.country),
    });
    setErrors({});
  };

  const del = async (id) => {
    setErrorMsg("");
    try {
      await deleteAddress(id).unwrap();
    } catch (err) {
      console.error("Failed to delete address", err);

      const code = err?.data?.code;
      if (code === "address_in_use") {
        setErrorMsg(
          t(
            "addresses.inUseError",
            "This address is used by existing orders and cannot be deleted."
          )
        );
      } else {
        setErrorMsg(
          t(
            "addresses.deleteError",
            "Could not delete this address. Please try again."
          )
        );
      }
    }
  };

  const inputBase =
    "border rounded px-3 py-2 text-gray-900 dark:text-gray-100 " +
    "bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 " +
    "focus:outline-none focus:ring-2 focus:ring-backnewswhite dark:focus:ring-backnewsdark " +
    "focus:border-backnewswhite dark:focus:border-backnewsdark";

  const handleCountryChange = (e) => {
    const code = ensureCountryCode(e.target.value);
    setForm((prev) => ({ ...prev, country: code }));
    setErrors((prev) => ({ ...prev, phone: "" })); // clear phone error when country changes
  };

  const handleChange = (field) => (e) => {
    const { value } = e.target;
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          {t("addresses.title")}
        </h1>
        <Link
          to="/account"
          className="text-sm md:text-base text-backnewswhite hover:text-backnewsdark dark:text-backnewsdark dark:hover:text-backnewswhite underline-offset-2 hover:underline"
        >
          {t("backtoAccount")}
        </Link>
      </div>
      {errorMsg && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-500/40 dark:bg-red-950/60 dark:text-red-100">
          {errorMsg}
        </div>
      )}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Form */}
        <div className="p-6 rounded-xl border border-black/5 dark:border-white/10 bg-marblewhite dark:bg-marbleblack shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {editingId
                ? t("addresses.editAddress")
                : t("addresses.newAddress")}
            </h2>
            <span className="text-xs bg-backnewswhite/10 text-backnewswhite dark:bg-backnewsdark/10 dark:text-backnewsdark px-2 py-1 rounded">
              {t("addresses.mainBadge")}
            </span>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <input
                placeholder={t("addresses.firstName")}
                value={form.first_name}
                onChange={handleChange("first_name")}
                onBlur={(e) =>
                  setErrors((prev) => ({
                    ...prev,
                    first_name: validateField(
                      "first_name",
                      e.target.value,
                      form
                    ),
                  }))
                }
                className={inputBase}
              />
              {errors.first_name && (
                <p className="mt-1 text-xs text-red-600">{errors.first_name}</p>
              )}
            </div>

            <div>
              <input
                placeholder={t("addresses.lastName")}
                value={form.last_name}
                onChange={handleChange("last_name")}
                onBlur={(e) =>
                  setErrors((prev) => ({
                    ...prev,
                    last_name: validateField("last_name", e.target.value, form),
                  }))
                }
                className={inputBase}
              />
              {errors.last_name && (
                <p className="mt-1 text-xs text-red-600">{errors.last_name}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <input
                placeholder={t("addresses.street")}
                value={form.address_line1}
                onChange={handleChange("address_line1")}
                onBlur={(e) =>
                  setErrors((prev) => ({
                    ...prev,
                    address_line1: validateField(
                      "address_line1",
                      e.target.value,
                      form
                    ),
                  }))
                }
                className={inputBase}
              />
              {errors.address_line1 && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.address_line1}
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <input
                placeholder={t("addresses.address2")}
                value={form.address_line2}
                onChange={handleChange("address_line2")}
                className={inputBase}
              />
            </div>

            <div>
              <input
                placeholder={t("addresses.postalCode")}
                value={form.postal_code}
                onChange={handleChange("postal_code")}
                onBlur={(e) =>
                  setErrors((prev) => ({
                    ...prev,
                    postal_code: validateField(
                      "postal_code",
                      e.target.value,
                      form
                    ),
                  }))
                }
                className={inputBase}
              />
              {errors.postal_code && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.postal_code}
                </p>
              )}
            </div>

            <div>
              <input
                placeholder={t("addresses.city")}
                value={form.city}
                onChange={handleChange("city")}
                onBlur={(e) =>
                  setErrors((prev) => ({
                    ...prev,
                    city: validateField("city", e.target.value, form),
                  }))
                }
                className={inputBase}
              />
              {errors.city && (
                <p className="mt-1 text-xs text-red-600">{errors.city}</p>
              )}
            </div>

            <select
              value={form.country}
              onChange={handleCountryChange}
              className={inputBase}
            >
              {groupedCountries
                ? Object.entries(groupedCountries).map(
                    ([groupKey, countryMap]) => (
                      <optgroup
                        key={groupKey}
                        label={groupLabels[groupKey] || groupKey}
                      >
                        {Object.entries(countryMap).map(([code, label]) => (
                          <option key={code} value={code}>
                            {label}
                          </option>
                        ))}
                      </optgroup>
                    )
                  )
                : Object.entries(flatCountries).map(([code, label]) => (
                    <option key={code} value={code}>
                      {label}
                    </option>
                  ))}
            </select>

            <div>
              <input
                placeholder={t("addresses.phone")}
                value={form.phone}
                onChange={handleChange("phone")}
                onBlur={(e) =>
                  setErrors((prev) => ({
                    ...prev,
                    phone: validateField("phone", e.target.value, form),
                  }))
                }
                className={inputBase}
              />
              {errors.phone && (
                <p className="mt-1 text-xs text-red-600">{errors.phone}</p>
              )}
            </div>
          </div>

          <label className="flex items-center gap-2 mt-4 text-gray-800 dark:text-gray-200">
            <input
              id="is_default"
              type="checkbox"
              checked={!!form.is_default}
              onChange={(e) =>
                setForm({ ...form, is_default: e.target.checked })
              }
              className="h-4 w-4 accent-backnewswhite dark:accent-backnewsdark"
            />
            <span className="text-sm">{t("addresses.setAsMain")}</span>
          </label>

          <button
            onClick={save}
            disabled={creating || updating}
            className="mt-6 inline-flex items-center justify-center rounded-lg px-5 py-2.5
                       bg-backnewswhite text-white hover:opacity-90 disabled:opacity-60
                       dark:bg-backnewsdark dark:text-gray-900 transition"
          >
            {creating || updating
              ? t("addresses.saving")
              : editingId
              ? t("addresses.saveChanges")
              : t("addresses.addNew")}
          </button>
        </div>

        {/* List */}
        <div className="space-y-4">
          {list.map((a) => (
            <div
              key={a.id}
              className="p-5 rounded-xl border border-black/5 dark:border-white/10 bg-white dark:bg-gray-900 shadow-sm flex justify-between items-start gap-4"
            >
              <div>
                <div className="font-semibold text-gray-900 dark:text-gray-100">
                  {a.first_name} {a.last_name}{" "}
                  {a.is_default ? (
                    <span className="ml-2 text-xs bg-backnewswhite/10 text-backnewswhite dark:bg-backnewsdark/10 dark:text-backnewsdark px-2 py-1 rounded">
                      {t("addresses.mainTag")}
                    </span>
                  ) : null}
                </div>
                <div className="text-gray-700 dark:text-gray-300">
                  {a.address_line1}
                </div>
                {a.address_line2 ? (
                  <div className="text-gray-700 dark:text-gray-300">
                    {a.address_line2}
                  </div>
                ) : null}
                <div className="text-gray-700 dark:text-gray-300">
                  {a.postal_code} {a.city}
                </div>
                <div className="text-gray-700 dark:text-gray-300">
                  {formatCountry(a.country)}
                </div>
                {a.phone ? (
                  <div className="text-gray-700 dark:text-gray-300">
                    {a.phone}
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-3">
                {!a.is_default && (
                  <button
                    className="underline underline-offset-2 text-backnewswhite hover:text-backnewsdark dark:text-backnewsdark dark:hover:text-backnewswhite"
                    onClick={() => makeDefault(a.id).unwrap()}
                  >
                    {t("addresses.makeMain")}
                  </button>
                )}
                <button
                  className="underline underline-offset-2 text-gray-900 dark:text-gray-100 hover:opacity-80"
                  onClick={() => edit(a)}
                >
                  {t("addresses.edit")}
                </button>
                <button
                  className="underline underline-offset-2 text-red-600 hover:text-red-700"
                  onClick={() => del(a.id)}
                >
                  {t("addresses.delete")}
                </button>
              </div>
            </div>
          ))}

          {!list.length && (
            <div className="text-gray-600 dark:text-gray-400">
              {t("addresses.none")}.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
