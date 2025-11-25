// src/pages/Home.jsx
import HomeCarousel from "../components/HomeCarousel";
import { FeatureStrip } from "../components/FeatureStrip";
import HandmadeGuarantee from "../components/HandmadeGuarantee";
import { Suspense, lazy } from "react";
const TopSellers = lazy(() => import("../components/TopSellers"));
const CollectionRow = lazy(() => import("../components/CollectionRow"));
const HomeTrustSection = lazy(() => import("../components/HomeTrustSection"));
const FreeDelivery = lazy(() => import("../components/FreeDelivery"));
const AboutUsRow = lazy(() => import("../components/AboutUsRow"));

export default function Home() {
  return (
    <main>
      <HomeCarousel />
      <Suspense fallback={null}>
        <TopSellers />
        <CollectionRow />
        <HomeTrustSection />
        <FreeDelivery />
        <AboutUsRow />
      </Suspense>
      <HandmadeGuarantee />
      <FeatureStrip />
    </main>
  );
}
