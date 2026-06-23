import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Loader2, Store, Instagram } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import bizGeekstore from "@/assets/biz-geekstore.jpg";
import bizTemakeria from "@/assets/biz-temakeria.jpg";
import bizAtelie from "@/assets/biz-atelie.jpg";

const badgeColors: Record<string, string> = {
  "Loja Geek": "bg-[hsl(var(--badge-quadrinhos))]",
  Gastronomia: "bg-[hsl(var(--badge-eventos))]",
  "Ateliê": "bg-[hsl(var(--badge-cosplay))]",
};

const fallbackImages: Record<string, string> = {
  "nivel-99-geek-store": bizGeekstore,
  "nakama-temakeria": bizTemakeria,
  "atelie-cosmaker": bizAtelie,
};

const fallbackBusinesses = [
  { image_url: null, badge: "Loja Geek", name: "Nível 99 Geek Store", description: "A maior loja de cultura pop de Belém com figures, mangás, cards e colecionáveis.", slug: "nivel-99-geek-store", instagram: "@nivel99geek" },
  { image_url: null, badge: "Gastronomia", name: "Nakama Temakeria & Ramen", description: "Restaurante temático japonês com decoração anime e pratos inspirados em mangás.", slug: "nakama-temakeria", instagram: "@nakamatemakeria" },
  { image_url: null, badge: "Ateliê", name: "Ateliê Cosmaker", description: "Oficina especializada em cosplay sob medida, armaduras em EVA e próteses artísticas.", slug: "atelie-cosmaker", instagram: "@ateliecosmaker" },
];

type Biz = { name: string; slug: string; badge: string; description: string; image_url: string | null; instagram?: string | null };

const Empreendedores = () => {
  const [businesses, setBusinesses] = useState<Biz[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await (supabase as any)
        .from("entrepreneurs_public")
        .select("name, slug, badge, description, image_url, instagram")
        .eq("published", true)
        .order("created_at");
      setBusinesses((data as Biz[]) || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const usedNames = new Set(businesses.map(b => b.name.toLowerCase()));
  const remainingFallbacks = fallbackBusinesses.filter(fb => !usedNames.has(fb.name.toLowerCase()));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="pt-28 pb-20 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-2 animate-fade-up">
          <Store className="h-7 w-7 text-primary" />
          <h1 className="text-3xl md:text-4xl font-bold">Empreendedores</h1>
        </div>
        <p className="text-muted-foreground mb-10 animate-fade-up-delay-1">
          Conheça os negócios que movimentam a cena geek e pop da Amazônia.
        </p>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : businesses.length === 0 && remainingFallbacks.length === 0 ? (
          <p className="text-muted-foreground text-center py-20">Nenhum empreendedor cadastrado ainda.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {businesses.map((biz) => {
              const img = biz.image_url || fallbackImages[biz.slug] || bizGeekstore;
              return (
                <Link
                  key={biz.slug}
                  to={`/empreendedores/${biz.slug}`}
                  className="bg-card rounded-xl overflow-hidden card-hover group animate-fade-up block"
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img src={img} alt={biz.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    <span className={`absolute bottom-3 left-3 ${badgeColors[biz.badge] || "bg-primary"} text-primary-foreground text-xs font-semibold px-3 py-1 rounded-md`}>
                      {biz.badge}
                    </span>
                  </div>
                  <div className="p-5 space-y-2">
                    <h3 className="font-bold text-lg">{biz.name}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3">{biz.description}</p>
                    {biz.instagram && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Instagram className="h-3 w-3" /> {biz.instagram}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}

            {remainingFallbacks.map((biz) => {
              const img = fallbackImages[biz.slug] || bizGeekstore;
              return (
                <Link
                  key={biz.slug}
                  to={`/empreendedores/${biz.slug}`}
                  className="bg-card rounded-xl overflow-hidden card-hover group animate-fade-up block"
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img src={img} alt={biz.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    <span className={`absolute bottom-3 left-3 ${badgeColors[biz.badge] || "bg-primary"} text-primary-foreground text-xs font-semibold px-3 py-1 rounded-md`}>
                      {biz.badge}
                    </span>
                  </div>
                  <div className="p-5 space-y-2">
                    <h3 className="font-bold text-lg">{biz.name}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3">{biz.description}</p>
                    {biz.instagram && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Instagram className="h-3 w-3" /> {biz.instagram}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
      <Footer />
    </div>
  );
};

export default Empreendedores;
