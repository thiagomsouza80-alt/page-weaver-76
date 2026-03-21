import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import NewsSection from "@/components/NewsSection";
import EventsSection from "@/components/EventsSection";
import ArtistsSection from "@/components/ArtistsSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <NewsSection />
      <EventsSection />
      <ArtistsSection />
      <Footer />
    </div>
  );
};

export default Index;
