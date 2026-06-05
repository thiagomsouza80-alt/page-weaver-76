import Navbar from "@/components/Navbar";
import BannerPrincipal from "@/components/BannerPrincipal";
import NewsSection from "@/components/NewsSection";
import EventsSection from "@/components/EventsSection";
import ArtistsSection from "@/components/ArtistsSection";
import EmpreendedoresSection from "@/components/EmpreendedoresSection";
import SponsorsSection from "@/components/SponsorsSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <BannerPrincipal />
      <NewsSection />
      <EventsSection />
      <ArtistsSection />
      <EmpreendedoresSection />
      <SponsorsSection />
      <Footer />
    </div>
  );
};

export default Index;
