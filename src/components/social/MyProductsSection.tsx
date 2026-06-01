import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import ProductCard, { type ProductCardData } from "./ProductCard";
import ProductFormDialog, { type Product } from "./ProductFormDialog";
import { toast } from "sonner";

type Props = { userId: string; entrepreneurId: string };

const MyProductsSection = ({ userId, entrepreneurId }: Props) => {
  const [items, setItems] = useState<ProductCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("social_products" as any)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setItems((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [userId]);

  const onEdit = (p: ProductCardData) => {
    setEditing({
      id: p.id, name: p.name, description: p.description, price: p.price,
      images: p.images || [], whatsapp: p.whatsapp, external_url: p.external_url, active: p.active,
    });
    setOpen(true);
  };

  const onDelete = async (p: ProductCardData) => {
    if (!confirm(`Excluir "${p.name}"?`)) return;
    const { error } = await supabase.from("social_products" as any).delete().eq("id", p.id);
    if (error) toast.error("Erro ao excluir");
    else { toast.success("Produto excluído"); load(); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Meus Produtos</h2>
          <p className="text-sm text-muted-foreground">Itens publicados na vitrine Social Pop.</p>
        </div>
        <Button variant="hero" size="sm" className="gap-2" onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="h-4 w-4" /> Novo
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhum produto cadastrado.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map(p => (
            <ProductCard key={p.id} product={p} canManage onEdit={() => onEdit(p)} onDelete={() => onDelete(p)} />
          ))}
        </div>
      )}

      <ProductFormDialog
        open={open}
        onOpenChange={setOpen}
        userId={userId}
        entrepreneurId={entrepreneurId}
        product={editing}
        onSaved={load}
      />
    </div>
  );
};

export default MyProductsSection;
