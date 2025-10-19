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

        // success -> tokens saved via onQueryStarted
      }
    } catch (e) {
      console.error("Google login failed", e);
    }
  };

  return (
    <GoogleLogin
      onSuccess={handleGoogleLogin}
      onError={() => console.error("Google login failed")}
    />
  );
}
