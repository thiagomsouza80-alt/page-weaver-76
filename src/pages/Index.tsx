import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import SponsorsSection from "@/components/SponsorsSection";
import NewsSection from "@/components/NewsSection";
import EventsSection from "@/components/EventsSection";
import ArtistsSection from "@/components/ArtistsSection";
import EmpreendedoresSection from "@/components/EmpreendedoresSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <SponsorsSection />
      <NewsSection />
      <EmpreendedoresSection />
      <EventsSection />
      <ArtistsSection />
      <Footer />
    </div>
  );
};

export default Index;
