// src/pages/ResendVerification.jsx
import { useState } from "react";
import { useResendVerificationMutation } from "../features/auth/authApi";

export default function ResendVerification() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [resend, { isLoading }] = useResendVerificationMutation();

  const handleResend = async (e) => {
    e.preventDefault();
    setMsg("");
    setError("");
    try {
      const res = await resend({ email }).unwrap();
      setMsg(res?.detail || "Verification email sent if the address exists.");
    } catch (err) {
      setError(err?.data?.detail || "Failed to resend email.");
    }
  };

  return (
    <div className="max-w-md mx-auto my-10 p-6 bg-white shadow-md rounded">
      <h2 className="text-2xl font-bold mb-4 text-center">
        Resend Verification Email
      </h2>
      <form onSubmit={handleResend} className="space-y-4">
        <input
          type="email"
          placeholder="Enter your email"
          className="w-full border px-3 py-2 rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button
          className="w-full py-2 bg-marbleblack text-white rounded disabled:opacity-60"
          disabled={isLoading}
        >
          Resend Email
        </button>
        {msg && <p className="text-green-600">{msg}</p>}
        {error && <p className="text-red-600">{error}</p>}
      </form>
    </div>
  );
}
