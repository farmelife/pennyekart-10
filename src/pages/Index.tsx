import { useState } from "react";
import PlatformSelector from "@/components/PlatformSelector";
import SearchBar from "@/components/SearchBar";
import CategoryBar from "@/components/CategoryBar";
import BannerCarousel from "@/components/BannerCarousel";
import MobileBottomNav from "@/components/MobileBottomNav";
import Footer from "@/components/Footer";

const Index = () => {
  const [platform, setPlatform] = useState("pennyekart");

  return (
    <div className="min-h-screen pb-16 md:pb-0">
      {/* Sticky header stack */}
      <header className="sticky top-0 z-40">
        <PlatformSelector selected={platform} onSelect={setPlatform} />
        <SearchBar />
      </header>

      <main>
        <CategoryBar />
        <BannerCarousel />
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default Index;
