// src/components/ProductReviews.jsx
import { useRef, useState } from "react";
import avatar from "../assets/avatar.png";
import { useListProductReviewsQuery } from "../features/products/productsApi";
import {
  useUpdateReviewMutation,
  useDeleteReviewMutation,
} from "../features/reviews/reviewsApi";
import { useSelector } from "react-redux";
import { selectIsAuthenticated } from "../features/auth/authSlice";
import StarRating from "./StarRating";
import { useTranslation } from "react-i18next";

export default function ProductReviews({ productId }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language || "en";

  const isLoggedIn = useSelector(selectIsAuthenticated);
  const { data, isFetching, error } = useListProductReviewsQuery(productId);

  const items = data?.results ?? data ?? [];

  const [editingId, setEditingId] = useState(null);
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState("");
  const [clearImage, setClearImage] = useState(false);
  const fileRef = useRef(null);

  const [updateReview, { isLoading: saving }] = useUpdateReviewMutation();
  const [deleteReview, { isLoading: deleting }] = useDeleteReviewMutation();

  const startEdit = (rv) => {
    setEditingId(rv.id);
    setRating(rv.rating);
    setMessage(rv.message || "");
    setClearImage(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const save = async (id) => {
    const fd = new FormData();
    fd.append("rating", String(rating));
    fd.append("message", message);
    if (clearImage) fd.append("clear_image", "true");
    if (fileRef.current?.files?.[0])
      fd.append("image", fileRef.current.files[0]);
    await updateReview({ reviewId: id, form: fd }).unwrap();
    setEditingId(null);
  };

  const remove = async (id) => {
    await deleteReview(id).unwrap();
    if (editingId === id) setEditingId(null);
  };

  return (
    <div className="mt-12">
      <h3 className="text-xl font-semibold mb-4">
        {t("productReviews.title")}
      </h3>

      {!isLoggedIn && (
        <div className="text-sm text-gray-600 mb-6">
          {t("productReviews.loginPrompt")}
        </div>
      )}

      {isFetching && <div className="text-gray-500">{t("common.loading")}</div>}

      {error && !isFetching && (
        <div className="text-red-600">{t("productReviews.loadError")}</div>
      )}

      {!isFetching && !error && items.length === 0 ? (
        <div className="text-gray-500">{t("productReviews.none")}</div>
      ) : (
        <div className="space-y-4">
          {items.map((rv) => (
            <div key={rv.id} className="bg-white p-4 rounded border">
              <div className="flex items-start gap-3">
                <img
                  src={rv.author_avatar || avatar}
                  onError={(e) => (e.currentTarget.src = avatar)}
                  alt={t("productReviews.authorAvatarAlt")}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{rv.author_name}</div>
                    {rv.is_owner && (
                      <div className="flex gap-2">
                        {editingId !== rv.id && (
                          <button
                            onClick={() => startEdit(rv)}
                            className="text-xs px-2 py-1 border rounded"
                          >
                            {t("productReviews.edit")}
                          </button>
                        )}
                        <button
                          onClick={() => remove(rv.id)}
                          className="text-xs px-2 py-1 border rounded text-red-600 disabled:opacity-60"
                          disabled={deleting}
                        >
                          {t("productReviews.delete")}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-gray-500">
                    {new Date(rv.created_at).toLocaleString(locale)}
                  </div>

                  {editingId === rv.id ? (
                    <div className="mt-2 space-y-2">
                      <label className="sr-only" htmlFor={`rating-${rv.id}`}>
                        {t("productReviews.rating")}
                      </label>
                      <StarRating value={rating} onChange={setRating} />

                      <label className="sr-only" htmlFor={`msg-${rv.id}`}>
                        {t("productReviews.messageLabel")}
                      </label>
                      <textarea
                        id={`msg-${rv.id}`}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="w-full border rounded px-3 py-2"
                        rows={3}
                        placeholder={t("productReviews.messagePlaceholder")}
                      />
                      <div className="flex items-center gap-3">
                        <input
                          ref={fileRef}
                          type="file"
                          accept="image/*"
                          aria-label={t("productReviews.addImage")}
                        />
                        {rv.image && (
                          <label className="text-sm flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={clearImage}
                              onChange={(e) => setClearImage(e.target.checked)}
                            />
                            {t("productReviews.removeCurrentImage")}
                          </label>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => save(rv.id)}
                          className="px-3 py-1 bg-black text-white rounded disabled:opacity-60"
                          disabled={saving}
                        >
                          {saving
                            ? t("productReviews.saving")
                            : t("productReviews.save")}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1 border rounded"
                        >
                          {t("productReviews.cancel")}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div
                        className="mt-1"
                        aria-label={t("productReviews.rating")}
                      >
                        {Array.from({ length: rv.rating }).map((_, i) => (
                          <span key={i}>★</span>
                        ))}
                      </div>
                      <p className="mt-2 whitespace-pre-line">{rv.message}</p>
                      {rv.image ? (
                        <img
                          src={rv.image}
                          alt=""
                          className="mt-2 w-40 rounded"
                        />
                      ) : null}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
