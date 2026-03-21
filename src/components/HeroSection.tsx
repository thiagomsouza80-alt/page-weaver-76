import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Users } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";
import logoOficial from "@/assets/logo-oficial.png";

const HeroSection = () => {
  const [memberCount, setMemberCount] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      supabase.from("artists").select("id", { count: "exact", head: true }),
      supabase.from("entrepreneurs").select("id", { count: "exact", head: true }),
    ]).then(([artists, entrepreneurs]) => {
      const total = (artists.count || 0) + (entrepreneurs.count || 0);
      if (total > 0) setMemberCount(total);
    });
  }, []);

  return (
    <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
      <img src={heroBg} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 hero-overlay" />
      <div className="relative z-10 text-center px-6 pt-20 pb-16 max-w-3xl mx-auto">
        <img src={logoOficial} alt="Amazônia Pop" className="mx-auto w-72 sm:w-80 md:w-[420px] mb-6 animate-fade-up drop-shadow-2xl" />
        <p className="text-foreground/70 text-base md:text-lg mb-10 max-w-xl mx-auto animate-fade-up-delay-1" style={{ textWrap: "balance" as any }}>
          O principal HUB digital de cultura pop, anime, games e eventos geek da Amazônia.
        </p>
        <div className="flex flex-wrap gap-4 justify-center animate-fade-up-delay-2">
          <Link to="/artistas"><Button variant="hero" size="lg">Explorar Artistas</Button></Link>
          <Link to="/eventos"><Button variant="heroOutline" size="lg">Ver Eventos</Button></Link>
        </div>
        {memberCount !== null && (
          <p className="mt-6 text-foreground/60 text-sm flex items-center justify-center gap-1.5 animate-fade-up-delay-2">
            <Users className="h-4 w-4" />
            Somos <span className="font-bold text-foreground">{memberCount}</span> membros nesse portal
          </p>
        )}
      </div>
    </section>
  );
};

export default HeroSection;
