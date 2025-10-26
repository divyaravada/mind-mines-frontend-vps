// src/pages/ResetPasswordPage.jsx
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useResetPasswordConfirmMutation } from "../features/auth/authApi";

export default function ResetPasswordPage() {
  const { uidb64, token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [message, setMessage] = useState("");
  const [resetConfirm, { isLoading }] = useResetPasswordConfirmMutation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== password2) {
      setMessage("Passwords do not match.");
      return;
    }
    try {
      await resetConfirm({
        uid: uidb64,
        token,
        new_password1: password,
        new_password2: password2,
      }).unwrap();
      setMessage("Password reset successfully. Redirecting...");
      setTimeout(() => navigate("/users/login"), 3000);
    } catch (error) {
      setMessage("Invalid or expired link.");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-6 bg-white shadow rounded">
      <h2 className="text-xl font-bold mb-4">Reset Your Password</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="password"
          placeholder="New Password"
          className="w-full border px-3 py-2 rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Repeat New Password"
          className="w-full border px-3 py-2 rounded"
          value={password2}
          onChange={(e) => setPassword2(e.target.value)}
          required
        />
        <button
          type="submit"
          className="w-full py-2 bg-marbleblack text-white rounded disabled:opacity-60"
          disabled={isLoading}
        >
          Reset Password
        </button>
      </form>
      {message && <p className="mt-4 text-center">{message}</p>}
    </div>
  );
}
