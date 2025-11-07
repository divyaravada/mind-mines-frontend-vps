// src/pages/EmailVerificationPage.jsx
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useVerifyEmailQuery } from "../features/auth/authApi";

export default function EmailVerificationPage() {
  const { uidb64, token } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
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
      const timeoutId = setTimeout(() => navigate("/users/login"), 4000);
      return () => clearTimeout(timeoutId);
    }
  }, [skip, isFetching, isError, navigate]);

  return (
    <div className="text-center mt-20">
      {status === "verifying" && (
        <p>{t("auth.emailVerification.verifying")}</p>
      )}
      {status === "success" && (
        <p>{t("auth.emailVerification.success")}</p>
      )}
      {status === "error" && (
        <p>{t("auth.emailVerification.error")}</p>
      )}
    </div>
  );
}
