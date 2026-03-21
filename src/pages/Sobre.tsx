import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import aboutHero from "@/assets/about-hero.jpg";
import logoOficial from "@/assets/logo-oficial.png";
import { Gamepad2, Palette, Music, BookOpen, Users, Star } from "lucide-react";

const pillars = [
  { icon: Gamepad2, title: "Games & E-sports", desc: "Cobertura de torneios, reviews e a cena competitiva da região Norte." },
  { icon: Palette, title: "Arte & Cosplay", desc: "Destaque para artistas visuais, cosplayers e criadores de conteúdo da Amazônia." },
  { icon: Music, title: "K-Pop & Dança", desc: "A vibrante comunidade de K-Pop e cover dance de Belém, Ananindeua e Marituba." },
  { icon: BookOpen, title: "Quadrinhos & Mangá", desc: "HQs nacionais, mangás autorais e a cena independente amazônica." },
  { icon: Users, title: "Comunidade", desc: "Conectando fãs, artistas e organizadores de eventos de toda a região." },
  { icon: Star, title: "Eventos", desc: "Agenda completa de convenções, workshops e encontros geek da Amazônia." },
];

const stats = [
  { value: "15k+", label: "Seguidores nas redes" },
  { value: "47", label: "Artistas cadastrados" },
  { value: "120+", label: "Eventos cobertos" },
  { value: "8", label: "Cidades alcançadas" },
];

const Sobre = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-20">
        <div className="relative h-64 md:h-80 overflow-hidden">
          <img src={aboutHero} alt="Amazônia" className="w-full h-full object-cover" />
          <div className="absolute inset-0 hero-overlay" />
          <div className="absolute inset-0 flex items-center justify-center">
            <img src={logoOficial} alt="Amazônia Pop" className="w-56 md:w-72 drop-shadow-2xl animate-fade-up" />
          </div>
        </div>
      </section>

      {/* Missão */}
      <section className="px-6 md:px-12 py-16 max-w-4xl mx-auto text-center">
        <h1 className="text-3xl md:text-4xl font-bold mb-6 animate-fade-up">Sobre o Amazônia Pop</h1>
        <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-6 animate-fade-up-delay-1">
          O <strong className="text-foreground">Amazônia Pop</strong> é o principal HUB digital de cultura pop, anime, games e eventos geek da região amazônica. 
          Nascemos da paixão pela cultura nerd e da vontade de dar visibilidade aos talentos e eventos que movimentam a cena geek no Norte do Brasil.
        </p>
        <p className="text-muted-foreground text-base md:text-lg leading-relaxed animate-fade-up-delay-2">
          Nossa missão é <strong className="text-foreground">conectar a comunidade geek amazônica</strong>, promovendo artistas locais, cobrindo eventos, 
          divulgando notícias e criando um espaço onde fãs de anime, cosplay, games, K-Pop e quadrinhos possam se encontrar e celebrar o que amam.
        </p>
      </section>

      {/* Números */}
      <section className="px-6 md:px-12 py-12 max-w-5xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <div key={i} className="bg-card rounded-xl p-6 text-center card-hover animate-fade-up">
              <p className="text-3xl md:text-4xl font-bold text-gradient-hero mb-1">{stat.value}</p>
              <p className="text-muted-foreground text-sm">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pilares */}
      <section className="px-6 md:px-12 py-16 max-w-6xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold mb-10 text-center animate-fade-up">O Que Cobrimos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {pillars.map((pillar, i) => (
            <div key={i} className="bg-card rounded-xl p-6 card-hover group animate-fade-up">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <pillar.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-bold text-base mb-2">{pillar.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{pillar.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 md:px-12 py-16 max-w-4xl mx-auto text-center">
        <div className="bg-card rounded-2xl p-10 animate-fade-up">
          <h2 className="text-2xl font-bold mb-3">Faça Parte da Comunidade</h2>
          <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
            Seja você artista, organizador de eventos ou simplesmente um fã, o Amazônia Pop é o seu lugar. 
            Siga nossas redes sociais e fique por dentro de tudo!
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <a href="#" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-semibold text-sm hover:bg-primary/80 transition-all active:scale-[0.97]">
              Instagram
            </a>
            <a href="#" className="inline-flex items-center gap-2 border-2 border-foreground/30 text-foreground px-6 py-2.5 rounded-full font-semibold text-sm hover:border-foreground/60 transition-all active:scale-[0.97]">
              YouTube
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Sobre;
