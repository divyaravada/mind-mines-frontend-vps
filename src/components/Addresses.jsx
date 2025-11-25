// src/components/Addresses.jsx
import { useEffect, useState } from "react";
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
import { lookupCityFromPostal } from "../utils/addressApi";
import { parsePhoneNumberFromString } from "libphonenumber-js";

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

  // field-level errors
  const [fieldErrors, setFieldErrors] = useState({});
  const [cityOptions, setCityOptions] = useState([]);
  const [cityLoading, setCityLoading] = useState(false);

  useEffect(() => {
    if (!isFetching && !editingId) {
      setForm(initial);
      setFieldErrors({});
      setCityOptions([]);
    }
  }, [isFetching, editingId]);

  const validatePhone = (phone, country) => {
    const trimmed = (phone || "").trim();
    if (!trimmed) {
      return t("addresses.errPhoneRequired", "Telephone is required.");
    }
    try {
      const cc = normalizeCountry(country || "DE");
      const parsed = parsePhoneNumberFromString(trimmed, cc || "DE");
      if (!parsed || !parsed.isValid()) {
        return t(
          "addresses.errPhoneFormat",
          "Please enter a valid phone number for the selected country."
        );
      }
    } catch {
      return t(
        "addresses.errPhoneFormat",
        "Please enter a valid phone number for the selected country."
      );
    }
    return null;
  };

  const validateForm = () => {
    const errors = {};

    if (!form.first_name.trim()) {
      errors.first_name = t(
        "addresses.errFirstName",
        "First name is required."
      );
    }
    if (!form.last_name.trim()) {
      errors.last_name = t("addresses.errLastName", "Last name is required.");
    }
    if (!form.address_line1.trim()) {
      errors.address_line1 = t(
        "addresses.errStreetRequired",
        "Street and house number are required."
      );
    } else if (!/\d/.test(form.address_line1)) {
      // needs at least one digit → house number
      errors.address_line1 = t(
        "addresses.errHouseNumber",
        "Please include a house number (digits, letters like 12a are ok)."
      );
    }
    if (!form.postal_code.trim()) {
      errors.postal_code = t("addresses.errPostal", "Postal code is required.");
    }
    if (!form.city.trim()) {
      errors.city = t("addresses.errCity", "City is required.");
    }

    const phoneErr = validatePhone(form.phone, form.country);
    if (phoneErr) {
      errors.phone = phoneErr;
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePostalBlur = async () => {
    const postal = (form.postal_code || "").trim();
    if (!postal) return;

    setCityLoading(true);
    try {
      const cities = await lookupCityFromPostal(form.country, postal);
      setCityOptions(cities);
      if (cities.length === 1 && !form.city.trim()) {
        setForm((prev) => ({ ...prev, city: cities[0] }));
      }
    } catch (e) {
      console.warn("City lookup failed", e);
    } finally {
      setCityLoading(false);
    }
  };

  const save = async () => {
    setErrorMsg("");
    if (!validateForm()) {
      setErrorMsg(
        t(
          "addresses.formInvalid",
          "Please fix the highlighted fields before saving."
        )
      );
      return;
    }

    try {
      if (editingId) {
        await updateAddress({ id: editingId, ...form }).unwrap();
      } else {
        await createAddress(form).unwrap();
      }
      setForm(initial);
      setEditingId(null);
      setFieldErrors({});
      setCityOptions([]);
    } catch (err) {
      console.error("Save address failed", err);
      setErrorMsg(
        err?.data?.detail ||
          t(
            "addresses.saveError",
            "Could not save the address. Please try again."
          )
      );
    }
  };

  const edit = (a) => {
    setEditingId(a.id);
    setForm({
      ...initial,
      ...a,
      country: ensureCountryCode(a.country),
    });
    setFieldErrors({});
    setCityOptions([]);
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
            {/* First name */}
            <div>
              <input
                placeholder={t("addresses.firstName")}
                value={form.first_name}
                onChange={(e) =>
                  setForm({ ...form, first_name: e.target.value })
                }
                className={inputBase}
              />
              {fieldErrors.first_name && (
                <p className="mt-1 text-xs text-red-600">
                  {fieldErrors.first_name}
                </p>
              )}
            </div>

            {/* Last name */}
            <div>
              <input
                placeholder={t("addresses.lastName")}
                value={form.last_name}
                onChange={(e) =>
                  setForm({ ...form, last_name: e.target.value })
                }
                className={inputBase}
              />
              {fieldErrors.last_name && (
                <p className="mt-1 text-xs text-red-600">
                  {fieldErrors.last_name}
                </p>
              )}
            </div>

            {/* Street + house no */}
            <div className="md:col-span-2">
              <input
                placeholder={t("addresses.street")}
                value={form.address_line1}
                onChange={(e) =>
                  setForm({ ...form, address_line1: e.target.value })
                }
                className={inputBase}
              />
              {fieldErrors.address_line1 && (
                <p className="mt-1 text-xs text-red-600">
                  {fieldErrors.address_line1}
                </p>
              )}
            </div>

            {/* Address line 2 */}
            <div className="md:col-span-2">
              <input
                placeholder={t("addresses.address2")}
                value={form.address_line2}
                onChange={(e) =>
                  setForm({ ...form, address_line2: e.target.value })
                }
                className={inputBase}
              />
            </div>

            {/* Postal code */}
            <div>
              <input
                placeholder={t("addresses.postalCode")}
                value={form.postal_code}
                onChange={(e) =>
                  setForm({ ...form, postal_code: e.target.value })
                }
                onBlur={handlePostalBlur}
                className={inputBase}
              />
              {fieldErrors.postal_code && (
                <p className="mt-1 text-xs text-red-600">
                  {fieldErrors.postal_code}
                </p>
              )}
              {cityLoading && (
                <p className="mt-1 text-xs text-gray-500">
                  {t("addresses.lookupCity", "Looking up city…")}
                </p>
              )}
            </div>

            {/* City with datalist */}
            <div>
              <input
                placeholder={t("addresses.city")}
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                list="account-city-options"
                className={inputBase}
              />
              <datalist id="account-city-options">
                {cityOptions.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              {fieldErrors.city && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.city}</p>
              )}
            </div>

            {/* Country */}
            <select
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
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

            {/* Phone */}
            <div>
              <input
                placeholder={t("addresses.phone")}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className={inputBase}
              />
              {fieldErrors.phone && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.phone}</p>
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
