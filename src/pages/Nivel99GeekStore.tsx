import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { MapPin, Clock, Phone, Instagram, Star, ShoppingBag, Gamepad2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import heroImg from "@/assets/biz-geekstore-hero.jpg";
import thumbImg from "@/assets/biz-geekstore.jpg";

const products = [
  { icon: ShoppingBag, name: "Action Figures", desc: "Figures de anime, Marvel, DC e games das melhores marcas como Bandai, Good Smile e Kotobukiya." },
  { icon: BookOpen, name: "Mangás & HQs", desc: "Acervo com mais de 3.000 títulos entre mangás, comics americanos e quadrinhos nacionais." },
  { icon: Gamepad2, name: "Games & Retro", desc: "Jogos novos e retro, consoles, acessórios e uma área de free play com arcade." },
  { icon: Star, name: "Colecionáveis", desc: "Funko Pops, cards de Pokémon e Yu-Gi-Oh!, keychains, posters e itens exclusivos de importação." },
];

const Nivel99GeekStore = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-20">
        <div className="relative h-64 md:h-96 overflow-hidden">
          <img src={heroImg} alt="Nível 99 Geek Store" className="w-full h-full object-cover" />
          <div className="absolute inset-0 hero-overlay" />
          <div className="absolute inset-0 flex items-end p-8 md:p-12">
            <div className="animate-fade-up">
              <span className="bg-[hsl(var(--badge-quadrinhos))] text-primary-foreground text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-md">Loja Geek</span>
              <h1 className="text-3xl md:text-5xl font-bold mt-3 leading-tight" style={{ lineHeight: "1.1" }}>Nível 99 Geek Store</h1>
              <p className="text-foreground/70 mt-2 max-w-lg">A maior loja de cultura pop, anime e games de Belém</p>
            </div>
          </div>
        </div>
      </section>

      {/* Info */}
      <section className="px-6 md:px-12 py-12 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <div className="animate-fade-up">
              <h2 className="text-2xl font-bold mb-4">Sobre a Loja</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                A <strong className="text-foreground">Nível 99 Geek Store</strong> é referência em cultura pop na região Norte do Brasil. 
                Fundada em 2019 por dois amigos apaixonados por anime e games, a loja começou como um pequeno box em um shopping 
                de Manaus e rapidamente se tornou o ponto de encontro da comunidade geek local.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Com um acervo de mais de 5.000 produtos entre action figures, mangás, HQs, jogos, cards colecionáveis e acessórios, 
                a Nível 99 se destaca pela curadoria cuidadosa e por trazer itens de importação exclusivos que antes só eram 
                encontrados em São Paulo ou Rio de Janeiro.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                A loja também promove eventos mensais como torneios de card games, sessões de autógrafo com artistas locais, 
                lançamentos de mangás e noites temáticas. O espaço conta com uma área de free play com consoles retro e 
                modernos, onde clientes podem testar jogos antes de comprar.
              </p>
            </div>

            <div className="animate-fade-up-delay-1">
              <h2 className="text-2xl font-bold mb-6">O Que Você Encontra</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {products.map((p, i) => (
                  <div key={i} className="bg-card rounded-xl p-5 card-hover group">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                      <p.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-bold text-sm mb-1">{p.name}</h3>
                    <p className="text-muted-foreground text-xs leading-relaxed">{p.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6 animate-fade-up-delay-2">
            <div className="bg-card rounded-xl overflow-hidden">
              <img src={thumbImg} alt="Interior da loja" className="w-full aspect-video object-cover" />
              <div className="p-5 space-y-4">
                <h3 className="font-bold text-base">Informações</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <p className="text-sm text-muted-foreground">Shopping Bosque Grão-Pará, Piso L2, Loja 247 — Marco, Belém/PA</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <p className="text-sm text-muted-foreground">Seg a Sáb: 10h – 22h<br />Dom: 12h – 20h</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Phone className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <p className="text-sm text-muted-foreground">(92) 99234-5678</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Instagram className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <p className="text-sm text-muted-foreground">@nivel99geekstore</p>
                  </div>
                </div>
              </div>
            </div>

            <Link to="/contato">
              <Button variant="hero" size="lg" className="w-full">Entrar em Contato</Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Nivel99GeekStore;
