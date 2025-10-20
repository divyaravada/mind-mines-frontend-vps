//src/components/OutOfStockNotify.jsx
import { useState } from "react";
import { useSelector } from "react-redux";
import { useSubscribeStockAlertMutation } from "../features/products/productsApi";

export default function OutOfStockNotify({ productId }) {
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
        We’ll email you as soon as this is back in stock.
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
        placeholder="your@email.com"
        className="border rounded px-3 py-2 text-sm flex-1 dark:bg-gray-800"
      />
      <button
        className="px-4 py-2 rounded bg-gray-900 text-white disabled:opacity-50"
        disabled={!email || isLoading}
      >
        Notify me
      </button>
      {isError && (
        <span className="text-xs text-red-600">
          {error?.data?.detail || "Couldn’t subscribe."}
        </span>
      )}
    </form>
  );
}
