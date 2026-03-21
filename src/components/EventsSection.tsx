import { CalendarDays, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import event1 from "@/assets/event-1.jpg";
import event2 from "@/assets/event-2.jpg";
import event3 from "@/assets/event-3.jpg";
import event4 from "@/assets/event-4.jpg";

type Event = Tables<"events">;

const fallbackEvents = [
  { img: event1, title: "Amazônia Anime Fest 2024", date: "15 JUN, 2024", location: "Hangar Centro de Convenções, Belém", description: "O maior evento de anime e cosplay do Norte do Brasil.", slug: "" },
  { img: event2, title: "Game Arena Belém", date: "28 JUN, 2024", location: "Arena Guilherme Paraense, Belém", description: "Torneio regional de esports.", slug: "" },
  { img: event3, title: "K-Pop Dance Festival", date: "13 JUL, 2024", location: "Praça da República, Belém", description: "Festival de cover dance com grupos.", slug: "" },
  { img: event4, title: "Workshop de Mangá e HQ", date: "20 JUL, 2024", location: "Biblioteca Pública Arthur Vianna, Belém", description: "Aulas práticas de desenho mangá.", slug: "" },
];

const EventsSection = () => {
  const [dbEvents, setDbEvents] = useState<Event[]>([]);

  useEffect(() => {
    supabase.from("events").select("*").eq("published", true).order("event_date", { ascending: true }).limit(4)
      .then(({ data }) => { if (data) setDbEvents(data); });
  }, []);

  // Completar com fictícios se menos de 4 reais
  type DisplayItem = { type: "real"; data: Event } | { type: "fallback"; data: typeof fallbackEvents[number] };
  const displayEvents: DisplayItem[] = [];

  for (const ev of dbEvents.slice(0, 4)) {
    displayEvents.push({ type: "real", data: ev });
  }
  if (displayEvents.length < 4) {
    const usedTitles = new Set(dbEvents.map(e => e.title.toLowerCase()));
    for (const fb of fallbackEvents) {
      if (displayEvents.length >= 4) break;
      if (!usedTitles.has(fb.title.toLowerCase())) {
        displayEvents.push({ type: "fallback", data: fb });
      }
    }
  }

  return (
    <section className="px-6 md:px-12 py-16 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl md:text-3xl font-bold">Próximos Eventos</h2>
        <Link to="/eventos"><Button variant="ghost" className="text-primary text-sm font-semibold">Ver todos →</Button></Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {displayEvents.map((item, i) => {
          if (item.type === "fallback") {
            const ev = item.data;
            return (
              <article key={`fb-${i}`} className="bg-card rounded-xl overflow-hidden card-hover cursor-pointer group flex flex-col sm:flex-row">
                <div className="relative sm:w-56 shrink-0 aspect-video sm:aspect-auto overflow-hidden">
                  <img src={ev.img} alt={ev.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                </div>
                <div className="p-5 flex flex-col justify-center gap-2">
                  <h3 className="font-bold text-base md:text-lg leading-snug">{ev.title}</h3>
                  <p className="text-muted-foreground text-xs leading-relaxed line-clamp-2">{ev.description}</p>
                  <div className="flex flex-col gap-1 mt-1">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5 text-primary" />{ev.date}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 text-primary" />{ev.location}
                    </span>
                  </div>
                </div>
              </article>
            );
          }
          const ev = item.data;
          return (
            <Link to={`/eventos/${ev.slug}`} key={ev.id}>
              <article className="bg-card rounded-xl overflow-hidden card-hover cursor-pointer group flex flex-col sm:flex-row">
                <div className="relative sm:w-56 shrink-0 aspect-video sm:aspect-auto overflow-hidden">
                  {ev.image_url ? (
                    <img src={ev.image_url} alt={ev.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full bg-secondary" />
                  )}
                </div>
                <div className="p-5 flex flex-col justify-center gap-2">
                  <h3 className="font-bold text-base md:text-lg leading-snug">{ev.title}</h3>
                  <p className="text-muted-foreground text-xs leading-relaxed line-clamp-2">{ev.description}</p>
                  <div className="flex flex-col gap-1 mt-1">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5 text-primary" />
                      {new Date(ev.event_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase()}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 text-primary" />{ev.location}
                    </span>
                  </div>
                </div>
              </article>
            </Link>
          );
        })}
      </div>
    </section>
  );
};

export default EventsSection;
