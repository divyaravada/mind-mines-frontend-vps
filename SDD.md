# Software Design Document (SDD) — MindMines Frontend

## 1. Purpose & Scope
The MindMines frontend is a React single-page application (SPA) that delivers the e-commerce experience for marble and natural stone products, including browsing, cart/checkout, account management, and legal/marketing pages. The application is structured around React Router routes, Redux Toolkit state management, and RTK Query for API access to the MindMines backend. The scope of this document is the entire frontend codebase including configuration, UI components, pages, state, services, and build tooling. 【F:src/App.js†L1-L162】【F:src/index.js†L1-L19】【F:src/app/store.js†L1-L23】

## 2. High-Level Architecture
### 2.1 Application Shell
- Entry point renders the React app into `#root`, wrapping the app with Google OAuth, Redux Provider, HelmetProvider, and BrowserRouter. 【F:src/index.js†L1-L19】
- The app shell composes global UI (promo banner, navbar, footer, cookie consent) and configures route-based lazy loading with a Suspense fallback. 【F:src/App.js†L1-L162】
- Global scroll handling on route changes is handled by `ScrollToTop`. 【F:src/components/ScrollToTop.jsx†L1-L16】

### 2.2 Routing & Page Structure
Routes are defined in `App.js` with lazy-loaded pages for performance. Major route groups:
- Public: Home, About/Contact, Decorative Products, Natural Stone, Product Detail, Cart, Checkout, legal pages, cookie policy, etc. 【F:src/App.js†L41-L134】
- Auth flows: Login (with OTP), Logout, email verification, resend verification, password reset. 【F:src/App.js†L41-L84】【F:src/pages/Login.jsx†L1-L200】
- Account (protected): Dashboard, Profile, Addresses, Wishlist, Orders, Reviews. Protection uses `RequireAuth`. 【F:src/App.js†L89-L141】【F:src/routes/RequireAuth.jsx†L1-L25】
- Unsubscribe flow for stock alerts. 【F:src/App.js†L80-L87】【F:src/routes/Unsubscribe.jsx†L1-L66】

### 2.3 State Management
- Redux Toolkit is configured in `src/app/store.js` with slices for auth, UI, i18n, cart, cookies, and RTK Query API. 【F:src/app/store.js†L1-L23】
- RTK Query base API config handles access token injection and refresh token flow. 【F:src/services/apiSlice.js†L1-L104】
- Axios `http` instance provides a non-RTK-query HTTP client for direct requests, adding JWT access token if present. 【F:src/services/http.js†L1-L26】

### 2.4 Build & Tooling
- Project is a Create React App setup with `react-scripts` and Tailwind CSS configuration. 【F:package.json†L1-L49】【F:tailwind.config.js†L1-L23】
- Post-build sitemap generation uses `src/scripts/generate-sitemap.mjs`. 【F:package.json†L31-L36】【F:src/scripts/generate-sitemap.mjs†L1-L114】

## 3. Technology Stack
- **React** with React Router, Redux Toolkit, RTK Query, and Helmet for SEO metadata. 【F:package.json†L5-L29】【F:src/index.js†L1-L19】
- **Tailwind CSS** for styling. 【F:tailwind.config.js†L1-L23】【F:src/index.css†L1-L26】
- **Payments**: Stripe elements and PayPal buttons. 【F:package.json†L5-L13】【F:src/pages/Checkout.jsx†L1-L33】
- **i18n**: i18next with browser language detection and HTTP backend. 【F:src/i18n.js†L1-L33】
- **Analytics**: Google Analytics (gtag) and Google Tag Manager with user consent. 【F:public/index.html†L36-L96】【F:src/components/GoogleAnalyticsTracker.jsx†L1-L13】【F:src/features/cookies/cookieSlice.js†L1-L67】

## 4. Application Modules

### 4.1 Services Layer
- `config.js` defines the API base URL (env-based) and default headers. 【F:src/services/config.js†L1-L11】
- `apiSlice.js` configures RTK Query, including automatic token refresh on 401 responses. 【F:src/services/apiSlice.js†L1-L104】
- `http.js` is a dedicated Axios client used in components needing direct requests. 【F:src/services/http.js†L1-L26】

### 4.2 Feature APIs (RTK Query)
- **Auth**: OTP login start/verify, register, Google auth, password reset, resend verification, verify email, logout. 【F:src/features/auth/authApi.js†L1-L116】
- **Account**: get/update account, request deletion. 【F:src/features/account/accountApi.js†L1-L54】
- **Addresses**: CRUD and set default. 【F:src/features/addresses/addressApi.js†L1-L73】
- **Cart**: get/save cart with cart token support, server normalization. 【F:src/features/cart/cartApi.js†L1-L98】
- **Orders**: list, get, create, cancel, returns, payment status, public lookup. 【F:src/features/orders/ordersApi.js†L1-L67】
- **Products & Reviews**: list/detail, reviews, stock alerts, on-demand requests. 【F:src/features/products/productsApi.js†L1-L94】
- **Wishlist**: list, add, remove. 【F:src/features/wishlist/wishlistApi.js†L1-L52】
- **Promotions**: coupon preview, active promotions. 【F:src/features/promos/promosApi.js†L1-L53】
- **Payments**: Stripe intents, SEPA, installments, PayPal create/capture, redirect payments. 【F:src/features/payments/paymentsApi.js†L1-L70】
- **Marketing**: event tracking with allowed event normalization. 【F:src/features/marketing/marketingApi.js†L1-L75】
- **Newsletter**: newsletter subscription. 【F:src/features/newsletter/newsletterApi.js†L1-L18】
- **Alerts**: unsubscribe stock alerts. 【F:src/features/alerts/alertsApi.js†L1-L39】
- **Stones**: fetch natural stones and send enquiries. 【F:src/features/stones/stonesApi.js†L1-L37】
- **Contact**: contact form submission. 【F:src/features/contact/contactApi.js†L1-L23】

### 4.3 Redux Slices
- **Auth**: stores JWT access/refresh tokens, hydrates from local storage, handles logout. 【F:src/features/auth/authSlice.js†L1-L74】
- **Cart**: client cart persistence in local storage with throttled saves. 【F:src/features/cart/cartSlice.js†L1-L149】
- **UI**: dark mode and menu states. 【F:src/features/ui/uiSlice.js†L1-L71】
- **i18n**: language selection and persistence. 【F:src/features/i18n/i18nSlice.js†L1-L47】
- **Cookies**: consent initialization and persistence, GTM injection/removal. 【F:src/features/cookies/cookieSlice.js†L1-L67】

## 5. UI Components

### 5.1 Global Layout Components
- **Navbar**: responsive navigation, language/theme controls, search, auth-aware links. 【F:src/components/Navbar.jsx†L1-L200】
- **Footer**: legal links, newsletter, payment and shipping logos, locale switch. 【F:src/components/Footer.jsx†L1-L200】
- **PromoBanner**: promotional marquee with countdown and coupon CTA. 【F:src/components/PromoBanner.jsx†L1-L200】
- **CookieConsent**: manages privacy consent and exposes a global open method. 【F:src/components/CookieConsent.jsx†L1-L108】
- **GoogleAnalyticsTracker**: pageview tracking on navigation. 【F:src/components/GoogleAnalyticsTracker.jsx†L1-L13】

### 5.2 Commerce Components
- **ProductTile**: product card with price/discount logic and wishlist tracking. 【F:src/components/ProductTile.jsx†L1-L200】
- **ProductSearch**: navbar search with debounced suggestions. 【F:src/components/ProductSearch.jsx†L1-L200】
- **HomeCarousel**: hero carousel using Keen Slider and home category data. 【F:src/components/HomeCarousel.jsx†L1-L200】【F:src/data/homeCategories.js†L1-L72】
- **TopSellers**: homepage product grid with wishlist and cart actions. 【F:src/components/TopSellers.jsx†L1-L104】

### 5.3 Checkout & Payments Components
- Stripe card, SEPA, and installments components encapsulate payment element creation, client secret handling, and order creation. 【F:src/components/StripeCard.jsx†L1-L200】【F:src/components/StripeSepa.jsx†L1-L200】【F:src/components/StripeSepaInstallments.jsx†L1-L200】
- `StripeProvider` centralizes Stripe elements context. 【F:src/components/StripeProvider.jsx†L1-L59】

### 5.4 Account & Content Components
- **Addresses, Orders, Reviews, Profile, Wishlist** provide account management UI in protected routes. 【F:src/components/Addresses.jsx†L1-L200】【F:src/components/Orders.jsx†L1-L200】【F:src/components/Reviews.jsx†L1-L200】【F:src/components/Profile.jsx†L1-L200】【F:src/components/Wishlist.jsx†L1-L200】

## 6. Pages & UX Flows

### 6.1 Home & Browse
- Home uses components like `HomeCarousel`, `TopSellers`, and category sections driven by `homeCategories`. 【F:src/pages/Home.jsx†L1-L200】【F:src/components/HomeCarousel.jsx†L1-L200】【F:src/components/TopSellers.jsx†L1-L104】
- Products page supports category filtering and renders product tiles with price/discount helpers. 【F:src/pages/Products.jsx†L1-L200】【F:src/components/ProductTile.jsx†L1-L200】
- Product details include carousel, wishlist, reviews, and add-to-cart behavior. 【F:src/pages/ProductDetailPage.jsx†L1-L200】

### 6.2 Cart & Checkout
- Cart keeps local state synchronized to backend cart via debounced save and optional cart token. 【F:src/pages/Cart.jsx†L1-L200】【F:src/features/cart/cartApi.js†L1-L98】【F:src/lib/cartToken.js†L1-L13】
- Checkout computes pricing with coupon/discount logic and integrates Stripe and PayPal payments. 【F:src/pages/Checkout.jsx†L1-L200】【F:src/lib/pricing.js†L1-L200】【F:src/features/payments/paymentsApi.js†L1-L70】
- Return and success pages handle post-payment status. 【F:src/pages/CheckoutReturn.jsx†L1-L103】【F:src/pages/CheckoutSuccess.jsx†L1-L200】

### 6.3 Auth & Account
- Login is a two-step OTP flow; registration and password reset are provided by dedicated pages. 【F:src/pages/Login.jsx†L1-L200】【F:src/pages/RegisterPage.jsx†L1-L118】【F:src/pages/ResetPasswordPage.jsx†L1-L200】
- Account dashboard links to profile, orders, addresses, wishlist, reviews. 【F:src/pages/Dashboard.jsx†L1-L83】

### 6.4 Legal & Informational
- Legal and policy pages are structured with table-of-contents style navigation and use `Helmet` for metadata. 【F:src/pages/TermsPage.jsx†L1-L200】【F:src/pages/PrivacyPolicyPage.jsx†L1-L200】【F:src/pages/ReturnsPage.jsx†L1-L200】【F:src/pages/ShippingPolicyPage.jsx†L1-L200】【F:src/pages/CookiePolicyPage.jsx†L1-L200】

## 7. Data & Domain Models

### 7.1 Cart Items
Cart items are normalized to include product ID, pricing fields, quantity, and metadata. Computation utilities provide pricing logic for discounts and coupons. 【F:src/features/cart/cartSlice.js†L1-L149】【F:src/lib/pricing.js†L1-L200】

### 7.2 Pricing Utilities
- `money.js` resolves product price, base gross price, and discount detection. 【F:src/lib/money.js†L1-L71】
- `pricing.js` computes line-level pricing and coupon allocation. 【F:src/lib/pricing.js†L1-L200】

### 7.3 Order Payloads & Addressing
- Address normalization and order payload construction are in `utils/invoice.js` and `utils/orderPayload.js`. 【F:src/utils/invoice.js†L1-L150】【F:src/utils/orderPayload.js†L1-L91】
- Address lookup uses Geoapify for postal/city/street suggestions. 【F:src/utils/addressApi.js†L1-L82】

## 8. Internationalization (i18n)
- i18next configuration supports `en` and `de` with language detection from storage, cookies, and browser settings. 【F:src/i18n.js†L1-L33】
- The i18n slice persists language selection and updates `<html lang>`. 【F:src/features/i18n/i18nSlice.js†L1-L47】

## 9. SEO, Metadata, and Public Assets
- `public/index.html` defines global meta tags, OG/Twitter metadata, and GTM/GA script tags. 【F:public/index.html†L1-L96】
- `robots.txt` and `sitemap.xml` are included in `public/`, with sitemap generation after build. 【F:public/robots.txt†L1-L9】【F:public/sitemap.xml†L1-L206】【F:src/scripts/generate-sitemap.mjs†L1-L114】

## 10. Analytics & Consent
- Cookie consent gating manages GTM injection and analytics cookie cleanup. 【F:src/features/cookies/cookieSlice.js†L1-L67】【F:src/utils/gtm.js†L1-L107】
- Client-side pageviews are pushed via `GoogleAnalyticsTracker`. 【F:src/components/GoogleAnalyticsTracker.jsx†L1-L13】【F:src/lib/ga.js†L1-L9】

## 11. Security & Privacy Considerations
- Authentication tokens are stored in local storage, injected into API requests, and refreshed automatically when expired. 【F:src/features/auth/authSlice.js†L1-L74】【F:src/services/apiSlice.js†L1-L104】【F:src/services/http.js†L1-L26】
- Sensitive pages (account-related) are protected via `RequireAuth`. 【F:src/routes/RequireAuth.jsx†L1-L25】【F:src/App.js†L89-L141】
- Cookie consent allows analytics opt-in/out and attempts to remove analytics artifacts on opt-out. 【F:src/features/cookies/cookieSlice.js†L1-L67】【F:src/utils/gtm.js†L1-L107】

## 12. Error Handling & Resilience
- Many API calls use `.unwrap()` with error handling and fallbacks in UI (e.g., login, checkout, wishlist). 【F:src/pages/Login.jsx†L1-L200】【F:src/pages/Checkout.jsx†L1-L200】【F:src/components/Wishlist.jsx†L1-L200】
- RTK Query token refresh handles 401s with automatic re-auth attempts. 【F:src/services/apiSlice.js†L1-L104】

## 13. Operational Considerations
- Environment variables: API base, Google client ID, Stripe publishable key, Geoapify key, GTM ID. 【F:src/services/config.js†L1-L11】【F:src/index.js†L10-L18】【F:src/lib/stripe.js†L1-L9】【F:src/utils/addressApi.js†L1-L12】【F:src/features/cookies/cookieSlice.js†L1-L12】
- Frontend proxy for `/api` is configured in `vite.config.js` (if Vite is used for dev). 【F:vite.config.js†L1-L9】

## 14. Known Limitations / Assumptions
- Local storage usage is assumed to be available for auth, cart, and language persistence. 【F:src/features/auth/authSlice.js†L1-L74】【F:src/features/cart/cartSlice.js†L1-L149】【F:src/features/i18n/i18nSlice.js†L1-L47】
- The checkout and pricing flow assumes backend-provided pricing fields and coupon response formats. 【F:src/lib/pricing.js†L1-L200】【F:src/features/promos/promosApi.js†L1-L53】

## 15. Appendix — Key Files Inventory (Frontend)
- Entry/boot: `src/index.js`, `src/App.js`, `public/index.html`. 【F:src/index.js†L1-L19】【F:src/App.js†L1-L162】【F:public/index.html†L1-L96】
- State: `src/app/store.js`, `src/features/*`. 【F:src/app/store.js†L1-L23】
- Services: `src/services/*`, `src/utils/*`. 【F:src/services/apiSlice.js†L1-L104】【F:src/services/http.js†L1-L26】【F:src/utils/invoice.js†L1-L150】
- UI: `src/components/*`, `src/pages/*`. 【F:src/components/Navbar.jsx†L1-L200】【F:src/pages/Home.jsx†L1-L200】
- Assets: `public/*`, `src/assets/*`. 【F:public/index.html†L1-L96】
