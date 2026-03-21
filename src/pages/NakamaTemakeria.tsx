import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { MapPin, Clock, Phone, Instagram, UtensilsCrossed, Soup, IceCream, Wine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import heroImg from "@/assets/biz-temakeria-hero.jpg";
import thumbImg from "@/assets/biz-temakeria.jpg";

const menu = [
  { icon: Soup, name: "Ramen & Lámen", desc: "Caldos artesanais com chashu de porco, ovo marinado e noodles frescos. Destaque para o Ramen Naruto e o Lámen Picante do Inferno." },
  { icon: UtensilsCrossed, name: "Temakis & Sushi", desc: "Temakis criativos como o 'Titan Roll' e o 'Pikachu Maki', além do cardápio clássico com sashimis e combinados." },
  { icon: IceCream, name: "Sobremesas Otaku", desc: "Mochis artesanais, taiyaki recheado, dorayaki e sorvetes com sabores japoneses como matcha e yuzu." },
  { icon: Wine, name: "Drinks Temáticos", desc: "Coquetéis e mocktails inspirados em animes: Poção de Cura, Elixir Sharingan, Suco do Senzu Bean." },
];

const NakamaTemakeria = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="relative pt-20">
        <div className="relative h-64 md:h-96 overflow-hidden">
          <img src={heroImg} alt="Nakama Temakeria & Ramen" className="w-full h-full object-cover" />
          <div className="absolute inset-0 hero-overlay" />
          <div className="absolute inset-0 flex items-end p-8 md:p-12">
            <div className="animate-fade-up">
              <span className="bg-[hsl(var(--badge-eventos))] text-primary-foreground text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-md">Gastronomia</span>
              <h1 className="text-3xl md:text-5xl font-bold mt-3 leading-tight" style={{ lineHeight: "1.1" }}>Nakama Temakeria & Ramen</h1>
              <p className="text-foreground/70 mt-2 max-w-lg">Onde a culinária japonesa encontra o universo otaku</p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 md:px-12 py-12 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <div className="animate-fade-up">
              <h2 className="text-2xl font-bold mb-4">Sobre o Restaurante</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                O <strong className="text-foreground">Nakama Temakeria & Ramen</strong> nasceu da ideia de unir duas paixões: 
                a gastronomia japonesa e a cultura otaku. Inaugurado em 2022 no coração de Ananindeua, o restaurante se tornou 
                rapidamente o point da comunidade geek para quem busca uma experiência gastronômica diferenciada.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4">
                O ambiente é decorado com pôsteres de anime clássicos, figuras em vitrines iluminadas e lanternas japonesas. 
                Cada mesa tem um tablet com catálogo de mangás digitais para ler enquanto espera o pedido. A trilha sonora 
                alterna entre lo-fi anime beats e openings clássicas.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                O cardápio foi desenvolvido pelo chef Takeshi Yamamoto, que morou 8 anos no Japão e trouxe receitas autênticas 
                de Tóquio e Osaka, adaptadas com ingredientes regionais da Amazônia. O resultado são pratos como o Ramen de 
                Tucupi e o Temaki de Pirarucu, que se tornaram assinaturas da casa.
              </p>
            </div>

            <div className="animate-fade-up-delay-1">
              <h2 className="text-2xl font-bold mb-6">Cardápio em Destaque</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {menu.map((p, i) => (
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

          <div className="space-y-6 animate-fade-up-delay-2">
            <div className="bg-card rounded-xl overflow-hidden">
              <img src={thumbImg} alt="Interior do restaurante" className="w-full aspect-video object-cover" />
              <div className="p-5 space-y-4">
                <h3 className="font-bold text-base">Informações</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <p className="text-sm text-muted-foreground">Av. Augusto Montenegro, 723 — Coqueiro, Ananindeua/PA</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <p className="text-sm text-muted-foreground">Ter a Dom: 11h30 – 15h / 18h – 23h<br />Segunda: Fechado</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Phone className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <p className="text-sm text-muted-foreground">(91) 98765-4321</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Instagram className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <p className="text-sm text-muted-foreground">@nakama.temakeria</p>
                  </div>
                </div>
              </div>
            </div>

            <Link to="/contato">
              <Button variant="hero" size="lg" className="w-full">Fazer Reserva</Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default NakamaTemakeria;
