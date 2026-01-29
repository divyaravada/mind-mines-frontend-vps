// src/App.jsx
import { useEffect, lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";

import CookieConsent from "./components/CookieConsent";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import RequireAuth from "./routes/RequireAuth";
import ScrollToTop from "./components/ScrollToTop";
import PromoBanner from "./components/PromoBanner";
import GoogleAnalyticsTracker from "./components/GoogleAnalyticsTracker";

// ✅ lazy pages
const Home = lazy(() => import("./pages/Home"));
const Products = lazy(() => import("./pages/Products"));
const ProductDetailPage = lazy(() => import("./pages/ProductDetailPage"));
const NaturalStonePage = lazy(() => import("./pages/NaturalStonePage"));
const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const CheckoutSuccess = lazy(() => import("./pages/CheckoutSuccess"));
const CheckoutReturn = lazy(() => import("./pages/CheckoutReturn"));
const GuestOrderLookup = lazy(() => import("./pages/GuestOrderLookup"));

const EmailVerificationPage = lazy(
  () => import("./pages/EmailVerificationPage"),
);
const ResendVerification = lazy(() => import("./pages/ResendVerification"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const Login = lazy(() => import("./pages/Login"));
const Logout = lazy(() => import("./pages/Logout"));

const ImprintPage = lazy(() => import("./pages/ImprintPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const PrivacyPolicyPage = lazy(() => import("./pages/PrivacyPolicyPage"));
const ReturnsPage = lazy(() => import("./pages/ReturnsPage"));
const ShippingPolicyPage = lazy(() => import("./pages/ShippingPolicyPage"));
const CookiePolicyPage = lazy(() => import("./pages/CookiePolicyPage"));
const AboutContactPage = lazy(() => import("./pages/AboutContactPage"));
const Unsubscribe = lazy(() => import("./routes/Unsubscribe"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

// account
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Profile = lazy(() => import("./components/Profile"));
const AccountAddresses = lazy(() => import("./components/Addresses"));
const Wishlist = lazy(() => import("./components/Wishlist"));
const Orders = lazy(() => import("./components/Orders"));
const Reviews = lazy(() => import("./components/Reviews"));

function LoadingScreen() {
  return (
    <div className="py-16 text-center text-gray-600 dark:text-gray-300">
      {/* Simple spinner */}
      <span className="inline-block h-6 w-6 rounded-full border-2 border-gray-400 border-t-transparent animate-spin mr-2" />
      Loading…
    </div>
  );
}

export default function App() {
  useEffect(() => {
    document.documentElement.setAttribute("data-gramm", "false");
    document.documentElement.setAttribute("data-gramm_editor", "false");
  }, []);

  return (
    <div className="font-open-sans flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <GoogleAnalyticsTracker />
      <PromoBanner />
      <Navbar />

      <div className="flex-1">
        <ScrollToTop />
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            {/* Auth & verification */}
            <Route
              path="/verify-email/:uidb64/:token"
              element={<EmailVerificationPage />}
            />
            <Route
              path="/resend-verification"
              element={<ResendVerification />}
            />
            <Route
              path="/reset-password/:uidb64/:token"
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
            <Route path="/products/:slug-:id" element={<ProductDetailPage />} />
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

            {/* 404 catch-all */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </div>

      <CookieConsent />
      <Footer />
    </div>
  );
}
