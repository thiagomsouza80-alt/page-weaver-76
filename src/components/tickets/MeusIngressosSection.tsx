import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { QRCodeSVG } from "qrcode.react";
import { Loader2, Ticket, CalendarDays, MapPin } from "lucide-react";

interface TicketItem {
  id: string;
  code: string;
  qr_token: string;
  status: string;
  event_id: string;
  issued_at: string;
  events?: { title: string; event_date: string; location: string; slug: string } | null;
}

const statusLabel: Record<string, { label: string; cls: string }> = {
  active: { label: "Ativo", cls: "bg-green-500/10 text-green-600 dark:text-green-400" },
  used: { label: "Utilizado", cls: "bg-muted text-muted-foreground" },
  cancelled: { label: "Cancelado", cls: "bg-destructive/10 text-destructive" },
};

const MeusIngressosSection = () => {
  const [items, setItems] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("tickets" as any)
        .select("id, code, qr_token, status, event_id, issued_at, events:event_id(title, event_date, location, slug)")
        .order("issued_at", { ascending: false });
      setItems(((data as any) || []) as TicketItem[]);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="bg-card rounded-xl border border-border/50 p-6">
      <div className="flex items-center gap-2 mb-5">
        <Ticket className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-bold">Meus Ingressos</h3>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          <Ticket className="h-8 w-8 mx-auto mb-2 opacity-40" />
          Você ainda não resgatou nenhum ingresso.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((t) => {
            const s = statusLabel[t.status] || statusLabel.active;
            return (
              <div key={t.id} className="bg-background border border-border/50 rounded-xl p-5 flex flex-col sm:flex-row gap-5 items-center">
                <div className="bg-white p-3 rounded-lg shrink-0">
                  <QRCodeSVG value={t.qr_token} size={120} level="M" />
                </div>
                <div className="flex-1 text-center sm:text-left min-w-0">
                  <h4 className="font-bold truncate">{t.events?.title || "Evento"}</h4>
                  {t.events?.event_date && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 justify-center sm:justify-start mt-1">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {new Date(t.events.event_date).toLocaleString("pt-BR", {
                        day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  )}
                  {t.events?.location && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 justify-center sm:justify-start">
                      <MapPin className="h-3.5 w-3.5" />
                      {t.events.location}
                    </p>
                  )}
                  <p className="text-lg font-bold tracking-widest mt-2">{t.code}</p>
                  <span className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${s.cls}`}>
                    {s.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MeusIngressosSection;
