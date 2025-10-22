// src/routes/Unsubscribe.jsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useUnsubscribeStockAlertMutation } from "../features/alerts/alertsApi";

export default function Unsubscribe() {
  const { token } = useParams();
  const [unsubscribe, { isLoading }] = useUnsubscribeStockAlertMutation();
  const [state, setState] = useState({ ok: null, msg: "Working..." });

  useEffect(() => {
    let mounted = true;
    async function run() {
      try {
        const res = await unsubscribe(token).unwrap();
        if (!mounted) return;
        setState({
          ok: true,
          msg: res?.unsubscribed
            ? "You have been unsubscribed from stock alerts."
            : "Your subscription is now inactive.",
        });
      } catch (e) {
        if (!mounted) return;
        setState({
          ok: false,
          msg:
            e?.data?.detail ||
            "We couldn't process your request. The link may be invalid or already used.",
        });
      }
    }
    if (token) run();
    return () => {
      mounted = false;
    };
  }, [token, unsubscribe]);

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-semibold mb-4">Unsubscribe</h1>
      <div
        className={`p-4 rounded border ${
          state.ok === null
            ? "border-gray-300"
            : state.ok
            ? "border-green-400 bg-green-50"
            : "border-red-400 bg-red-50"
        }`}
      >
        {isLoading ? "Processing…" : state.msg}
      </div>
      <p className="mt-6 text-sm text-gray-500">
        If this wasn’t intended, you can re-subscribe from any product page by
        entering your email in “Notify me when in stock.”
      </p>
    </div>
  );
}
