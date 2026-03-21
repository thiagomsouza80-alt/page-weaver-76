import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import newsEvento from "@/assets/news-evento.jpg";
import newsCosplay from "@/assets/news-cosplay.jpg";
import newsQuadrinhos from "@/assets/news-quadrinhos.jpg";

type News = Tables<"news">;

const fallbackNews = [
  { img: newsEvento, badge: "Eventos", date: "22 ABR, 2024", title: "Grande Convenção Geek Agita Manaus", slug: "" },
  { img: newsCosplay, badge: "Cosplay", date: "22 ABR, 2024", title: "Cosplay de Luxo em Destaque na Amazônia", slug: "" },
  { img: newsQuadrinhos, badge: "Quadrinhos", date: "22 ABR, 2024", title: "Novas HQs da Marvel Chegam às Lojas", slug: "" },
];

const NewsSection = () => {
  const [dbNews, setDbNews] = useState<News[]>([]);

  useEffect(() => {
    supabase.from("news").select("*").eq("published", true).order("created_at", { ascending: false }).limit(3)
      .then(({ data }) => { if (data) setDbNews(data); });
  }, []);

  const hasDb = dbNews.length > 0;

  return (
    <section className="px-6 md:px-12 py-16 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl md:text-3xl font-bold">Últimas Notícias</h2>
        <Link to="/noticias" className="text-primary text-sm font-semibold hover:underline">Ver todas →</Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {hasDb ? dbNews.map((item, i) => (
          <Link to={`/noticias/${item.slug}`} key={item.id}>
            <article className={`bg-card rounded-xl overflow-hidden card-hover cursor-pointer group animate-fade-up-delay-${i + 1}`}>
              <div className="relative aspect-[4/3] overflow-hidden">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <div className="w-full h-full bg-secondary" />
                )}
                <span className="absolute bottom-3 left-3 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-md">
                  {item.category}
                </span>
              </div>
              <div className="p-4">
                <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">
                  {new Date(item.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase()}
                </p>
                <h3 className="font-bold text-base leading-snug">{item.title}</h3>
              </div>
            </article>
          </Link>
        )) : fallbackNews.map((item, i) => (
          <article key={i} className={`bg-card rounded-xl overflow-hidden card-hover cursor-pointer group animate-fade-up-delay-${i + 1}`}>
            <div className="relative aspect-[4/3] overflow-hidden">
              <img src={item.img} alt={item.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
              <span className="absolute bottom-3 left-3 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-md">
                {item.badge}
              </span>
            </div>
            <div className="p-4">
              <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">{item.date}</p>
              <h3 className="font-bold text-base leading-snug">{item.title}</h3>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export default NewsSection;
