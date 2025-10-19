// src/pages/EmailVerificationPage.jsx
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useVerifyEmailQuery } from "../features/auth/authApi";

export default function EmailVerificationPage() {
  const { uidb64, token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("verifying"); // "verifying" | "success" | "error"

  // Call only when uidb64 & token exist
  const skip = !(uidb64 && token);
  const { isFetching, isError } = useVerifyEmailQuery(
    { uidb64, token },
    { skip }
  );

  useEffect(() => {
    if (skip) return;
    if (isFetching) setStatus("verifying");
    else if (isError) setStatus("error");
    else {
      setStatus("success");
      const t = setTimeout(() => navigate("/users/login"), 4000);
      return () => clearTimeout(t);
    }
  }, [skip, isFetching, isError, navigate]);

  return (
    <div className="text-center mt-20">
      {status === "verifying" && <p>Verifying your email...</p>}
      {status === "success" && <p>Email verified! Redirecting to login...</p>}
      {status === "error" && (
        <p>Link is invalid or expired. Please register again.</p>
      )}
    </div>
  );
}
