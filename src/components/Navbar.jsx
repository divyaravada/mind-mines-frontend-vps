// src/components/Navbar.jsx
import { Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { ShoppingCart, Globe, Sun, Moon, FileText, X } from "lucide-react";
import DarkLogo from "../assets/BlackLogo.jpg";
import LightLogo from "../assets/OrangeLogo.jpg";
import { useTranslation } from "react-i18next";
import { useSelector, useDispatch } from "react-redux";
import {
  toggleDarkMode,
  setLangMenuOpen,
  setMobileMenuOpen,
} from "../features/ui/uiSlice";
import { logout } from "../features/auth/authSlice";
import ProductSearch from "./ProductSearch";

export default function Navbar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const user = useSelector((s) => s.auth.user);
  const darkMode = useSelector((s) => s.ui.darkMode);
  const mobileMenu = useSelector((s) => s.ui.mobileMenuOpen);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  const handleLogout = () => {
    dispatch(logout());
    dispatch(setMobileMenuOpen(false));
    navigate("/logout");
  };

  const handleLogin = () => {
    dispatch(setMobileMenuOpen(false));
    navigate("/users/login");
  };

  const navLinks = user
    ? [
        { to: "/", label: t("navbar.home") },
        { to: "/about", label: t("navbar.about") },
        { to: "/decorative-products", label: t("navbar.decorativeProducts") },
        { to: "/natural-stone", label: t("navbar.naturalStone") },
        { to: "/account", label: t("navbar.myAccount") },
        {
          to: "/cart",
          label: t("navbar.cart"),
          icon: <ShoppingCart className="w-5 h-5 mr-1" />,
        },
        { label: t("navbar.logout"), isButton: true, onClick: handleLogout },
      ]
    : [
        { to: "/", label: t("navbar.home") },
        { to: "/about", label: t("navbar.about") },
        { to: "/decorative-products", label: t("navbar.decorativeProducts") },
        { to: "/natural-stone", label: t("navbar.naturalStone") },
        {
          to: "/cart",
          label: t("navbar.cart"),
          icon: <ShoppingCart className="w-5 h-5 mr-1" />,
        },
        { to: "/users/login", label: t("navbar.login"), isButton: true },
      ];

  return (
    <nav className="bg-marblewhite dark:bg-marbleblack text-lg shadow sticky top-0 z-50 transition">
      <div className="max-w-7xl mx-auto flex items-center justify-between h-24 px-4 md:px-8">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2">
          <img
            src={LightLogo}
            alt="MindMines"
            className="h-24 w-auto block dark:hidden"
          />
          <img
            src={DarkLogo}
            alt="MindMines"
            className="h-20 w-auto hidden dark:block"
          />
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-4">
          {navLinks.map((link, i) =>
            link.isButton ? (
              <button
                key={i}
                onClick={link.onClick || handleLogin}
                className="hover:text-backnewsdark text-backnewswhite dark:text-backnewsdark"
              >
                {link.label}
              </button>
            ) : (
              <Link
                key={i}
                to={link.to ?? "#"}
                className="hover:text-backnewsdark text-backnewswhite dark:text-backnewsdark flex items-center"
              >
                {link.icon}
                {link.label}
              </Link>
            )
          )}

          {/* Search */}
          <div className="relative">
            <ProductSearch t={t} />
          </div>

          {/* Language */}
          <LangSwitcher />

          {/* Dark mode */}
          <button
            onClick={() => dispatch(toggleDarkMode())}
            className="ml-2 rounded p-1 transition hover:bg-gray-200 dark:hover:bg-gray-800"
            aria-label="Toggle Dark Mode"
          >
            {darkMode ? (
              <Sun className="w-5 h-5 text-backnewswhite dark:text-backnewsdark" />
            ) : (
              <Moon className="w-5 h-5 text-backnewswhite dark:text-backnewsdark" />
            )}
          </button>
        </div>

        {/* MOBILE PANEL */}
        {mobileMenu && (
          <div className="md:hidden fixed inset-0 z-40">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => dispatch(setMobileMenuOpen(false))}
            />
            <div className="absolute right-0 top-0 h-full w-80 max-w-[90vw] bg-white text-backnewswhite dark:text-backnewsdark dark:bg-gray-900 p-4 shadow-lg translate-x-0 transition-transform">
              {/* header */}
              <div className="flex items-center justify-between mb-4">
                <div className="font-semibold text-lg">Menu</div>
                <button
                  onClick={() => dispatch(setMobileMenuOpen(false))}
                  className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                  aria-label="Close"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* main nav */}
              <nav className="flex flex-col gap-2">
                <Link
                  to="/"
                  onClick={() => dispatch(setMobileMenuOpen(false))}
                  className="py-2 border-b"
                >
                  {t("navbar.home")}
                </Link>
                <Link
                  to="/about"
                  onClick={() => dispatch(setMobileMenuOpen(false))}
                  className="py-2 border-b"
                >
                  {t("navbar.about")}
                </Link>
                <Link
                  to="/decorative-products"
                  onClick={() => dispatch(setMobileMenuOpen(false))}
                  className="py-2 border-b"
                >
                  {t("navbar.decorativeProducts")}
                </Link>
                <Link
                  to="/natural-stone"
                  onClick={() => dispatch(setMobileMenuOpen(false))}
                  className="py-2 border-b"
                >
                  {t("navbar.naturalStone")}
                </Link>

                {user ? (
                  <>
                    <Link
                      to="/account"
                      onClick={() => dispatch(setMobileMenuOpen(false))}
                      className="py-2 border-b"
                    >
                      {t("navbar.myAccount")}
                    </Link>
                    <Link
                      to="/cart"
                      onClick={() => dispatch(setMobileMenuOpen(false))}
                      className="py-2 border-b flex items-center gap-2"
                    >
                      <ShoppingCart className="w-5 h-5" /> {t("navbar.cart")}
                    </Link>
                    <button onClick={handleLogout} className="py-2 text-left">
                      {t("navbar.logout")}
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/cart"
                      onClick={() => dispatch(setMobileMenuOpen(false))}
                      className="py-2 border-b flex items-center gap-2"
                    >
                      <ShoppingCart className="w-5 h-5" /> {t("navbar.cart")}
                    </Link>
                    <button onClick={handleLogin} className="py-2 text-left">
                      {t("navbar.login")}
                    </button>
                  </>
                )}
              </nav>

              {/* legal */}
              <div className="mt-6">
                <div className="flex items-center gap-2 text-sm font-semibold mb-2">
                  <FileText className="w-4 h-4" />
                  <span>{t("navbar.legal")}</span>
                </div>
                <div className="flex flex-col">
                  <Link
                    to="/privacy"
                    onClick={() => dispatch(setMobileMenuOpen(false))}
                    className="py-2 border-b"
                  >
                    {t("navbar.privacy")}
                  </Link>
                  <Link
                    to="/imprint"
                    onClick={() => dispatch(setMobileMenuOpen(false))}
                    className="py-2 border-b"
                  >
                    {t("navbar.imprint")}
                  </Link>
                  <Link
                    to="/terms"
                    onClick={() => dispatch(setMobileMenuOpen(false))}
                    className="py-2 border-b"
                  >
                    {t("navbar.terms")}
                  </Link>
                  <button
                    onClick={() => {
                      window?.openCookieManager?.();
                      dispatch(setMobileMenuOpen(false));
                    }}
                    className="py-2 text-left"
                  >
                    {t("cookies.manage")}
                  </button>
                </div>
              </div>

              {/* language */}
              <div className="mt-6">
                <div className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  <span>Language</span>
                </div>
                <LangButtons compact />
              </div>

              {/* theme */}
              <div className="mt-6">
                <div className="text-sm font-semibold mb-2">Theme</div>
                <button
                  onClick={() => dispatch(toggleDarkMode())}
                  className="flex items-center gap-2 px-3 py-2 rounded border hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  {darkMode ? (
                    <Sun className="w-5 h-5" />
                  ) : (
                    <Moon className="w-5 h-5" />
                  )}
                  <span>{darkMode ? "Light" : "Dark"}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile hamburger */}
        <button
          className="md:hidden px-4 py-2  dark:text-backnewsdark"
          aria-label="Open Menu"
          onClick={() => dispatch(setMobileMenuOpen(true))}
        >
          ☰
        </button>
      </div>
    </nav>
  );
}

function LangSwitcher() {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const langMenuOpen = useSelector((s) => s.ui.langMenuOpen);
  const current = useSelector((s) => s.i18n.lang);
  const { setLanguage } = require("../features/i18n/i18nSlice");

  return (
    <div className="relative">
      <button
        onClick={() => dispatch(setLangMenuOpen(!langMenuOpen))}
        aria-label="Change Language"
        className="relative ml-2"
      >
        <Globe className="w-5 h-5 hover:text-backnewsdark text-backnewswhite dark:text-backnewsdark" />
      </button>
      {langMenuOpen && (
        <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-gray-800 text-backnewswhite dark:text-backnewsdark rounded shadow-lg z-50">
          <button
            onClick={() => {
              dispatch(setLanguage("en"));
              dispatch(setLangMenuOpen(false));
            }}
            className={`block w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 ${
              current === "en" ? "font-bold" : ""
            }`}
          >
            {t("english")}
          </button>
          <button
            onClick={() => {
              dispatch(setLanguage("de"));
              dispatch(setLangMenuOpen(false));
            }}
            className={`block w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 ${
              current === "de" ? "font-bold" : ""
            }`}
          >
            {t("german")}
          </button>
        </div>
      )}
    </div>
  );
}

function LangButtons({ compact = false }) {
  const dispatch = useDispatch();
  const current = useSelector((s) => s.i18n.lang);
  const { t } = useTranslation();
  const { setLanguage } = require("../features/i18n/i18nSlice");

  return (
    <div className="flex gap-2">
      <button
        onClick={() => dispatch(setLanguage("en"))}
        className={`px-3 py-2 rounded border ${
          current === "en"
            ? "bg-gray-900 text-white border-gray-900"
            : "hover:bg-gray-50"
        }`}
      >
        {compact ? "EN" : t("english")}
      </button>
      <button
        onClick={() => dispatch(setLanguage("de"))}
        className={`px-3 py-2 rounded border ${
          current === "de"
            ? "bg-gray-900 text-white border-gray-900"
            : "hover:bg-gray-50"
        }`}
      >
        {compact ? "DE" : t("german")}
      </button>
    </div>
  );
}
