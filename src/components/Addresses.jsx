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
  const { t, i18n } = useTranslation();
  const locale = i18n.language || "en";

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

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 text-backnewswhite dark:text-backnewsdark">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-light mb-8">{t("addresses.title")} </h1>
        <Link to="/account" className="p-6 hover:underline">
          <h6 className="text-2xl font-light mb-8">{t("backtoAccount")} </h6>
        </Link>
        <span className="text-sm text-gray-500">
          {t(useGetAddressesQuery.subtitle)}
        </span>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Form */}
        <div className="p-6 border rounded">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-light">
              {editingId
                ? t("addresses.editAddress")
                : t("addresses.newAddress")}
            </h2>
            <span className="text-xs bg-gray-200 px-2 py-1 rounded">
              {t("addresses.mainBadge")}
            </span>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <input
              placeholder={t("addresses.firstName")}
              value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              className="border px-3 py-2 rounded dark:bg-marbleblack"
            />
            <input
              placeholder={t("addresses.lastName")}
              value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              className="border px-3 py-2 rounded dark:bg-marbleblack"
            />
            <input
              placeholder={t("addresses.street")}
              value={form.address_line1}
              onChange={(e) =>
                setForm({ ...form, address_line1: e.target.value })
              }
              className="border px-3 py-2 rounded md:col-span-2 dark:bg-marbleblack"
            />
            <input
              placeholder={t("addresses.address2")}
              value={form.address_line2}
              onChange={(e) =>
                setForm({ ...form, address_line2: e.target.value })
              }
              className="border px-3 py-2 rounded md:col-span-2 dark:bg-marbleblack"
            />
            <input
              placeholder={t("addresses.postalCode")}
              value={form.postal_code}
              onChange={(e) =>
                setForm({ ...form, postal_code: e.target.value })
              }
              className="border px-3 py-2 rounded dark:bg-marbleblack"
            />
            <input
              placeholder={t("addresses.city")}
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="border px-3 py-2 rounded dark:bg-marbleblack"
            />
            <select
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              className="border px-3 py-2 rounded dark:bg-marbleblack"
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
              className="border px-3 py-2 rounded dark:bg-marbleblack"
            />
          </div>

          <div className="flex items-center gap-2 mt-4 dark:bg-marbleblack">
            <input
              id="is_default"
              type="checkbox"
              checked={!!form.is_default}
              onChange={(e) =>
                setForm({ ...form, is_default: e.target.checked })
              }
            />
            <label htmlFor="is_default" className="text-sm">
              {t("addresses.setAsMain")}
            </label>
          </div>

          <button
            onClick={save}
            disabled={creating || updating}
            className="mt-6 bg-black text-white px-5 py-2 rounded disabled:opacity-60 dark:bg-gray-800  text-backnewswhite dark:text-backnewsdark "
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
              className="p-5 border rounded flex justify-between items-start"
            >
              <div>
                <div className="font-semibold">
                  {a.first_name} {a.last_name}{" "}
                  {a.is_default ? (
                    <span className="ml-2 text-xs bg-gray-200 px-2 py-1 rounded">
                      {t("addresses.mainTag")}
                    </span>
                  ) : null}
                </div>
                <div className="text-gray-700">{a.address_line1}</div>
                {a.address_line2 ? (
                  <div className="text-gray-700">{a.address_line2}</div>
                ) : null}
                <div className="text-gray-700">
                  {a.postal_code} {a.city}
                </div>
                <div className="text-gray-700">{a.country}</div>
                {a.phone ? (
                  <div className="text-gray-700">{a.phone}</div>
                ) : null}
              </div>
              <div className="flex gap-3">
                {!a.is_default && (
                  <button
                    className="underline"
                    onClick={() => makeDefault(a.id).unwrap()}
                  >
                    {t("addresses.makeMain")}
                  </button>
                )}
                <button className="underline" onClick={() => edit(a)}>
                  {t("addresses.edit")}
                </button>
                <button
                  className="underline text-red-600"
                  onClick={() => del(a.id)}
                >
                  {t("addresses.delete")}
                </button>
              </div>
            </div>
          ))}
          {!list.length && (
            <div className="text-gray-500"> {t("addresses.none")}.</div>
          )}
        </div>
      </div>
    </div>
  );
}
