// src/routes/RequireCheckoutAccess.jsx
import { useSelector } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";

export default function RequireCheckoutAccess({ children }) {
  const access = useSelector((s) => s.auth?.access);
  const hasUser = !!access;
  const hasGuest = !!localStorage.getItem("guest_auth_email"); // set on guest-login
  const loc = useLocation();

  if (hasUser || hasGuest) return children;

  const next = `${loc.pathname}${loc.search || ""}`;
  return (
    <Navigate to={`/users/login?next=${encodeURIComponent(next)}`} replace />
  );
}
