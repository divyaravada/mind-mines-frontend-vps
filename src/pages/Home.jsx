// src/pages/Home.jsx
import HomeCarousel from "../components/HomeCarousel";
import { CollectionRow } from "../components/CollectionRow";
import { AboutUsRow } from "../components/AboutUsRow";
import { FeatureStrip } from "../components/FeatureStrip";
import TopSellers from "../components/TopSellers";
import HandmadeGuarantee from "../components/HandmadeGuarantee";
import HomeTrustSection from "../components/HomeTrustSection";
import FreeDelivery from "../components/FreeDelivery";

export default function Home() {
  return (
    <main>
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
