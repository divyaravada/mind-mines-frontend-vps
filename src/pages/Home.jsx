// src/pages/Home.jsx
import HomeCarousel from "../components/HomeCarousel";
import { FeatureStrip } from "../components/FeatureStrip";
import HandmadeGuarantee from "../components/HandmadeGuarantee";
import TopSellers from "../components/TopSellers";
import { CollectionRow } from "../components/CollectionRow";
import HomeTrustSection from "../components/HomeTrustSection";
import FreeDelivery from "../components/FreeDelivery";
import { AboutUsRow } from "../components/AboutUsRow";

import SEO from "../components/SEO";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";
import { useTrackEventMutation } from "../features/marketing/marketingApi";

export default function Home() {
  const { t, i18n } = useTranslation();
  const [trackEvent] = useTrackEventMutation();
  const isPrerender = process.env.REACT_APP_PRERENDER === "true";

  useEffect(() => {
    if (isPrerender) return;
    trackEvent({
      event_type: "page_view",
      path: "/", // adjust if your home route is different
      locale: i18n.language, // optional extra info
    });
  }, [isPrerender, trackEvent, i18n.language]);

  const title = t("home.meta.title", "MindMines – Marble & Stone Decor");
  const description = t(
    "home.meta.description",
    "Handmade marble and natural stone decor, kitchenware and gifts from MindMines.",
  );

  return (
    <main>
      <SEO
        title={title}
        description={description}
        canonical="https://mindmines.eu/"
      />

      <h1 className="sr-only">
        {t("home.h1", "Handcrafted Marble & Natural Stone Decor")}
      </h1>

      <HomeCarousel />
      {/* <CountertopCTA /> */}
      <TopSellers />
      <HandmadeGuarantee />
      <CollectionRow />
      <HomeTrustSection />
      <FreeDelivery />
      <AboutUsRow />
      <FeatureStrip />
    </main>
  );
}
