import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import newsEvento from "@/assets/news-evento.jpg";
import newsCosplay from "@/assets/news-cosplay.jpg";
import newsQuadrinhos from "@/assets/news-quadrinhos.jpg";

type News = Tables<"news">;

const fallbackNews = [
  { img: newsEvento, badge: "Eventos", date: "22 ABR, 2024", title: "Grande Convenção Geek Agita Belém", slug: "" },
  { img: newsCosplay, badge: "Cosplay", date: "22 ABR, 2024", title: "Cosplay de Luxo em Destaque na Amazônia", slug: "" },
  { img: newsQuadrinhos, badge: "Quadrinhos", date: "22 ABR, 2024", title: "Novas HQs da Marvel Chegam às Lojas", slug: "" },
];

const NewsSection = () => {
  const [dbNews, setDbNews] = useState<News[]>([]);

  useEffect(() => {
    supabase.from("news").select("*").eq("published", true).order("created_at", { ascending: false }).limit(3)
      .then(({ data }) => { if (data) setDbNews(data); });
  }, []);

  // Always show 3 cards: DB news first, then fill with fallback
  const filledNews = [
    ...dbNews.map((item) => ({ type: "db" as const, data: item })),
    ...fallbackNews.map((item) => ({ type: "fallback" as const, data: item })),
  ].slice(0, 3);

  return (
    <section className="px-6 md:px-12 py-16 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl md:text-3xl font-bold">Últimas Notícias</h2>
        <Link to="/noticias" className="text-primary text-sm font-semibold hover:underline">Ver todas →</Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filledNews.map((entry, i) =>
          entry.type === "db" ? (
            <Link to={`/noticias/${entry.data.slug}`} key={entry.data.id}>
              <article className={`bg-card rounded-xl overflow-hidden card-hover cursor-pointer group animate-fade-up-delay-${i + 1}`}>
                <div className="relative aspect-[4/3] overflow-hidden">
                  {entry.data.image_url ? (
                    <img src={entry.data.image_url} alt={entry.data.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full bg-secondary flex items-center justify-center">
                      <span className="text-muted-foreground text-sm">Sem imagem</span>
                    </div>
                  )}
                  <span className="absolute bottom-3 left-3 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-md">
                    {entry.data.category}
                  </span>
                </div>
                <div className="p-4">
                  <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">
                    {new Date(entry.data.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase()}
                  </p>
                  <h3 className="font-bold text-base leading-snug">{entry.data.title}</h3>
                </div>
              </article>
            </Link>
          ) : (
            <article key={i} className={`bg-card rounded-xl overflow-hidden card-hover cursor-pointer group animate-fade-up-delay-${i + 1}`}>
              <div className="relative aspect-[4/3] overflow-hidden">
                <img src={(entry.data as any).img} alt={(entry.data as any).title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <span className="absolute bottom-3 left-3 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-md">
                  {(entry.data as any).badge}
                </span>
              </div>
              <div className="p-4">
                <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">{(entry.data as any).date}</p>
                <h3 className="font-bold text-base leading-snug">{(entry.data as any).title}</h3>
              </div>
            </article>
          )
        )}
      </div>
    </section>
  );
};

export default NewsSection;
