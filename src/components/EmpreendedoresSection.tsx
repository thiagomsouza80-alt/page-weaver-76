import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Store } from "lucide-react";
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
  { image_url: null, badge: "Loja Geek", name: "Nível 99 Geek Store", description: "A maior loja de cultura pop de Belém com figures, mangás, cards e colecionáveis.", slug: "nivel-99-geek-store" },
  { image_url: null, badge: "Gastronomia", name: "Nakama Temakeria & Ramen", description: "Restaurante temático japonês com decoração anime e pratos inspirados em mangás.", slug: "nakama-temakeria" },
  { image_url: null, badge: "Ateliê", name: "Ateliê Cosmaker", description: "Oficina especializada em cosplay sob medida, armaduras em EVA e próteses artísticas.", slug: "atelie-cosmaker" },
];

type Biz = { name: string; slug: string; badge: string; description: string; image_url: string | null };

const EmpreendedoresSection = () => {
  const [businesses, setBusinesses] = useState<Biz[]>(fallbackBusinesses);

  useEffect(() => {
    supabase.from("entrepreneurs").select("name, slug, badge, description, image_url").eq("published", true).order("created_at")
      .then(({ data }) => {
        if (data && data.length > 0) setBusinesses(data as Biz[]);
      });
  }, []);

  return (
    <section className="px-6 md:px-12 py-16 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Store className="h-6 w-6 text-primary" />
          <h2 className="text-2xl md:text-3xl font-bold">Empreendedores da Cultura Pop</h2>
        </div>
      </div>
      <p className="text-muted-foreground mb-8 max-w-2xl">
        Conheça os negócios que movimentam a cena geek e pop da Amazônia.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {businesses.map((biz, i) => {
          const img = biz.image_url || fallbackImages[biz.slug] || bizGeekstore;
          return (
            <Link to={`/empreendedores/${biz.slug}`} key={i}>
              <article className={`bg-card rounded-xl overflow-hidden card-hover cursor-pointer group animate-fade-up-delay-${i + 1}`}>
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img src={img} alt={biz.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <span className={`absolute bottom-3 left-3 ${badgeColors[biz.badge] || "bg-primary"} text-primary-foreground text-xs font-semibold px-3 py-1 rounded-md`}>
                    {biz.badge}
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-base leading-snug mb-1">{biz.name}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{biz.description}</p>
                </div>
              </article>
            </Link>
          );
        })}
      </div>
    </section>
  );
};

export default EmpreendedoresSection;
