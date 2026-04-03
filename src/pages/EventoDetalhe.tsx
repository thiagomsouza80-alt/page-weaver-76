import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Loader2, ArrowLeft, CalendarDays, MapPin } from "lucide-react";
import EuVouButton from "@/components/EuVouButton";
import type { Tables } from "@/integrations/supabase/types";

type Event = Tables<"events">;

const EventoDetalhe = () => {
  const { slug } = useParams();
  const [item, setItem] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("events").select("*").eq("slug", slug).single();
      setItem(data);
      setLoading(false);
    };
    fetch();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 pb-16 px-6 max-w-3xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">Evento não encontrado</h1>
          <Link to="/eventos" className="text-primary hover:underline">← Voltar aos eventos</Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <article className="pt-24 pb-16 px-6 max-w-3xl mx-auto">
        <Link to="/eventos" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mb-6">
          <ArrowLeft className="h-4 w-4" /> Voltar aos eventos
        </Link>

        {item.image_url && (
          <div className="aspect-video rounded-xl overflow-hidden mb-8">
            <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" style={{ objectPosition: (item as any).image_position || "center" }} />
          </div>
        )}

        <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">{item.title}</h1>

        <div className="flex flex-wrap gap-4 mb-8">
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground bg-secondary px-3 py-1.5 rounded-lg">
            <CalendarDays className="h-4 w-4 text-primary" />
            {new Date(item.event_date).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
          </span>
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground bg-secondary px-3 py-1.5 rounded-lg">
            <MapPin className="h-4 w-4 text-primary" />
            {item.location}
          </span>
        </div>

        <div className="mb-8">
          <EuVouButton eventId={item.id} />
        </div>

        <p className="text-lg text-muted-foreground mb-8">{item.description}</p>

        <div className="prose prose-invert max-w-none text-foreground/85 leading-relaxed whitespace-pre-wrap">
          {item.content}
        </div>
      </article>
      <Footer />
    </div>
  );
};

export default EventoDetalhe;
