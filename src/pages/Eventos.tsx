import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CalendarDays, MapPin, Clock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import event1 from "@/assets/event-1.jpg";
import event2 from "@/assets/event-2.jpg";
import event3 from "@/assets/event-3.jpg";
import event4 from "@/assets/event-4.jpg";
import newsConvention from "@/assets/news-convention.jpg";
import newsEsports from "@/assets/news-esports.jpg";
import newsKpop from "@/assets/news-kpop.jpg";

const badgeColor: Record<string, string> = {
  Destaque: "bg-[hsl(var(--badge-eventos))]",
  "E-sports": "bg-[hsl(var(--badge-quadrinhos))]",
  "K-Pop": "bg-[hsl(var(--badge-dancarina))]",
  Workshop: "bg-[hsl(var(--badge-cosplay))]",
  Festival: "bg-[hsl(var(--badge-ilustrador))]",
  Torneio: "bg-[hsl(var(--badge-quadrinhos))]",
};

const allEvents = [
  {
    img: event1, title: "Amazônia Anime Fest 2024", date: "15 JUN, 2024",
    time: "10h às 22h", location: "Hangar Centro de Convenções, Belém",
    description: "O maior evento de anime e cosplay do Norte do Brasil. Painéis com dubladores famosos, concurso de cosplay com prêmios de até R$ 5.000, área de jogos retro, Artist Alley com mais de 50 artistas locais, e convidados especiais do cenário nacional de anime.",
    badge: "Destaque", capacity: "5.000 pessoas",
  },
  {
    img: event2, title: "Game Arena Belém", date: "28 JUN, 2024",
    time: "14h às 23h", location: "Arena Guilherme Paraense, Belém",
    description: "Torneio regional de esports com competições de League of Legends, Valorant e FIFA. Prêmios totais de R$ 20.000 distribuídos entre as categorias. Área de free play, PCs de última geração e transmissão ao vivo nos telões.",
    badge: "E-sports", capacity: "3.000 pessoas",
  },
  {
    img: event3, title: "K-Pop Dance Festival", date: "13 JUL, 2024",
    time: "16h às 22h", location: "Praça da República, Belém",
    description: "Festival de cover dance com grupos de todo o Pará. Shows ao vivo, batalhas de dança, feira de photocards e álbuns, workshops de coreografia com dançarinos profissionais e área de fandom com decoração temática.",
    badge: "K-Pop", capacity: "2.500 pessoas",
  },
  {
    img: event4, title: "Workshop de Mangá e HQ", date: "20 JUL, 2024",
    time: "9h às 17h", location: "Biblioteca Pública Arthur Vianna, Belém",
    description: "Aulas práticas de desenho mangá e criação de quadrinhos com artistas profissionais. O workshop cobre desde técnicas básicas de anatomia até narrativa visual e publicação independente. Material incluso.",
    badge: "Workshop", capacity: "120 vagas",
  },
  {
    img: newsConvention, title: "Noite Geek Ananindeua", date: "3 AGO, 2024",
    time: "19h às 3h", location: "Centro Cultural de Ananindeua",
    description: "Evento noturno de cultura pop com food trucks temáticos, DJ sets com trilhas de anime e games, área de VR gaming, cosplay contest noturno e lounge para encontros da comunidade. Edição especial de 1 ano.",
    badge: "Festival", capacity: "4.000 pessoas",
  },
  {
    img: newsEsports, title: "Copa Norte de Valorant", date: "17 AGO, 2024",
    time: "10h às 20h", location: "Arena Guilherme Paraense, Belém",
    description: "A maior competição de Valorant do Norte do Brasil, reunindo equipes do Pará, Amazonas, Roraima e Amapá. O campeão garante vaga direta no circuito nacional e premiação de R$ 15.000.",
    badge: "Torneio", capacity: "2.000 pessoas",
  },
  {
    img: newsKpop, title: "Marituba K-Culture Fest", date: "7 SET, 2024",
    time: "14h às 23h", location: "Centro de Eventos de Marituba",
    description: "Festival completo de cultura coreana com shows de cover dance, concurso de canto K-Pop, workshops de culinária coreana, aulas de idioma, feira de produtos importados e área de fotos temáticas.",
    badge: "K-Pop", capacity: "3.500 pessoas",
  },
];

const Eventos = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="pt-28 pb-20 px-6 md:px-12 max-w-7xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold mb-2 animate-fade-up">Eventos</h1>
        <p className="text-muted-foreground mb-10 animate-fade-up-delay-1">
          Confira a agenda completa de eventos geek, anime, games e cultura pop na Amazônia.
        </p>

        <div className="space-y-6">
          {allEvents.map((event, i) => (
            <article key={i} className="bg-card rounded-xl overflow-hidden card-hover group flex flex-col md:flex-row animate-fade-up">
              <div className="relative md:w-80 shrink-0 aspect-video md:aspect-auto overflow-hidden">
                <img src={event.img} alt={event.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <span className={`absolute top-3 left-3 ${badgeColor[event.badge]} text-primary-foreground text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md`}>
                  {event.badge}
                </span>
              </div>
              <div className="p-6 flex flex-col justify-center gap-3 flex-1">
                <h3 className="font-bold text-lg md:text-xl leading-snug">{event.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{event.description}</p>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5 text-primary" />{event.date}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5 text-primary" />{event.time}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 text-primary" />{event.location}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Users className="h-3.5 w-3.5 text-primary" />{event.capacity}
                  </span>
                </div>
                <Button variant="hero" size="sm" className="w-fit mt-2">Saiba Mais</Button>
              </div>
            </article>
          ))}
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default Eventos;
