// src/pages/Home.jsx
import HomeCarousel from "../components/HomeCarousel";
import { FeatureStrip } from "../components/FeatureStrip";
import HandmadeGuarantee from "../components/HandmadeGuarantee";
import TopSellers from "../components/TopSellers";
import { CollectionRow } from "../components/CollectionRow";
import HomeTrustSection from "../components/HomeTrustSection";
import FreeDelivery from "../components/FreeDelivery";
import { AboutUsRow } from "../components/AboutUsRow";

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
