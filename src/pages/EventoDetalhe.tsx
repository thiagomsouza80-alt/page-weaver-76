import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Loader2, ArrowLeft, CalendarDays, MapPin, QrCode, ShieldCheck, User2, ExternalLink } from "lucide-react";
import EuVouButton from "@/components/EuVouButton";
import ShareButtons from "@/components/ShareButtons";
import TicketRedeemButton from "@/components/tickets/TicketRedeemButton";
import EventCheckin from "@/components/events/EventCheckin";
import EventGallery from "@/components/events/EventGallery";
import EventAddonsShowcase from "@/components/events/EventAddonsShowcase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Tables } from "@/integrations/supabase/types";

type Event = Tables<"events">;

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("pt-BR", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

const buildMapEmbed = (item: Event) => {
  const url = (item as any).google_maps_url as string | null;
  if (url && url.trim()) {
    // If user pasted an <iframe> src or full google maps URL, adapt to embed
    if (url.includes("/embed")) return url;
    // Fallback: use search-style embed with the URL as q
    return `https://www.google.com/maps?q=${encodeURIComponent(url)}&output=embed`;
  }
  const lat = (item as any).latitude as number | null;
  const lng = (item as any).longitude as number | null;
  if (lat != null && lng != null) {
    return `https://www.google.com/maps?q=${lat},${lng}&z=15&output=embed`;
  }
  if (item.location) {
    return `https://www.google.com/maps?q=${encodeURIComponent(item.location)}&output=embed`;
  }
  return null;
};

const EventoDetalhe = () => {
  const { slug } = useParams();
  const [item, setItem] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [isValidator, setIsValidator] = useState(false);
  const [organizer, setOrganizer] = useState<{ name: string; logo_url: string | null } | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("events").select("*").eq("slug", slug).single();
      setItem(data);
      if (data) {
        const { data: sess } = await supabase.auth.getSession();
        const uid = sess.session?.user.id;
        if (uid) {
          const { data: v } = await supabase
            .from("event_validators" as any)
            .select("id")
            .eq("event_id", data.id)
            .eq("user_id", uid)
            .eq("status", "active")
            .maybeSingle();
          setIsValidator(!!v);
        }
        if ((data as any).organizer_id) {
          const { data: org } = await supabase
            .from("organizers" as any)
            .select("name, logo_url")
            .eq("id", (data as any).organizer_id)
            .maybeSingle();
          if (org) setOrganizer(org as any);
        }
      }
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

  const mapEmbed = buildMapEmbed(item);
  const refundPolicy = (item as any).refund_policy as string | null;
  const ticketsEnabled = (item as any).tickets_enabled;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-20 pb-32 lg:pb-16 px-4 sm:px-6 max-w-6xl mx-auto">
        <Link to="/eventos" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mb-4">
          <ArrowLeft className="h-4 w-4" /> Voltar aos eventos
        </Link>

        {/* Hero image */}
        {item.image_url && (
          <div className="aspect-video rounded-xl overflow-hidden mb-6">
            <img
              src={item.image_url}
              alt={item.title}
              className="w-full h-full object-cover"
              style={{ objectPosition: (item as any).image_position || "center" }}
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-8">
          {/* Main column */}
          <article className="min-w-0">
            <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">{item.title}</h1>

            <div className="flex flex-wrap gap-3 mb-6">
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground bg-secondary px-3 py-1.5 rounded-lg">
                <CalendarDays className="h-4 w-4 text-primary" />
                {formatDate(item.event_date)}
              </span>
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground bg-secondary px-3 py-1.5 rounded-lg">
                <MapPin className="h-4 w-4 text-primary" />
                {item.location}
              </span>
            </div>

            {/* Map */}
            {mapEmbed && (
              <section className="mb-8">
                <div className="rounded-xl overflow-hidden border border-border">
                  <iframe
                    src={mapEmbed}
                    className="w-full h-64 md:h-80"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title={`Mapa: ${item.location}`}
                  />
                </div>
                {(item as any).google_maps_url && (
                  <a
                    href={(item as any).google_maps_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                  >
                    Abrir no Google Maps <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </section>
            )}

            {/* Organizer */}
            {organizer && (
              <section className="mb-8">
                <h2 className="text-xl font-bold mb-3">Organizador</h2>
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    {organizer.logo_url ? (
                      <img src={organizer.logo_url} alt={organizer.name} className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                        <User2 className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground">Realização</p>
                      <p className="font-semibold">{organizer.name}</p>
                    </div>
                  </CardContent>
                </Card>
              </section>
            )}

            {/* Description */}
            <section className="mb-8">
              <h2 className="text-xl font-bold mb-3">Sobre o evento</h2>
              <p className="text-lg text-muted-foreground mb-4">{item.description}</p>
              <div className="prose prose-invert max-w-none text-foreground/85 leading-relaxed whitespace-pre-wrap">
                {item.content}
              </div>
            </section>

            {/* Addons showcase */}
            <EventAddonsShowcase eventId={item.id} />

            {/* Refund policy */}
            {refundPolicy && (
              <section className="mb-10">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-bold">Política de Reembolso</h2>
                </div>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-foreground/85 whitespace-pre-wrap leading-relaxed">{refundPolicy}</p>
                  </CardContent>
                </Card>
              </section>
            )}

            <EventCheckin eventId={item.id} eventDate={item.event_date} />
            <EventGallery eventId={item.id} />
          </article>

          {/* Sidebar — sticky on desktop */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-4">
              <Card className="border-primary/30">
                <CardContent className="p-5 space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Quando</p>
                    <p className="font-semibold text-sm">{formatDate(item.event_date)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Onde</p>
                    <p className="font-semibold text-sm">{item.location}</p>
                  </div>

                  <div className="pt-2 space-y-3 border-t border-border">
                    {ticketsEnabled && (
                      <TicketRedeemButton
                        eventId={item.id}
                        eventTitle={item.title}
                        eventDate={item.event_date}
                        eventLocation={item.location}
                      />
                    )}
                    <EuVouButton eventId={item.id} />
                    {isValidator && (
                      <Link to={`/validador/eventos/${item.id}`} className="block">
                        <Button variant="secondary" className="gap-2 w-full">
                          <QrCode className="h-4 w-4" /> Validar Ingressos
                        </Button>
                      </Link>
                    )}
                    <ShareButtons label="Compartilhar evento" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile sticky CTA */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur border-t border-border p-3 shadow-lg">
        <div className="max-w-6xl mx-auto flex flex-col gap-2">
          {ticketsEnabled ? (
            <TicketRedeemButton
              eventId={item.id}
              eventTitle={item.title}
              eventDate={item.event_date}
              eventLocation={item.location}
            />
          ) : (
            <EuVouButton eventId={item.id} />
          )}
          <div className="flex gap-2 justify-center">
            <ShareButtons label="Compartilhar" />
            {isValidator && (
              <Link to={`/validador/eventos/${item.id}`}>
                <Button variant="secondary" size="sm" className="gap-1.5">
                  <QrCode className="h-4 w-4" /> Validar
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default EventoDetalhe;
