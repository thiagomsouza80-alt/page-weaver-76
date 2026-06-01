import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import ProductCard, { type ProductCardData } from "./ProductCard";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

const VitrineTab = () => {
  const [items, setItems] = useState<ProductCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("social_products" as any)
        .select("*")
        .eq("active", true)
        .eq("hidden", false)
        .order("created_at", { ascending: false })
        .limit(60);
      setItems((data as any) ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = q.trim()
    ? items.filter(i => (i.name + " " + (i.description || "")).toLowerCase().includes(q.toLowerCase()))
    : items;

  return (
    <div className="space-y-4">
      <Input placeholder="Buscar produto..." value={q} onChange={e => setQ(e.target.value)} />
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">Nenhum produto encontrado.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {filtered.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
};

export default VitrineTab;
