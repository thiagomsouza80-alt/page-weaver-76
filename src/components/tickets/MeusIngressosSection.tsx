import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Ticket, RotateCcw, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import TicketCard from "./TicketCard";
import RefundRequestDialog from "./RefundRequestDialog";

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

interface RefundRow {
  id: string;
  ticket_id: string;
  status: string;
  decision_reason?: string | null;
}

const REFUND_WINDOW_DAYS = 7;

const MeusIngressosSection = () => {
  const [items, setItems] = useState<TicketItem[]>([]);
  const [refunds, setRefunds] = useState<Record<string, RefundRow>>({});
  const [loading, setLoading] = useState(true);
  const [refundFor, setRefundFor] = useState<TicketItem | null>(null);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const [{ data: tk }, { data: rf }] = await Promise.all([
      supabase
        .from("tickets" as any)
        .select(
          "id, code, qr_token, status, event_id, issued_at, holder_name, events:event_id(title, event_date, location, slug)"
        )
        .order("issued_at", { ascending: false }),
      user
        ? supabase
            .from("refund_requests" as any)
            .select("id, ticket_id, status, decision_reason")
            .eq("user_id", user.id)
        : Promise.resolve({ data: [] as any }),
    ]);
    const map: Record<string, RefundRow> = {};
    ((rf as any) || []).forEach((r: RefundRow) => {
      map[r.ticket_id] = r;
    });
    setRefunds(map);
    setItems(((tk as any) || []) as TicketItem[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const isEligible = (t: TicketItem) => {
    if (t.status !== "active") return false;
    if (refunds[t.id] && ["pending", "approved", "paid"].includes(refunds[t.id].status)) return false;
    const date = t.events?.event_date ? new Date(t.events.event_date) : null;
    if (!date) return false;
    const limit = Date.now() + REFUND_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    return date.getTime() > limit;
  };

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
            const refund = refunds[t.id];
            return (
              <div key={t.id} className="space-y-2">
                <TicketCard
                  code={t.code}
                  qrToken={t.qr_token}
                  status={t.status}
                  holderName={t.holder_name}
                  eventTitle={t.events?.title}
                  eventDate={t.events?.event_date}
                  eventLocation={t.events?.location}
                  issuedAt={t.issued_at}
                />
                {refund ? (
                  <div className="text-xs px-3 py-2 rounded-lg bg-secondary/60 border border-border/60 flex items-start gap-2">
                    <Clock className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                    <div>
                      <strong className="text-foreground">Reembolso:</strong>{" "}
                      {refund.status === "pending" && "em análise pela equipe."}
                      {refund.status === "approved" && "aprovado — aguardando pagamento via PIX."}
                      {refund.status === "paid" && "pago. Verifique sua conta PIX."}
                      {refund.status === "rejected" && (
                        <>recusado.{refund.decision_reason ? ` Motivo: ${refund.decision_reason}` : ""}</>
                      )}
                    </div>
                  </div>
                ) : (
                  isEligible(t) && (
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => setRefundFor(t)}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Solicitar reembolso
                      </Button>
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}

      {refundFor && (
        <RefundRequestDialog
          open={!!refundFor}
          onOpenChange={(v) => !v && setRefundFor(null)}
          ticketId={refundFor.id}
          eventTitle={refundFor.events?.title}
          onCreated={load}
        />
      )}
    </div>
  );
};

export default MeusIngressosSection;
