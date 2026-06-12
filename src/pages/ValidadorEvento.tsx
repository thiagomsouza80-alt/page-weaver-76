import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ContinuousScanner from "@/components/tickets/ContinuousScanner";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, CalendarDays, MapPin } from "lucide-react";

const ValidadorEvento = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<any>(null);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      if (!id) { navigate("/validador"); return; }

      const { data: assign } = await supabase
        .from("event_validators" as any)
        .select("id, status, starts_at, ends_at")
        .eq("user_id", user.id)
        .eq("event_id", id)
        .maybeSingle();

      const now = Date.now();
      const ok = !!assign
        && (assign as any).status === "active"
        && new Date((assign as any).starts_at).getTime() <= now
        && (!((assign as any).ends_at) || new Date((assign as any).ends_at).getTime() >= now);

      setAuthorized(ok);
      if (ok) {
        const { data: ev } = await supabase
          .from("events")
          .select("id, title, event_date, location, image_url")
          .eq("id", id)
          .maybeSingle();
        setEvent(ev);
      }
      setLoading(false);
    };
    load();
  }, [id, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 px-4 sm:px-6 max-w-3xl mx-auto">
        <Link to="/validador">
          <Button variant="ghost" size="sm" className="gap-2 mb-4">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
        </Link>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : !authorized || !event ? (
          <div className="text-center py-16">
            <p className="text-lg font-semibold mb-2">Acesso não autorizado</p>
            <p className="text-sm text-muted-foreground">Você não tem permissão ativa para validar este evento.</p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-bold mb-1">{event.title}</h1>
              <div className="text-sm text-muted-foreground space-y-1">
                <div className="flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5" /> {new Date(event.event_date).toLocaleString("pt-BR")}</div>
                <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> {event.location}</div>
              </div>
            </div>
            <ContinuousScanner eventId={event.id} />
          </>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default ValidadorEvento;
