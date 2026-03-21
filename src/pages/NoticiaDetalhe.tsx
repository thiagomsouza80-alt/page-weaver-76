import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Loader2, ArrowLeft, CalendarDays } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import convencaoImg1 from "@/assets/news-convencao-geek-1.jpg";
import convencaoImg2 from "@/assets/news-convencao-geek-2.jpg";
import convencaoImg3 from "@/assets/news-convencao-geek-3.jpg";

type News = Tables<"news">;

const fallbackNews: Record<string, { title: string; summary: string; category: string; date: string; image: string; content: React.ReactNode }> = {
  "grande-convencao-geek-agita-belem": {
    title: "Grande Convenção Geek Agita Belém",
    summary: "O maior evento de cultura pop do Norte reuniu milhares de fãs em um final de semana inesquecível no Hangar Centro de Convenções.",
    category: "Eventos",
    date: "15 de março de 2026",
    image: convencaoImg1,
    content: null, // será renderizado inline abaixo
  },
};

const ConvencaoGeekContent = () => (
  <div className="space-y-6 text-foreground/85 leading-relaxed">
    <p>
      Belém viveu um final de semana histórico para a cultura pop amazônica. A <strong>Grande Convenção Geek</strong>, realizada no Hangar Centro de Convenções da Amazônia, reuniu mais de 8 mil pessoas em dois dias de programação intensa, celebrando o universo dos animes, mangás, games, cosplay e K-Pop.
    </p>

    <p>
      O evento, que já se consolida como o maior do gênero na região Norte, contou com mais de 120 expositores — entre lojas de colecionáveis, artistas independentes, editoras de quadrinhos e estúdios de games locais. A movimentação nos corredores era constante, com fãs de todas as idades explorando os estandes em busca de figures raras, mangás autografados e cards de edição limitada.
    </p>

    <div className="rounded-xl overflow-hidden my-8">
      <img src={convencaoImg1} alt="Público explorando os estandes da convenção" className="w-full h-auto" />
      <p className="text-xs text-muted-foreground mt-2 text-center">Público lotou os corredores do Hangar durante os dois dias de evento</p>
    </div>

    <h2 className="text-xl font-bold mt-8 mb-3">Cosplay de alto nível</h2>

    <p>
      Um dos grandes destaques foi o <strong>Concurso de Cosplay</strong>, que contou com 47 participantes de todo o Pará e estados vizinhos. Os jurados — entre eles cosplayers reconhecidos nacionalmente — avaliaram critérios como fidelidade ao personagem, acabamento das peças e performance no palco. A categoria "Armadura" foi a mais disputada, com trabalhos impressionantes em EVA e resina.
    </p>

    <div className="rounded-xl overflow-hidden my-8">
      <img src={convencaoImg2} alt="Cosplayers posando juntos na convenção" className="w-full h-auto" />
      <p className="text-xs text-muted-foreground mt-2 text-center">Cosplayers de diversos animes e jogos marcaram presença no evento</p>
    </div>

    <h2 className="text-xl font-bold mt-8 mb-3">Palco vibrante com K-Pop e música</h2>

    <p>
      O palco principal da convenção foi palco de apresentações eletrizantes. Grupos de cover de K-Pop de Belém e Manaus se apresentaram com coreografias sincronizadas que arrancaram aplausos do público. O grupo <strong>Hallyu Belém</strong>, liderado pela dançarina Hana Lee — artista cadastrada no Portal Pop Amazônia — foi um dos mais aplaudidos, apresentando medleys de BLACKPINK e Stray Kids.
    </p>

    <div className="rounded-xl overflow-hidden my-8">
      <img src={convencaoImg3} alt="Apresentação de K-Pop no palco da convenção" className="w-full h-auto" />
      <p className="text-xs text-muted-foreground mt-2 text-center">Grupos de K-Pop agitaram o palco principal com coreografias impecáveis</p>
    </div>

    <h2 className="text-xl font-bold mt-8 mb-3">Artistas locais em evidência</h2>

    <p>
      O Artist Alley foi outro ponto forte. Mais de 30 artistas independentes da região expuseram prints, zines, adesivos e quadrinhos autorais. O ilustrador <strong>Ikarow</strong> — conhecido por suas ilustrações que fundem mitologia amazônica com estética anime — esgotou toda a sua tiragem de prints exclusivos antes do meio-dia do segundo dia.
    </p>

    <p>
      Alexandre Nascimento, quadrinista paraense, aproveitou o evento para lançar o segundo volume de sua HQ "Curupira: Guardiões da Floresta", que mistura lendas amazônicas com narrativa de mangá shonen. A fila para autógrafos chegou a 40 minutos de espera.
    </p>

    <h2 className="text-xl font-bold mt-8 mb-3">Empreendedorismo geek</h2>

    <p>
      Empreendedores locais também marcaram presença. A <strong>Nível 99 Geek Store</strong> montou um mega estande com lançamentos exclusivos e promoções especiais para o evento. A <strong>Nakama Temakeria &amp; Ramen</strong> ofereceu um cardápio especial temático no food court, e o <strong>Ateliê Cosmaker</strong> demonstrou ao vivo o processo de criação de armaduras em EVA, atraindo uma multidão de curiosos.
    </p>

    <h2 className="text-xl font-bold mt-8 mb-3">Próximas edições</h2>

    <p>
      A organização já confirmou que a próxima edição está prevista para agosto de 2026, com a promessa de um espaço ainda maior e atrações nacionais. "Belém tem um público apaixonado e criativo. A cena geek da Amazônia está crescendo e merece palcos cada vez maiores", afirmou a produtora do evento.
    </p>

    <p className="text-muted-foreground italic mt-8">
      O Portal Pop Amazônia é parceiro oficial do evento e continuará acompanhando as novidades da cultura pop na região.
    </p>
  </div>
);

const NoticiaDetalhe = () => {
  const { slug } = useParams();
  const [item, setItem] = useState<News | null>(null);
  const [loading, setLoading] = useState(true);

  const fallback = slug ? fallbackNews[slug] : undefined;

  useEffect(() => {
    const fetchNews = async () => {
      const { data } = await supabase.from("news").select("*").eq("slug", slug).single();
      setItem(data);
      setLoading(false);
    };
    fetchNews();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Fallback para notícias fictícias
  if (!item && fallback) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <article className="pt-24 pb-16 px-6 max-w-3xl mx-auto">
          <Link to="/noticias" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mb-6">
            <ArrowLeft className="h-4 w-4" /> Voltar às notícias
          </Link>

          <div className="aspect-video rounded-xl overflow-hidden mb-8">
            <img src={fallback.image} alt={fallback.title} className="w-full h-full object-cover" />
          </div>

          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-semibold px-3 py-1 rounded-md bg-primary/10 text-primary">{fallback.category}</span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              {fallback.date}
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">{fallback.title}</h1>
          <p className="text-lg text-muted-foreground mb-8">{fallback.summary}</p>

          {slug === "grande-convencao-geek-agita-belem" && <ConvencaoGeekContent />}
        </article>
        <Footer />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 pb-16 px-6 max-w-3xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">Notícia não encontrada</h1>
          <Link to="/noticias" className="text-primary hover:underline">← Voltar às notícias</Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <article className="pt-24 pb-16 px-6 max-w-3xl mx-auto">
        <Link to="/noticias" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mb-6">
          <ArrowLeft className="h-4 w-4" /> Voltar às notícias
        </Link>

        {item.image_url && (
          <div className="aspect-video rounded-xl overflow-hidden mb-8">
            <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
          </div>
        )}

        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs font-semibold px-3 py-1 rounded-md bg-primary/10 text-primary">{item.category}</span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            {new Date(item.created_at).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}
          </span>
        </div>

        <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">{item.title}</h1>
        <p className="text-lg text-muted-foreground mb-8">{item.summary}</p>

        <div className="prose prose-invert max-w-none text-foreground/85 leading-relaxed whitespace-pre-wrap">
          {item.content}
        </div>
      </article>
      <Footer />
    </div>
  );
};

export default NoticiaDetalhe;
