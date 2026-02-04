// src/pages/Home.jsx
import HomeCarousel from "../components/HomeCarousel";
import { FeatureStrip } from "../components/FeatureStrip";
import HandmadeGuarantee from "../components/HandmadeGuarantee";
import TopSellers from "../components/TopSellers";
import { CollectionRow } from "../components/CollectionRow";
import HomeTrustSection from "../components/HomeTrustSection";
import FreeDelivery from "../components/FreeDelivery";
import { AboutUsRow } from "../components/AboutUsRow";

import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";
import { useTrackEventMutation } from "../features/marketing/marketingApi";

export default function Home() {
  const { t, i18n } = useTranslation();
  const [trackEvent] = useTrackEventMutation();

  useEffect(() => {
    try {
      trackEvent({
        event_type: "page_view",
        path: "/", // adjust if your home route is different
        locale: i18n.language, // optional extra info
      });
    } catch (error) {
      /* ignore tracking errors */
    }
  }, [trackEvent, i18n.language]);

  const title = t("home.meta.title", "MindMines – Marble & Stone Decor");
  const description = t(
    "home.meta.description",
    "Handmade marble and natural stone decor, kitchenware and gifts from MindMines.",
  );

  return (
    <main>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
      </Helmet>

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
