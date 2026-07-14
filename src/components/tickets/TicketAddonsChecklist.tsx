import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Package, MapPin, Check, X } from "lucide-react";
import { centsToBRL } from "@/lib/money";

interface Props {
  ticketId: string;
  eventId: string;
  compact?: boolean;
}

interface Addon {
  id: string;
  product_name: string;
  quantity: number;
  unit_price_cents: number;
  delivered: boolean;
  delivered_at: string | null;
  delivered_by: string | null;
  delivered_location: string | null;
  notes: string | null;
}

const TicketAddonsChecklist = ({ ticketId, eventId, compact }: Props) => {
  const [addons, setAddons] = useState<Addon[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [location, setLocation] = useState<string>(() => localStorage.getItem(`addon-loc-${eventId}`) || "");

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("ticket_addons" as any)
      .select("id, product_name, quantity, unit_price_cents, delivered, delivered_at, delivered_by, delivered_location, notes")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });
    setAddons((data as any) || []);
    setLoading(false);
  }, [ticketId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    localStorage.setItem(`addon-loc-${eventId}`, location);
  }, [location, eventId]);

  const toggle = async (addon: Addon, delivered: boolean) => {
    setSavingId(addon.id);
    const { data: { session } } = await supabase.auth.getSession();
    const patch: any = delivered
      ? {
          delivered: true,
          delivered_at: new Date().toISOString(),
          delivered_by: session?.user.id ?? null,
          delivered_location: location || null,
        }
      : {
          delivered: false,
          delivered_at: null,
          delivered_by: null,
          delivered_location: null,
        };
    const { data, error } = await supabase
      .from("ticket_addons" as any)
      .update(patch)
      .eq("id", addon.id)
      .select("id, product_name, quantity, unit_price_cents, delivered, delivered_at, delivered_by, delivered_location, notes")
      .single();
    if (!error && data) {
      setAddons((prev) => prev.map((a) => (a.id === addon.id ? (data as any) : a)));
    }
    setSavingId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
        <Loader2 className="h-3 w-3 animate-spin" /> Carregando adicionais...
      </div>
    );
  }

  if (addons.length === 0) return null;

  const pending = addons.filter((a) => !a.delivered).length;

  return (
    <div className={`rounded-xl border ${pending > 0 ? "border-orange-400 bg-orange-50 dark:bg-orange-950/20" : "border-green-500/40 bg-green-50 dark:bg-green-950/20"} p-3 space-y-3`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Package className="h-4 w-4" />
          Adicionais ({addons.length})
        </div>
        <span className={`text-xs font-medium ${pending > 0 ? "text-orange-700 dark:text-orange-300" : "text-green-700 dark:text-green-300"}`}>
          {pending > 0 ? `${pending} pendente(s)` : "Todos entregues"}
        </span>
      </div>

      {!compact && (
        <div className="flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Local da entrega (ex: Balcão A)"
            className="h-8 text-xs"
          />
        </div>
      )}

      <div className="space-y-2">
        {addons.map((a) => (
          <div
            key={a.id}
            className={`flex items-start justify-between gap-3 rounded-lg border p-2 text-sm ${
              a.delivered ? "bg-white/60 dark:bg-black/20 border-green-300" : "bg-white dark:bg-black/30 border-border"
            }`}
          >
            <label className="flex items-start gap-2 cursor-pointer flex-1 min-w-0">
              <Checkbox
                checked={a.delivered}
                disabled={savingId === a.id}
                onCheckedChange={(v) => toggle(a, !!v)}
                className="mt-0.5"
              />
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">
                  {a.quantity}x {a.product_name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatCents(a.unit_price_cents * a.quantity)}
                  {a.delivered && a.delivered_at && (
                    <> • entregue {new Date(a.delivered_at).toLocaleTimeString("pt-BR")}</>
                  )}
                  {a.delivered && a.delivered_location && <> • {a.delivered_location}</>}
                </div>
              </div>
            </label>
            {savingId === a.id ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
            ) : a.delivered ? (
              <span className="flex items-center gap-1 text-xs text-green-700 dark:text-green-400 shrink-0">
                <Check className="h-3 w-3" /> Entregue
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-orange-700 dark:text-orange-400 shrink-0">
                <X className="h-3 w-3" /> Não entregue
              </span>
            )}
          </div>
        ))}
      </div>

      {pending > 0 && addons.some((a) => !a.delivered) && (
        <Button
          size="sm"
          variant="outline"
          className="w-full h-8 text-xs"
          disabled={!!savingId}
          onClick={async () => {
            for (const a of addons.filter((x) => !x.delivered)) {
              await toggle(a, true);
            }
          }}
        >
          Marcar todos como entregues
        </Button>
      )}
    </div>
  );
};

export default TicketAddonsChecklist;
