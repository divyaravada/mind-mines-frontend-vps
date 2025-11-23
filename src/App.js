// src/App.jsx
import EmailVerificationPage from "./pages/EmailVerificationPage";
import ResendVerification from "./pages/ResendVerification";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import Login from "./pages/Login";
import Logout from "./pages/Logout";
import Home from "./pages/Home";
import Products from "./pages/Products";
import ProductDetailPage from "./pages/ProductDetailPage";
import NaturalStonePage from "./pages/NaturalStonePage";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import ImprintPage from "./pages/ImprintPage";
import TermsPage from "./pages/TermsPage";
import Dashboard from "./pages/Dashboard";
import Profile from "./components/Profile";

import Wishlist from "./components/Wishlist";
import Orders from "./components/Orders";
import Reviews from "./components/Reviews";
import CookieConsent from "./components/CookieConsent";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import AccountAddresses from "./components/Addresses";
import RequireAuth from "./routes/RequireAuth";
import ScrollToTop from "./components/ScrollToTop";
import PromoBanner from "./components/PromoBanner";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import ReturnsPage from "./pages/ReturnsPage";
import ShippingPolicyPage from "./pages/ShippingPolicyPage";
import AboutContactPage from "./pages/AboutContactPage";
import { useEffect } from "react";
import Unsubscribe from "./routes/Unsubscribe";
import CheckoutReturn from "./pages/CheckoutReturn";
import GuestOrderLookup from "./pages/GuestOrderLookup";
import { Route, Routes } from "react-router-dom";
import CookiePolicyPage from "./pages/CookiePolicyPage";

export default function App() {
  useEffect(() => {
    document.documentElement.setAttribute("data-gramm", "false");
    document.documentElement.setAttribute("data-gramm_editor", "false");
  }, []);
  return (
    <div className="font-open-sans flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <PromoBanner />
      <Navbar />

      <div className="flex-1">
        <ScrollToTop />
        <Routes>
          {/* Auth & verification */}
          <Route
            path="/verify-email/:uidb64/:token"
            element={<EmailVerificationPage />}
          />
          <Route path="/resend-verification" element={<ResendVerification />} />

          <Route
            path="/reset-password/:uid64/:token/"
            element={<ResetPasswordPage />}
          />

          <Route path="/users/login" element={<Login />} />
          <Route path="/logout" element={<Logout />} />
          <Route path="/guest-order" element={<GuestOrderLookup />} />
          {/* Public pages */}
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<AboutContactPage />} />
          <Route path="/decorative-products" element={<Products />} />
          <Route
            path="/decorative-products/category/:categoryId"
            element={<Products />}
          />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/natural-stone" element={<NaturalStonePage />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/checkout/success" element={<CheckoutSuccess />} />
          <Route path="/checkout/return" element={<CheckoutReturn />} />
          <Route path="/imprint" element={<ImprintPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/returns" element={<ReturnsPage />} />
          <Route path="/shipping" element={<ShippingPolicyPage />} />
          <Route path="/cookies" element={<CookiePolicyPage />} />
          <Route path="/unsubscribe/:token" element={<Unsubscribe />} />

          {/* Account (protected) */}
          <Route
            path="/account"
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          />
          <Route
            path="account/profile"
            element={
              <RequireAuth>
                <Profile />
              </RequireAuth>
            }
          />
          <Route
            path="account/addresses"
            element={
              <RequireAuth>
                <AccountAddresses />
              </RequireAuth>
            }
          />
          <Route
            path="account/wishlist"
            element={
              <RequireAuth>
                <Wishlist />
              </RequireAuth>
            }
          />
          <Route
            path="account/orders"
            element={
              <RequireAuth>
                <Orders />
              </RequireAuth>
            }
          />
          <Route
            path="account/reviews"
            element={
              <RequireAuth>
                <Reviews />
              </RequireAuth>
            }
          />
        </Routes>
      </div>
      <CookieConsent />

      <Footer />
    </div>
  );
}
