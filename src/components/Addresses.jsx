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

const initial = {
  first_name: "",
  last_name: "",
  address_line1: "",
  address_line2: "",
  postal_code: "",
  city: "",
  country: "Germany",
  phone: "",
  is_default: true,
};

export default function AccountAddresses() {
  const { t } = useTranslation();

  const { data: list = [], isFetching } = useGetAddressesQuery();
  const [createAddress, { isLoading: creating }] = useCreateAddressMutation();
  const [updateAddress, { isLoading: updating }] = useUpdateAddressMutation();
  const [deleteAddress] = useDeleteAddressMutation();
  const [makeDefault] = useMakeDefaultAddressMutation();

  const [form, setForm] = useState(initial);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    if (!isFetching && !editingId) setForm(initial);
  }, [isFetching, editingId]);

  const save = async () => {
    if (editingId) {
      await updateAddress({ id: editingId, ...form }).unwrap();
    } else {
      await createAddress(form).unwrap();
    }
    setForm(initial);
    setEditingId(null);
  };

  const edit = (a) => {
    setEditingId(a.id);
    setForm({ ...initial, ...a });
  };

  const del = async (id) => {
    await deleteAddress(id).unwrap();
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
            <input
              placeholder={t("addresses.firstName")}
              value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              className={inputBase}
            />
            <input
              placeholder={t("addresses.lastName")}
              value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              className={inputBase}
            />
            <input
              placeholder={t("addresses.street")}
              value={form.address_line1}
              onChange={(e) =>
                setForm({ ...form, address_line1: e.target.value })
              }
              className={`${inputBase} md:col-span-2`}
            />
            <input
              placeholder={t("addresses.address2")}
              value={form.address_line2}
              onChange={(e) =>
                setForm({ ...form, address_line2: e.target.value })
              }
              className={`${inputBase} md:col-span-2`}
            />
            <input
              placeholder={t("addresses.postalCode")}
              value={form.postal_code}
              onChange={(e) =>
                setForm({ ...form, postal_code: e.target.value })
              }
              className={inputBase}
            />
            <input
              placeholder={t("addresses.city")}
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className={inputBase}
            />
            <select
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              className={inputBase}
            >
              <option value="Germany">{t("countries.germany")}</option>
              <option value="Austria">{t("countries.austria")}</option>
              <option value="Switzerland">{t("countries.switzerland")}</option>
              <option value="France">{t("countries.france")}</option>
              <option value="Italy">{t("countries.italy")}</option>
              <option value="Netherlands">{t("countries.netherlands")}</option>
            </select>
            <input
              placeholder={t("addresses.phone")}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className={inputBase}
            />
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
                  {a.country}
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
