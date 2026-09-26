import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { MarketStrip } from "@/components/MarketStrip";
import { FeatureGrid } from "@/components/FeatureGrid";
import { PlatformPreview } from "@/components/PlatformPreview";
import { TrustSection } from "@/components/TrustSection";
import { BottomCTA } from "@/components/BottomCTA";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <MarketStrip />
        <FeatureGrid />
        <PlatformPreview />
        <TrustSection />
        <BottomCTA />
      </main>
      <Footer />
    </>
  );
}
