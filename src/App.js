// src/App.jsx
import { Routes, Route } from "react-router-dom";

import EmailVerificationPage from "./pages/EmailVerificationPage";
import ResendVerification from "./pages/ResendVerification";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import SignupWithGoogle from "./pages/SignupWithGoogle";
import Login from "./pages/Login";
import Logout from "./pages/Logout";
import Home from "./pages/Home";
import About from "./pages/About";
import Products from "./pages/Products";
import ProductDetailPage from "./pages/ProductDetailPage";
import NaturalStonePage from "./pages/NaturalStonePage";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import PrivacyPage from "./pages/PrivacyPage";
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

export default function App() {
  return (
    <div className="font-open-sans flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <Navbar />
      <PromoBanner />
      <div className="flex-1">
        <ScrollToTop />
        <Routes>
          {/* Auth & verification */}
          <Route
            path="/verify-email/:uidb64/:token"
            element={<EmailVerificationPage />}
          />
          <Route path="/resend-verification" element={<ResendVerification />} />
          <Route path="/reset-password" element={<ForgotPasswordPage />} />
          <Route
            path="/reset-password/:uid/:token/"
            element={<ResetPasswordPage />}
          />
          <Route path="/signup-with-google" element={<SignupWithGoogle />} />
          <Route path="/users/login" element={<Login />} />
          <Route path="/logout" element={<Logout />} />

          {/* Public pages */}
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/decorative-products" element={<Products />} />
          <Route
            path="/decorative-products/category/:categoryId"
            element={<Products />}
          />
          <Route
            path="/decorative-products/:id"
            element={<ProductDetailPage />}
          />
          <Route path="/natural-stone" element={<NaturalStonePage />} />
          <Route path="/cart" element={<Cart />} />
          <Route
            path="/checkout"
            element={
              <RequireAuth>
                <Checkout />
              </RequireAuth>
            }
          />
          <Route path="/checkout/success" element={<CheckoutSuccess />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/imprint" element={<ImprintPage />} />
          <Route path="/terms" element={<TermsPage />} />

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
