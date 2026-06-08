import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Ticket } from "lucide-react";
import TicketCard from "./TicketCard";

interface TicketItem {
  id: string;
  code: string;
  qr_token: string;
  status: string;
  event_id: string;
  issued_at: string;
  holder_name?: string;
  events?: { title: string; event_date: string; location: string; slug: string } | null;
}

const MeusIngressosSection = () => {
  const [items, setItems] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("tickets" as any)
        .select("id, code, qr_token, status, event_id, issued_at, holder_name, events:event_id(title, event_date, location, slug)")
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
          {items.map((t) => (
            <TicketCard
              key={t.id}
              code={t.code}
              qrToken={t.qr_token}
              status={t.status}
              holderName={t.holder_name}
              eventTitle={t.events?.title}
              eventDate={t.events?.event_date}
              eventLocation={t.events?.location}
              issuedAt={t.issued_at}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default MeusIngressosSection;
