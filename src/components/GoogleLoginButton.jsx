// src/components/GoogleLoginButton.jsx
import { GoogleLogin } from "@react-oauth/google";
import { useGoogleAuthMutation } from "../features/auth/authApi";
import { useNavigate } from "react-router-dom";

export default function GoogleLoginButton({ successRedirect = "/" }) {
  const [googleAuth] = useGoogleAuthMutation();
  const navigate = useNavigate?.() || (() => {});

  const handleGoogleLogin = async (response) => {
    try {
      if (response?.credential) {
        await googleAuth({ token: response.credential }).unwrap();
        navigate(successRedirect, { replace: true });
      }
    } catch (e) {
      console.error("Google login failed", e);
    }
  };

  // Google renders its own button; we just ensure spacing matches the brand system.
  return (
    <div className="inline-flex rounded-lg p-1 bg-marblewhite dark:bg-marbleblack">
      <GoogleLogin
        onSuccess={handleGoogleLogin}
        onError={() => console.error("Google login failed")}
      />
    </div>
  );
}
