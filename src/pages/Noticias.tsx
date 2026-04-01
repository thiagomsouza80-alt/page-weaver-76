import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import newsEvento from "@/assets/news-evento.jpg";
import newsCosplay from "@/assets/news-cosplay.jpg";
import newsQuadrinhos from "@/assets/news-quadrinhos.jpg";
import newsConvention from "@/assets/news-convention.jpg";
import newsEsports from "@/assets/news-esports.jpg";
import newsKpop from "@/assets/news-kpop.jpg";
import newsManga from "@/assets/news-manga.jpg";

const badgeColors: Record<string, string> = {
  Eventos: "bg-[hsl(var(--badge-eventos))]",
  eventos: "bg-[hsl(var(--badge-eventos))]",
  Cosplay: "bg-[hsl(var(--badge-cosplay))]",
  cosplay: "bg-[hsl(var(--badge-cosplay))]",
  Quadrinhos: "bg-[hsl(var(--badge-quadrinhos))]",
  quadrinhos: "bg-[hsl(var(--badge-quadrinhos))]",
  "E-sports": "bg-[hsl(var(--badge-quadrinhos))]",
  "e-sports": "bg-[hsl(var(--badge-quadrinhos))]",
  "K-Pop": "bg-[hsl(var(--badge-dancarina))]",
  "k-pop": "bg-[hsl(var(--badge-dancarina))]",
  Games: "bg-[hsl(var(--badge-ilustrador))]",
  games: "bg-[hsl(var(--badge-ilustrador))]",
  geral: "bg-primary",
};

const staticNews = [
  {
    slug: "grande-convencao-geek-agita-belem-static",
    img: newsEvento, badge: "Eventos", date: "22 ABR, 2024",
    title: "Grande Convenção Geek Agita Belém",
    summary: "Milhares de fãs se reuniram no Hangar Centro de Convenções para o maior encontro de cultura pop da região Norte. O evento contou com painéis de dubladores, área de jogos retro e uma praça de alimentação temática.",
  },
  {
    slug: "cosplay-de-luxo-em-destaque-na-amazonia-static",
    img: newsCosplay, badge: "Cosplay", date: "20 ABR, 2024",
    title: "Cosplay de Luxo em Destaque na Amazônia",
    summary: "Cosplayers profissionais da região amazônica estão ganhando destaque nacional com produções de altíssima qualidade.",
  },
  {
    slug: "novas-hqs-da-marvel-chegam-as-lojas-de-belem-static",
    img: newsQuadrinhos, badge: "Quadrinhos", date: "18 ABR, 2024",
    title: "Novas HQs da Marvel Chegam às Lojas de Belém",
    summary: "As lojas especializadas de Belém receberam os lançamentos mais aguardados da Marvel Comics.",
  },
  {
    slug: "festival-noturno-pop-culture-reune-5-mil-pessoas-static",
    img: newsConvention, badge: "Eventos", date: "15 ABR, 2024",
    title: "Festival Noturno Pop Culture Reúne 5 Mil Pessoas",
    summary: "A primeira edição do festival noturno de cultura pop surpreendeu com a presença massiva do público.",
  },
  {
    slug: "torneio-regional-de-valorant-define-campeao-static",
    img: newsEsports, badge: "E-sports", date: "12 ABR, 2024",
    title: "Torneio Regional de Valorant Define Campeão",
    summary: "A equipe Jaguar Esports venceu o campeonato regional de Valorant e garantiu vaga no circuito nacional.",
  },
  {
    slug: "grupos-de-cover-dance-lotam-praca-da-republica-static",
    img: newsKpop, badge: "K-Pop", date: "10 ABR, 2024",
    title: "Grupos de Cover Dance Lotam Praça da República",
    summary: "O encontro mensal de K-Pop em Belém bateu recorde de público com apresentações de 12 grupos de cover dance.",
  },
  {
    slug: "artista-paraense-lanca-manga-autoral-na-ccxp-static",
    img: newsManga, badge: "Quadrinhos", date: "8 ABR, 2024",
    title: "Artista Paraense Lança Mangá Autoral na CCXP",
    summary: "O quadrinista Alexandre Nascimento apresentou seu mangá 'Guardiões da Floresta' na CCXP.",
  },
];

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  const months = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
  return `${d.getDate()} ${months[d.getMonth()]}, ${d.getFullYear()}`;
};

const Noticias = () => {
  const [dbNews, setDbNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("news")
      .select("*")
      .eq("published", true)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setDbNews(data || []);
        setLoading(false);
      });
  }, []);

  const dbItems = dbNews.map(n => ({
    slug: n.slug,
    img: n.image_url,
    badge: n.category || "geral",
    date: formatDate(n.created_at),
    title: n.title,
    summary: n.summary,
    isDb: true,
  }));

  const allNews = [...dbItems, ...staticNews];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="pt-28 pb-20 px-6 md:px-12 max-w-7xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold mb-2 animate-fade-up">Notícias</h1>
        <p className="text-muted-foreground mb-10 animate-fade-up-delay-1">
          Fique por dentro de tudo que acontece no universo geek, anime, games e cosplay da Amazônia.
        </p>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allNews.map((item, i) => (
              <Link
                to={`/noticias/${item.slug}`}
                key={item.slug || i}
                className="bg-card rounded-xl overflow-hidden card-hover cursor-pointer group animate-fade-up block"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  {item.img ? (
                    <img src={item.img} alt={item.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full bg-secondary flex items-center justify-center">
                      <span className="text-4xl font-bold text-muted-foreground/30">{item.title[0]}</span>
                    </div>
                  )}
                  <span className={`absolute bottom-3 left-3 ${badgeColors[item.badge] || "bg-primary"} text-primary-foreground text-xs font-semibold px-3 py-1 rounded-md`}>
                    {item.badge}
                  </span>
                </div>
                <div className="p-5">
                  <p className="text-muted-foreground text-xs uppercase tracking-wider mb-2">{item.date}</p>
                  <h3 className="font-bold text-base leading-snug mb-2">{item.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3">{item.summary}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
      <Footer />
    </div>
  );
};

export default Noticias;
