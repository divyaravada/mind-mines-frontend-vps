// src/components/Profile.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import avatar from "../assets/avatar.png";
import {
  useGetAccountQuery,
  useUpdateAccountMutation,
  useRequestDeletionMutation,
} from "../features/account/accountApi";
import { toAbsoluteUrl } from "../utils/urls";
import { Helmet } from "react-helmet-async";

export default function Profile() {
  const { t } = useTranslation();

  const { data: account, isLoading, refetch } = useGetAccountQuery();
  const [updateAccount, { isLoading: saving }] = useUpdateAccountMutation();
  const [requestDeletion, { isLoading: sendingDeletion }] =
    useRequestDeletionMutation();

  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({ username: "", full_name: "" });
  const [upload, setUpload] = useState(null);

  // deletion modal
  const [editDeletion, setEditDeletion] = useState(false);
  const [deletionReason, setDeletionReason] = useState("");
  const [deletionMsg, setDeletionMsg] = useState(null);

  useEffect(() => {
    if (account) {
      setForm({
        username: account.username || "",
        full_name: account.full_name || "",
      });
    }
  }, [account]);

  const imgSrc = useMemo(
    () => (account?.image ? toAbsoluteUrl(account.image) : avatar),
    [account]
  );

  const onChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const save = async () => {
    const fd = new FormData();
    fd.append("username", form.username ?? "");
    fd.append("full_name", form.full_name ?? "");
    if (upload) fd.append("image", upload);
    await updateAccount(fd).unwrap();
    setEdit(false);
    setUpload(null);
    refetch();
  };

  const submitDeletion = async () => {
    const reason = deletionReason.trim();
    if (!reason) {
      setDeletionMsg(t("profile.deletion.reasonRequired"));
      return;
    }
    try {
      setDeletionMsg(null);
      await requestDeletion({ reason }).unwrap();
      setDeletionMsg(t("profile.deletion.sent"));
      setTimeout(() => {
        setEditDeletion(false);
        setDeletionReason("");
        setDeletionMsg(null);
      }, 1200);
    } catch {
      setDeletionMsg(t("profile.deletion.failed"));
    }
  };

  if (isLoading) return <div>{t("common.loading")}</div>;

  return (
    <>
      <Helmet>
        <meta name="robots" content="noindex,nofollow" />
        <meta name="googlebot" content="noindex,nofollow" />
      </Helmet>
      <div className="max-w-6xl mx-auto px-6 py-10 text-gray-900 dark:text-gray-100">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-light mb-8 text-backnewswhite dark:text-backnewsdark">
            {t("profile.title")}
          </h1>
          <Link to="/account" className="p-6 hover:underline">
            <h6 className="text-xl font-light mb-8">{t("backtoAccount")}</h6>
          </Link>
        </div>

        <div className="max-w-xl mx-auto bg-marblewhite dark:bg-marbleblack shadow p-6 rounded text-gray-900 dark:text-gray-100">
          {!edit ? (
            <>
              <div className="flex items-center gap-4">
                <img
                  src={imgSrc}
                  alt=""
                  className="w-16 h-16 rounded-full object-cover"
                  fetchPriority="high"
                  loading="lazy"
                  decoding="async"
                />
                <div>
                  <div className="text-lg font-semibold">
                    {account?.full_name || "—"}
                  </div>
                  <div className="text-sm text-gray-500">{account?.email}</div>
                </div>
              </div>

              <div className="mt-4 text-sm space-y-1">
                <div>
                  <strong>{t("profile.username")}:</strong> {account?.username}
                </div>
                <div>
                  <strong>{t("profile.verified")}:</strong>{" "}
                  {account?.verified ? t("profile.yes") : t("profile.no")}
                </div>
              </div>

              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => setEdit(true)}
                  className="mt-4 px-3 py-2 rounded border text-sm"
                >
                  {t("profile.editProfile")}
                </button>
                <button
                  onClick={() => setEditDeletion(true)}
                  className="mt-4 px-3 py-2 rounded border text-sm"
                >
                  {t("profile.requestDeletion")}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3">
                <label
                  className="text-sm text-gray-600 dark:text-backnewsdark"
                  htmlFor="username"
                >
                  {t("profile.username")}
                </label>
                <input
                  id="username"
                  name="username"
                  value={form.username}
                  onChange={onChange}
                  className="w-full border rounded px-3 py-2 dark:bg-marbleblack text-backnewswhite dark:text-backnewsdark"
                />

                <label
                  className="text-sm text-gray-600 dark:text-backnewsdark"
                  htmlFor="full_name"
                >
                  {t("profile.fullName")}
                </label>
                <input
                  id="full_name"
                  name="full_name"
                  value={form.full_name}
                  onChange={onChange}
                  className="w-full border rounded px-3 py-2 dark:bg-marbleblack text-backnewswhite dark:text-backnewsdark"
                />

                <label
                  className="text-sm text-gray-600 dark:text-backnewsdark"
                  htmlFor="avatar"
                >
                  {t("profile.avatar")}
                </label>
                <input
                  id="avatar"
                  type="file"
                  onChange={(e) => setUpload(e.target.files?.[0] || null)}
                />
              </div>

              <div className="mt-4 flex gap-3">
                <button
                  onClick={save}
                  disabled={saving}
                  className="px-3 py-2 rounded bg-backnewswhite text-white text-sm disabled:opacity-60
            dark:bg-backnewsdark dark:text-marbleblack"
                >
                  {saving ? t("profile.saving") : t("profile.save")}
                </button>
                <button
                  onClick={() => {
                    setEdit(false);
                    setUpload(null);
                    setForm({
                      username: account?.username || "",
                      full_name: account?.full_name || "",
                    });
                  }}
                  className="px-3 py-2 rounded border text-sm"
                >
                  {t("profile.cancel")}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Deletion modal */}
        {editDeletion && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center "
            role="dialog"
            aria-modal="true"
          >
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => !sendingDeletion && setEditDeletion(false)}
            />
            <div className="relative bg-white w-[95%] max-w-lg rounded-lg shadow-xl p-6 dark:bg-gray-800 text-backnewswhite dark:text-backnewsdark">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold">
                  {t("profile.deletion.title")}
                </h3>
                <button
                  onClick={() => !sendingDeletion && setEditDeletion(false)}
                  className="rounded px-2 py-1 text-gray-500 hover:bg-gray-100"
                  aria-label={t("common.close")}
                  disabled={sendingDeletion}
                >
                  ✕
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                {t("profile.deletion.intro")}
              </p>
              <textarea
                value={deletionReason}
                onChange={(e) => setDeletionReason(e.target.value)}
                rows={4}
                className="w-full border rounded px-3 py-2 dark:bg-marbleblack text-backnewswhite dark:text-backnewsdark"
                placeholder={t("profile.deletion.placeholder")}
                disabled={sendingDeletion}
              />
              {deletionMsg && <div className="mt-3 text-sm">{deletionMsg}</div>}
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => setEditDeletion(false)}
                  className="px-3 py-2 rounded border text-sm"
                  disabled={sendingDeletion}
                >
                  {t("profile.cancel")}
                </button>
                <button
                  onClick={submitDeletion}
                  className="px-3 py-2 rounded bg-black text-white text-sm disabled:opacity-60"
                  disabled={sendingDeletion}
                >
                  {sendingDeletion
                    ? t("profile.deletion.sending")
                    : t("profile.deletion.sendRequest")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
