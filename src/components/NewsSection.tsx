import { Link } from "react-router-dom";
import newsEvento from "@/assets/news-evento.jpg";
import newsCosplay from "@/assets/news-cosplay.jpg";
import newsQuadrinhos from "@/assets/news-quadrinhos.jpg";

const badgeColors: Record<string, string> = {
  Eventos: "bg-[hsl(var(--badge-eventos))]",
  Cosplay: "bg-[hsl(var(--badge-cosplay))]",
  Quadrinhos: "bg-[hsl(var(--badge-quadrinhos))]",
};

const news = [
  { img: newsEvento, badge: "Eventos", date: "22 ABR, 2024", title: "Grande Convenção Geek Agita Manaus" },
  { img: newsCosplay, badge: "Cosplay", date: "22 ABR, 2024", title: "Cosplay de Luxo em Destaque na Amazônia" },
  { img: newsQuadrinhos, badge: "Quadrinhos", date: "22 ABR, 2024", title: "Novas HQs da Marvel Chegam às Lojas" },
];

const NewsSection = () => {
  return (
    <section className="px-6 md:px-12 py-16 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl md:text-3xl font-bold">Últimas Notícias</h2>
        <Link to="/noticias" className="text-primary text-sm font-semibold hover:underline">Ver todas →</Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {news.map((item, i) => (
          <article
            key={i}
            className={`bg-card rounded-xl overflow-hidden card-hover cursor-pointer group animate-fade-up-delay-${i + 1}`}
          >
            <div className="relative aspect-[4/3] overflow-hidden">
              <img src={item.img} alt={item.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
              <span className={`absolute bottom-3 left-3 ${badgeColors[item.badge]} text-primary-foreground text-xs font-semibold px-3 py-1 rounded-md`}>
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
