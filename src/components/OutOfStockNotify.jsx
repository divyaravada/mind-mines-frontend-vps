import { useTranslation } from "react-i18next";
//src/components/OutOfStockNotify.jsx
import { useState } from "react";
import { useSelector } from "react-redux";
import { useSubscribeStockAlertMutation } from "../features/products/productsApi";

export default function OutOfStockNotify({ productId }) {
  const { t } = useTranslation();
  const userEmail = useSelector((s) => s?.auth?.user?.email);
  const [email, setEmail] = useState(userEmail || "");
  const [send, { isLoading, isSuccess, isError, error }] =
    useSubscribeStockAlertMutation();

  const submit = async (e) => {
    e.preventDefault();
    if (!email) return;
    await send({ product: productId, email }).unwrap();
  };

  if (isSuccess) {
    return (
      <div className="mt-2 text-sm rounded bg-green-100 text-green-800 p-2">
        {t("stockNotify.success")}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-2 flex gap-2 items-center">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t("stockNotify.placeholder")}
        className="border border-gray-300 dark:border-gray-700 rounded px-3 py-2 text-sm flex-1 bg-white dark:bg-gray-800"
      />
      <button
        className="px-4 py-2 rounded bg-backnewswhite text-white disabled:opacity-50
            dark:bg-backnewsdark dark:text-marbleblack"
        disabled={!email || isLoading}
      >
        {isLoading ? t("stockNotify.sending") : t("stockNotify.submit")}
      </button>
      {isError && (
        <span className="text-xs text-red-600">
          {error?.data?.detail || t("stockNotify.error")}
        </span>
      )}
    </form>
  );
}
