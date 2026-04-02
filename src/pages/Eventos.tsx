import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CalendarDays, MapPin, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Event = Tables<"events">;

const Eventos = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      const { data } = await supabase
        .from("events")
        .select("*")
        .eq("published", true)
        .order("event_date", { ascending: true });
      setEvents(data || []);
      setLoading(false);
    };
    fetchEvents();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="pt-28 pb-20 px-6 md:px-12 max-w-7xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold mb-2 animate-fade-up">Eventos</h1>
        <p className="text-muted-foreground mb-10 animate-fade-up-delay-1">
          Confira a agenda completa de eventos geek, anime, games e cultura pop na Amazônia.
        </p>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : events.length === 0 ? (
          <p className="text-muted-foreground text-center py-20">Nenhum evento disponível no momento.</p>
        ) : (
          <div className="space-y-6">
            {events.map((event) => (
              <Link
                key={event.id}
                to={`/eventos/${event.slug}`}
                className="bg-card rounded-xl overflow-hidden card-hover group flex flex-col md:flex-row animate-fade-up block"
              >
                <div className="relative md:w-80 shrink-0 aspect-video md:aspect-auto overflow-hidden">
                  {event.image_url ? (
                    <img src={event.image_url} alt={event.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" style={{ objectPosition: (event as any).image_position || "center" }} />
                  ) : (
                    <div className="w-full h-full bg-secondary flex items-center justify-center min-h-[200px]">
                      <CalendarDays className="h-12 w-12 text-muted-foreground/40" />
                    </div>
                  )}
                </div>
                <div className="p-6 flex flex-col justify-center gap-3 flex-1">
                  <h3 className="font-bold text-lg md:text-xl leading-snug">{event.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3">{event.description}</p>
                  <div className="flex flex-wrap gap-4 mt-2">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5 text-primary" />
                      {new Date(event.event_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5 text-primary" />
                      {new Date(event.event_date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 text-primary" />{event.location}
                    </span>
                  </div>
                  <Button variant="hero" size="sm" className="w-fit mt-2">Saiba Mais</Button>
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

export default Eventos;
