import { CalendarDays, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import event1 from "@/assets/event-1.jpg";
import event2 from "@/assets/event-2.jpg";
import event3 from "@/assets/event-3.jpg";
import event4 from "@/assets/event-4.jpg";

const events = [
  {
    img: event1, title: "Amazônia Anime Fest 2024", date: "15 JUN, 2024",
    location: "Centro de Convenções Vasco Vasques, Manaus",
    description: "O maior evento de anime e cosplay do Norte do Brasil. Painéis, concursos e convidados especiais.",
    badge: "Destaque",
  },
  {
    img: event2, title: "Game Arena Manaus", date: "28 JUN, 2024",
    location: "Arena Poliesportiva, Manaus",
    description: "Torneio regional de esports com competições de League of Legends, Valorant e FIFA.",
    badge: "E-sports",
  },
  {
    img: event3, title: "K-Pop Dance Festival", date: "13 JUL, 2024",
    location: "Praça da Saudade, Manaus",
    description: "Festival de cover dance com grupos de todo o Amazonas. Shows, batalhas e prêmios.",
    badge: "K-Pop",
  },
  {
    img: event4, title: "Workshop de Mangá e HQ", date: "20 JUL, 2024",
    location: "Biblioteca Pública do Amazonas",
    description: "Aulas práticas de desenho mangá e criação de quadrinhos com artistas profissionais.",
    badge: "Workshop",
  },
];

const badgeColor: Record<string, string> = {
  Destaque: "bg-[hsl(var(--badge-eventos))]",
  "E-sports": "bg-[hsl(var(--badge-quadrinhos))]",
  "K-Pop": "bg-[hsl(var(--badge-dancarina))]",
  Workshop: "bg-[hsl(var(--badge-cosplay))]",
};

const EventsSection = () => {
  return (
    <section className="px-6 md:px-12 py-16 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl md:text-3xl font-bold">Próximos Eventos</h2>
        <Link to="/eventos">
          <Button variant="ghost" className="text-primary text-sm font-semibold">Ver todos →</Button>
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {events.map((event, i) => (
          <article key={i} className="bg-card rounded-xl overflow-hidden card-hover cursor-pointer group flex flex-col sm:flex-row">
            <div className="relative sm:w-56 shrink-0 aspect-video sm:aspect-auto overflow-hidden">
              <img src={event.img} alt={event.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
              <span className={`absolute top-3 left-3 ${badgeColor[event.badge]} text-primary-foreground text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md`}>
                {event.badge}
              </span>
            </div>
            <div className="p-5 flex flex-col justify-center gap-2">
              <h3 className="font-bold text-base md:text-lg leading-snug">{event.title}</h3>
              <p className="text-muted-foreground text-xs leading-relaxed line-clamp-2">{event.description}</p>
              <div className="flex flex-col gap-1 mt-1">
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5 text-primary" />{event.date}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 text-primary" />{event.location}
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export default EventsSection;
