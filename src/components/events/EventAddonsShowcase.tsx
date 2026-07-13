import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Loader2 } from "lucide-react";
import { centsToBRL } from "@/lib/money";

interface Props {
  eventId: string;
}

interface Addon {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  image_url: string | null;
  price_cents: number;
  stock_total: number | null;
  stock_sold: number;
  is_required: boolean;
}

const EventAddonsShowcase = ({ eventId }: Props) => {
  const [items, setItems] = useState<Addon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("event_addon_products" as any)
        .select("id, name, description, category, image_url, price_cents, stock_total, stock_sold, is_required")
        .eq("event_id", eventId)
        .eq("is_visible", true)
        .order("sort_order", { ascending: true });
      setItems(((data as any[]) || []) as Addon[]);
      setLoading(false);
    };
    load();
  }, [eventId]);

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <section className="mb-10">
      <div className="flex items-center gap-2 mb-4">
        <Package className="h-5 w-5 text-primary" />
        <h2 className="text-xl md:text-2xl font-bold">Produtos Adicionais</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Personalize sua experiência com itens extras que podem ser adquiridos junto com o ingresso.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map((item) => {
          const soldOut = item.stock_total != null && item.stock_sold >= item.stock_total;
          return (
            <Card key={item.id} className={soldOut ? "opacity-60" : "hover:border-primary/50 transition"}>
              <CardContent className="p-4 flex gap-3">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="w-20 h-20 object-cover rounded-lg shrink-0" />
                ) : (
                  <div className="w-20 h-20 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    <Package className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap mb-1">
                    <h3 className="font-semibold text-sm truncate">{item.name}</h3>
                    {item.category && <Badge variant="outline" className="text-[10px]">{item.category}</Badge>}
                    {item.is_required && (
                      <Badge className="text-[10px] bg-primary/15 text-primary border-primary/30" variant="outline">Obrigatório</Badge>
                    )}
                    {soldOut && <Badge variant="destructive" className="text-[10px]">Esgotado</Badge>}
                  </div>
                  {item.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{item.description}</p>
                  )}
                  <p className="font-bold text-sm text-primary">{centsToBRL(item.price_cents)}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground mt-3 italic">
        💡 Você poderá adicionar estes produtos ao finalizar sua compra de ingresso.
      </p>
    </section>
  );
};

export default EventAddonsShowcase;
