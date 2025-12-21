// src/components/Reviews.jsx
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  useGetMyReviewsQuery,
  useUpdateReviewMutation,
  useDeleteReviewMutation,
} from "../features/reviews/reviewsApi";
import { Helmet } from "react-helmet-async";

export default function Reviews() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language || "en";

  const {
    data: reviews = [],
    isFetching,
    error,
    refetch,
  } = useGetMyReviewsQuery();
  const [updateReview, { isLoading: saving }] = useUpdateReviewMutation();
  const [deleteReview] = useDeleteReviewMutation();

  const [editingId, setEditingId] = useState(null);
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState("");
  const [clearImage, setClearImage] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (editingId == null) {
      setRating(5);
      setMessage("");
      setClearImage(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }, [editingId]);

  const startEdit = (rv) => {
    setEditingId(rv.id);
    setRating(rv.rating);
    setMessage(rv.message);
    setClearImage(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const cancelEdit = () => {
    setEditingId(null);
    setClearImage(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const save = async (id) => {
    const fd = new FormData();
    fd.append("rating", String(rating));
    fd.append("message", message);
    if (clearImage) fd.append("clear_image", "true");
    if (fileRef.current?.files?.[0]) {
      fd.append("image", fileRef.current.files[0]);
    }
    await updateReview({ id, formData: fd }).unwrap();
    cancelEdit();
    refetch();
  };

  const remove = async (id) => {
    await deleteReview(id).unwrap();
    if (editingId === id) cancelEdit();
    refetch();
  };

  return (
    <>
      <Helmet>
        <meta name="robots" content="noindex,nofollow" />
        <meta name="googlebot" content="noindex,nofollow" />
      </Helmet>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
          <h1 className="text-2xl font-light text-backnewswhite dark:text-backnewsdark">
            {t("reviews.title")}
          </h1>
          <Link
            to="/account"
            className="text-sm text-backnewswhite hover:underline dark:text-backnewsdark"
          >
            {t("backtoAccount", "Back to Account")}
          </Link>
          <span className="text-sm text-gray-500">
            {t("reviews.count", { count: reviews.length })}
          </span>
        </div>

        {isFetching && (
          <div className="text-gray-500">{t("common.loading")}</div>
        )}

        {error && !isFetching && (
          <div className="text-red-600 mb-4">
            {error?.status === 401
              ? t("reviews.signInRequired")
              : t("reviews.loadError")}
          </div>
        )}

        {!isFetching && !error && reviews.length === 0 && (
          <div className="text-gray-500">
            {t("reviews.empty", "You haven’t written any reviews yet.")}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reviews.map((rv) => (
            <div
              key={rv.id}
              className="
              rounded shadow
              bg-white text-gray-900
              dark:bg-neutral-900 dark:text-neutral-100
              p-4
            "
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{rv.product_name}</h3>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(rv.created_at).toLocaleString(locale)}
                  </div>
                </div>
                <div className="flex gap-2">
                  {editingId !== rv.id && (
                    <button
                      onClick={() => startEdit(rv)}
                      className="
                      text-sm px-2 py-1 border rounded
                      border-gray-300 dark:border-neutral-700
                      hover:bg-gray-50 dark:hover:bg-neutral-800
                    "
                    >
                      {t("reviews.edit")}
                    </button>
                  )}
                  <button
                    onClick={() => remove(rv.id)}
                    className="
                    text-sm px-2 py-1 border rounded
                    border-red-300 text-red-600 hover:bg-red-50
                    dark:border-red-700 dark:hover:bg-red-900/20
                  "
                  >
                    {t("reviews.delete")}
                  </button>
                </div>
              </div>

              {editingId === rv.id ? (
                <div className="mt-3 space-y-3">
                  <div className="flex items-center gap-3">
                    <label className="font-medium" htmlFor={`rating-${rv.id}`}>
                      {t("reviews.rating")}:
                    </label>
                    <select
                      id={`rating-${rv.id}`}
                      value={rating}
                      onChange={(e) => setRating(Number(e.target.value))}
                      className="
                      border rounded px-2 py-1
                      border-gray-300 dark:border-neutral-700
                      bg-white dark:bg-neutral-900
                    "
                    >
                      {[5, 4, 3, 2, 1].map((n) => (
                        <option key={n} value={n}>
                          {n} ★
                        </option>
                      ))}
                    </select>
                  </div>

                  <label className="sr-only" htmlFor={`message-${rv.id}`}>
                    {t("reviews.messageLabel")}
                  </label>
                  <textarea
                    id={`message-${rv.id}`}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="
                    w-full border rounded px-3 py-2
                    border-gray-300 dark:border-neutral-700
                    bg-white dark:bg-neutral-900
                  "
                    rows={3}
                    placeholder={t("reviews.messagePlaceholder")}
                  />

                  <div className="flex items-center gap-3">
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      aria-label={t("reviews.addImage")}
                      className="max-w-[70%]"
                    />
                    {rv.image && (
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={clearImage}
                          onChange={(e) => setClearImage(e.target.checked)}
                        />
                        {t("reviews.removeCurrentImage")}
                      </label>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => save(rv.id)}
                      className="
                      px-3 py-1 rounded
                      bg-backnewswhite text-white
                      hover:opacity-90
                      disabled:opacity-60
                      dark:bg-backnewsdark
                    "
                      disabled={saving}
                    >
                      {saving ? t("reviews.saving") : t("reviews.save")}
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="
                      px-3 py-1 border rounded
                      border-gray-300 dark:border-neutral-700
                    "
                    >
                      {t("reviews.cancel")}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mt-2" aria-label={t("reviews.ratingAria")}>
                    {Array.from({ length: rv.rating }).map((_, i) => (
                      <span key={i}>★</span>
                    ))}
                  </div>
                  <p className="mt-2 whitespace-pre-line">{rv.message}</p>
                  {rv.image ? (
                    <img
                      src={rv.image}
                      alt=""
                      className="mt-2 w-40 rounded border border-gray-200 dark:border-neutral-700"
                      fetchPriority="high"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : null}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
