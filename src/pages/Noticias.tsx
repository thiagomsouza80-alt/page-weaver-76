import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import newsEvento from "@/assets/news-evento.jpg";
import newsCosplay from "@/assets/news-cosplay.jpg";
import newsQuadrinhos from "@/assets/news-quadrinhos.jpg";
import newsConvention from "@/assets/news-convention.jpg";
import newsEsports from "@/assets/news-esports.jpg";
import newsKpop from "@/assets/news-kpop.jpg";
import newsManga from "@/assets/news-manga.jpg";

const badgeColors: Record<string, string> = {
  Eventos: "bg-[hsl(var(--badge-eventos))]",
  Cosplay: "bg-[hsl(var(--badge-cosplay))]",
  Quadrinhos: "bg-[hsl(var(--badge-quadrinhos))]",
  "E-sports": "bg-[hsl(var(--badge-quadrinhos))]",
  "K-Pop": "bg-[hsl(var(--badge-dancarina))]",
  Games: "bg-[hsl(var(--badge-ilustrador))]",
};

const allNews = [
  {
    img: newsEvento, badge: "Eventos", date: "22 ABR, 2024",
    title: "Grande Convenção Geek Agita Belém",
    summary: "Milhares de fãs se reuniram no Centro de Convenções Vasco Vasques para o maior encontro de cultura pop da região Norte. O evento contou com painéis de dubladores, área de jogos retro e uma praça de alimentação temática.",
  },
  {
    img: newsCosplay, badge: "Cosplay", date: "20 ABR, 2024",
    title: "Cosplay de Luxo em Destaque na Amazônia",
    summary: "Cosplayers profissionais da região amazônica estão ganhando destaque nacional com produções de altíssima qualidade. A cena local cresce a cada evento, com artesãos especializados em armaduras e próteses.",
  },
  {
    img: newsQuadrinhos, badge: "Quadrinhos", date: "18 ABR, 2024",
    title: "Novas HQs da Marvel Chegam às Lojas",
    summary: "As lojas especializadas de Manaus receberam os lançamentos mais aguardados da Marvel Comics. Destaque para a nova fase de X-Men e a saga Homem-Aranha 2099.",
  },
  {
    img: newsConvention, badge: "Eventos", date: "15 ABR, 2024",
    title: "Festival Noturno Pop Culture Reúne 5 Mil Pessoas",
    summary: "A primeira edição do festival noturno de cultura pop surpreendeu com a presença massiva do público. Food trucks, DJs tocando trilhas de anime e uma área de realidade virtual foram os destaques.",
  },
  {
    img: newsEsports, badge: "E-sports", date: "12 ABR, 2024",
    title: "Torneio Regional de Valorant Define Campeão",
    summary: "A equipe Jaguar Esports, formada inteiramente por jogadores do Amazonas, venceu o campeonato regional de Valorant e garantiu vaga no circuito nacional. A final foi transmitida ao vivo para mais de 15 mil espectadores.",
  },
  {
    img: newsKpop, badge: "K-Pop", date: "10 ABR, 2024",
    title: "Grupos de Cover Dance Lotam Praça da Saudade",
    summary: "O encontro mensal de K-Pop em Manaus bateu recorde de público com apresentações de 12 grupos de cover dance. O evento também contou com feira de photocards e workshops de coreografia.",
  },
  {
    img: newsManga, badge: "Quadrinhos", date: "8 ABR, 2024",
    title: "Artista Manauara Lança Mangá Autoral na CCXP",
    summary: "O quadrinista Alexandre Nascimento, natural de Manaus, apresentou seu mangá 'Guardiões da Floresta' na CCXP. A obra mistura mitologia amazônica com elementos de mangá shonen e já tem editora confirmada.",
  },
];

const Noticias = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="pt-28 pb-20 px-6 md:px-12 max-w-7xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold mb-2 animate-fade-up">Notícias</h1>
        <p className="text-muted-foreground mb-10 animate-fade-up-delay-1">
          Fique por dentro de tudo que acontece no universo geek, anime, games e cosplay da Amazônia.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allNews.map((item, i) => (
            <article
              key={i}
              className="bg-card rounded-xl overflow-hidden card-hover cursor-pointer group animate-fade-up"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <img src={item.img} alt={item.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <span className={`absolute bottom-3 left-3 ${badgeColors[item.badge]} text-primary-foreground text-xs font-semibold px-3 py-1 rounded-md`}>
                  {item.badge}
                </span>
              </div>
              <div className="p-5">
                <p className="text-muted-foreground text-xs uppercase tracking-wider mb-2">{item.date}</p>
                <h3 className="font-bold text-base leading-snug mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3">{item.summary}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default Noticias;
