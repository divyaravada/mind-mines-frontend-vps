// src/components/ForgotPasswordModal.jsx
import { useState } from "react";
import { useRequestPasswordResetMutation } from "../features/auth/authApi";

export default function ForgotPasswordModal({ open, onClose }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [send, { isLoading }] = useRequestPasswordResetMutation();

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await send({ email }).unwrap();
      setMessage("If that email exists, a reset link has been sent.");
    } catch {
      setMessage("Failed to send reset email.");
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-marbleblack p-6 rounded shadow-lg w-full max-w-md relative">
        <button className="absolute right-2 top-2 text-xl" onClick={onClose}>
          ×
        </button>
        <h2 className="text-xl font-bold mb-4">Forgot Password</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Enter your email"
            className="w-full border px-3 py-2 rounded"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button
            className="w-full py-2 bg-marbleblack text-white rounded"
            disabled={isLoading}
          >
            Send Reset Link
          </button>
        </form>
        {message && <p className="mt-4 text-center text-sm">{message}</p>}
      </div>
    </div>
  );
}
