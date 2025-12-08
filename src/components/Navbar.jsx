// src/components/Navbar.jsx
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import {
  ShoppingCart,
  Globe,
  Sun,
  Moon,
  FileText,
  X,
  Menu,
  ChevronDown,
} from "lucide-react";
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
  const { pathname } = useLocation();
  const { t } = useTranslation();

  const user = useSelector((s) => s.auth.user);
  const darkMode = useSelector((s) => s.ui.darkMode);
  const mobileMenu = useSelector((s) => s.ui.mobileMenuOpen);

  const isAuthFlow =
    pathname.startsWith("/users/login") ||
    pathname.startsWith("/users/register") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/verify-email");

  const isLoggedIn = Boolean(user) && !isAuthFlow;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  useEffect(() => {
    if (mobileMenu) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => (document.body.style.overflow = prev);
    }
  }, [mobileMenu]);

  const handleLogout = () => {
    dispatch(logout());
    dispatch(setMobileMenuOpen(false));
    navigate("/logout");
  };

  const handleLogin = () => {
    dispatch(setMobileMenuOpen(false));
    navigate("/users/login");
  };

  const isActive = (to) => {
    if (!to) return false;
    if (to === "/") return pathname === "/";
    return pathname === to || pathname.startsWith(`${to}/`);
  };

  const shopActive =
    pathname.startsWith("/decorative-products") ||
    pathname.startsWith("/natural-stone");

  const navLinks = isLoggedIn
    ? [
        { key: "home", to: "/", label: t("navbar.home") },
        { key: "about", to: "/about", label: t("navbar.about") },
        { key: "account", to: "/account", label: t("navbar.myAccount") },
        {
          key: "cart",
          to: "/cart",
          label: t("navbar.cart"),
          icon: <ShoppingCart className="w-5 h-5 mr-1" />,
        },
        {
          key: "logout",
          label: t("navbar.logout"),
          isButton: true,
          onClick: handleLogout,
        },
      ]
    : [
        { key: "home", to: "/", label: t("navbar.home") },
        { key: "about", to: "/about", label: t("navbar.about") },
        {
          key: "cart",
          to: "/cart",
          label: t("navbar.cart"),
          icon: <ShoppingCart className="w-5 h-5 mr-1" />,
        },
        {
          key: "login",
          to: "/users/login",
          label: t("navbar.login"),
          isButton: true,
        },
      ];

  const baseLink =
    "flex items-center whitespace-nowrap text-sm lg:text-base transition-colors duration-200";
  const linkLight = "text-backnewswhite hover:text-backnewsdark";
  const linkDark = "dark:text-backnewsdark dark:hover:text-backnewswhite";
  const activeLight = "text-backnewsdark";
  const activeDark = "dark:text-white";

  return (
    <>
      {/* NAVBAR */}
      <nav className="bg-marblewhite/95 dark:bg-marbleblack/95 border-b border-black/5 dark:border-white/5 sticky top-0 z-40 backdrop-blur">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-20 px-4 md:px-8">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2">
            <img
              src={LightLogo}
              alt="MindMines"
              className="h-20 w-auto block dark:hidden"
              fetchPriority="high"
              loading="lazy"
              decoding="async"
            />
            <img
              src={DarkLogo}
              alt="MindMines"
              className="h-20 w-auto hidden dark:block"
              fetchPriority="high"
              loading="lazy"
              decoding="async"
            />
          </Link>

          {/* Desktop */}
          <div className="hidden md:flex items-center gap-4 lg:gap-6">
            {/* Left nav links (Home, About) */}
            {navLinks
              .filter((l) => l.key === "home" || l.key === "about")
              .map((link) =>
                link.isButton ? (
                  <button
                    key={link.key}
                    onClick={link.onClick || handleLogin}
                    className={`${baseLink} ${linkLight} ${linkDark}`}
                  >
                    {link.label}
                  </button>
                ) : (
                  <Link
                    key={link.key}
                    to={link.to ?? "#"}
                    className={`${baseLink} ${
                      isActive(link.to)
                        ? `${activeLight} ${activeDark} font-semibold`
                        : `${linkLight} ${linkDark}`
                    }`}
                  >
                    {link.icon}
                    {link.label}
                  </Link>
                )
              )}

            {/* SHOP DROPDOWN (Decor + Stone) */}
            <div className="relative group">
              <button
                className={`${baseLink} px-2 ${
                  shopActive
                    ? `${activeLight} ${activeDark} font-semibold`
                    : `${linkLight} ${linkDark}`
                }`}
              >
                <span>{t("navbar.shop")}</span>
                <ChevronDown className="w-4 h-4 ml-1 transition-transform group-hover:rotate-180" />
              </button>

              <div
                className="invisible opacity-0 group-hover:visible group-hover:opacity-100
                         transition-all duration-200
                         absolute left-0 mt-3 min-w-[230px]
                         bg-marblewhite/95 dark:bg-marbleblack/95
                         rounded-xl shadow-xl border border-black/5 dark:border-white/10
                         overflow-hidden"
              >
                <Link
                  to="/decorative-products"
                  className={`flex items-start px-4 py-3 text-sm lg:text-base whitespace-nowrap
                            ${
                              pathname.startsWith("/decorative-products")
                                ? "bg-black/5 dark:bg-white/10 font-semibold"
                                : "hover:bg-black/5 dark:hover:bg-white/10"
                            }
                            ${linkLight} ${linkDark}`}
                >
                  {t("navbar.decorativeProducts")}
                </Link>
                <Link
                  to="/natural-stone"
                  className={`flex items-start px-4 py-3 text-sm lg:text-base whitespace-nowrap
                            ${
                              pathname.startsWith("/natural-stone")
                                ? "bg-black/5 dark:bg-white/10 font-semibold"
                                : "hover:bg-black/5 dark:hover:bg-white/10"
                            }
                            ${linkLight} ${linkDark}`}
                >
                  {t("navbar.naturalStone")}
                </Link>
              </div>
            </div>

            {/* Right nav links (Account / Login, Cart, Logout) */}
            {navLinks
              .filter((l) => l.key !== "home" && l.key !== "about")
              .map((link) =>
                link.isButton ? (
                  <button
                    key={link.key}
                    onClick={link.onClick || handleLogin}
                    className={`${baseLink} ${linkLight} ${linkDark}`}
                  >
                    {link.label}
                  </button>
                ) : (
                  <Link
                    key={link.key}
                    to={link.to ?? "#"}
                    className={`${baseLink} ${
                      isActive(link.to)
                        ? `${activeLight} ${activeDark} font-semibold`
                        : `${linkLight} ${linkDark}`
                    }`}
                  >
                    {link.icon}
                    {link.label}
                  </Link>
                )
              )}

            {/* Search */}
            <div className="relative max-w-xs xl:max-w-sm">
              <ProductSearch t={t} />
            </div>

            {/* Language */}
            <LangSwitcher />

            {/* Dark mode */}
            <button
              onClick={() => dispatch(toggleDarkMode())}
              className="ml-2 rounded p-1 transition hover:bg-black/5 dark:hover:bg-white/10"
              aria-label={t("navbar.toggleDarkMode")}
            >
              {darkMode ? (
                <Sun className="w-5 h-5 text-backnewswhite dark:text-backnewsdark" />
              ) : (
                <Moon className="w-5 h-5 text-backnewswhite dark:text-backnewsdark" />
              )}
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden px-4 py-2 text-backnewswhite dark:text-backnewsdark"
            aria-label={t("navbar.openMenu")}
            onClick={() => dispatch(setMobileMenuOpen(true))}
          >
            <Menu className="w-12 h-12" />
          </button>
        </div>
      </nav>

      {/* MOBILE PANEL – rendered OUTSIDE the nav, full-screen overlay */}
      {mobileMenu && (
        <div className="fixed inset-0 z-[999] md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => dispatch(setMobileMenuOpen(false))}
          />
          <aside
            role="dialog"
            aria-modal="true"
            className="absolute right-0 top-0 h-full w-80 max-w-[90vw]
                 bg-marblewhite dark:bg-marbleblack
                 text-backnewswhite dark:text-backnewsdark
                 shadow-2xl translate-x-0 transition-transform
                 flex flex-col"
          >
            {/* Sticky header */}
            <div
              className="flex items-center justify-between p-4 border-b
                      border-black/5 dark:border-white/10
                      sticky top-0 bg-marblewhite dark:bg-marbleblack z-10"
            >
              <div className="font-semibold text-lg">Menu</div>
              <button
                onClick={() => dispatch(setMobileMenuOpen(false))}
                className="p-2 rounded hover:bg-black/5 dark:hover:bg-white/10"
                aria-label="Close"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Scrollable area */}
            <div className="flex-1 overflow-y-auto px-4 pb-6">
              {/* main nav */}
              <nav className="flex flex-col">
                <Link
                  to="/"
                  onClick={() => dispatch(setMobileMenuOpen(false))}
                  className={`py-3 border-b border-black/5 dark:border-white/10 ${
                    isActive("/") ? "text-backnewsdark font-semibold" : ""
                  }`}
                >
                  {t("navbar.home")}
                </Link>
                <Link
                  to="/about"
                  onClick={() => dispatch(setMobileMenuOpen(false))}
                  className={`py-3 border-b border-black/5 dark:border-white/10 ${
                    isActive("/about") ? "text-backnewsdark font-semibold" : ""
                  }`}
                >
                  {t("navbar.about")}
                </Link>

                {/* Shop section on mobile */}
                <div className="mt-2 mb-1 text-xs font-semibold uppercase tracking-wide text-backnewswhite/70 dark:text-backnewsdark/70">
                  {t("navbar.shop")}
                </div>
                <Link
                  to="/decorative-products"
                  onClick={() => dispatch(setMobileMenuOpen(false))}
                  className={`py-3 border-b border-black/5 dark:border-white/10 ${
                    isActive("/decorative-products")
                      ? "text-backnewsdark font-semibold"
                      : ""
                  }`}
                >
                  {t("navbar.decorativeProducts")}
                </Link>
                <Link
                  to="/natural-stone"
                  onClick={() => dispatch(setMobileMenuOpen(false))}
                  className={`py-3 border-b border-black/5 dark:border-white/10 ${
                    isActive("/natural-stone")
                      ? "text-backnewsdark font-semibold"
                      : ""
                  }`}
                >
                  {t("navbar.naturalStone")}
                </Link>

                {isLoggedIn ? (
                  <>
                    <Link
                      to="/account"
                      onClick={() => dispatch(setMobileMenuOpen(false))}
                      className={`py-3 border-b border-black/5 dark:border-white/10 ${
                        isActive("/account")
                          ? "text-backnewsdark font-semibold"
                          : ""
                      }`}
                    >
                      {t("navbar.myAccount")}
                    </Link>
                    <Link
                      to="/cart"
                      onClick={() => dispatch(setMobileMenuOpen(false))}
                      className={`py-3 border-b border-black/5 dark:border-white/10 flex items-center gap-2 ${
                        isActive("/cart")
                          ? "text-backnewsdark font-semibold"
                          : ""
                      }`}
                    >
                      <ShoppingCart className="w-5 h-5" /> {t("navbar.cart")}
                    </Link>
                    <button onClick={handleLogout} className="py-3 text-left">
                      {t("navbar.logout")}
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/cart"
                      onClick={() => dispatch(setMobileMenuOpen(false))}
                      className={`py-3 border-b border-black/5 dark:border-white/10 flex items-center gap-2 ${
                        isActive("/cart")
                          ? "text-backnewsdark font-semibold"
                          : ""
                      }`}
                    >
                      <ShoppingCart className="w-5 h-5" /> {t("navbar.cart")}
                    </Link>
                    <button onClick={handleLogin} className="py-3 text-left">
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
                    className="py-2 border-b border-black/5 dark:border-white/10"
                  >
                    {t("navbar.privacy")}
                  </Link>
                  <Link
                    to="/imprint"
                    onClick={() => dispatch(setMobileMenuOpen(false))}
                    className="py-2 border-b border-black/5 dark:border-white/10"
                  >
                    {t("navbar.imprint")}
                  </Link>
                  <Link
                    to="/terms"
                    onClick={() => dispatch(setMobileMenuOpen(false))}
                    className="py-2 border-b border-black/5 dark:border-white/10"
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
                  <span>{t("navbar.languageHeading")}</span>
                </div>
                <LangButtons compact />
              </div>

              {/* theme */}
              <div className="mt-6">
                <div className="text-sm font-semibold mb-2">
                  {t("navbar.themeHeading")}
                </div>
                <button
                  onClick={() => dispatch(toggleDarkMode())}
                  className="flex items-center gap-2 px-3 py-2 rounded border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10"
                >
                  {darkMode ? (
                    <Sun className="w-5 h-5" />
                  ) : (
                    <Moon className="w-5 h-5" />
                  )}
                  <span>
                    {darkMode ? t("navbar.themeLight") : t("navbar.themeDark")}
                  </span>
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
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
        aria-label={t("navbar.changeLanguage")}
        className="relative ml-1"
      >
        <Globe className="w-5 h-5 text-backnewswhite hover:text-backnewsdark dark:text-backnewsdark dark:hover:text-backnewswhite" />
      </button>
      {langMenuOpen && (
        <div className="absolute right-0 mt-2 w-36 bg-marblewhite dark:bg-marbleblack text-backnewswhite dark:text-backnewsdark rounded shadow-lg z-50 border border-black/5 dark:border-white/10">
          {[
            { code: "en", label: t("english") },
            { code: "de", label: t("german") },
          ].map((opt) => (
            <button
              key={opt.code}
              onClick={() => {
                dispatch(setLanguage(opt.code));
                dispatch(setLangMenuOpen(false));
              }}
              className={`block w-full px-4 py-2 text-left whitespace-nowrap hover:bg-black/5 dark:hover:bg:white/10 ${
                current === opt.code ? "font-bold" : ""
              }`}
            >
              {opt.label}
            </button>
          ))}
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
    <div className="flex gap-2 flex-wrap">
      {[
        { code: "en", label: compact ? t("languages.short.en") : t("english") },
        { code: "de", label: compact ? t("languages.short.de") : t("german") },
      ].map((opt) => (
        <button
          key={opt.code}
          onClick={() => dispatch(setLanguage(opt.code))}
          className={`px-3 py-2 rounded border border-black/10 dark:border-white/10 whitespace-nowrap text-sm lg:text-base ${
            current === opt.code
              ? "bg-marbleblack text-white dark:bg-marblewhite dark:text-marbleblack"
              : "hover:bg-black/5 dark:hover:bg-white/10"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
