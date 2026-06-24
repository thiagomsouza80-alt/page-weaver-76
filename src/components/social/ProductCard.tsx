import { Button } from "@/components/ui/button";
import { ShoppingBag, MessageCircle, Pencil, Trash2, Send } from "lucide-react";
import { Link } from "react-router-dom";
import ReportDialog from "./ReportDialog";

export type ProductCardData = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  price: number | null;
  images: string[] | null;
  whatsapp: string | null;
  external_url: string | null;
  active: boolean;
};

type Props = {
  product: ProductCardData;
  canManage?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
};

const formatPrice = (v: number | null) =>
  v == null ? null : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const ProductCard = ({ product, canManage, onEdit, onDelete }: Props) => {
  const img = product.images?.[0];
  const waNumber = (product.whatsapp || "").replace(/\D/g, "");
  const waLink = waNumber ? `https://wa.me/55${waNumber}?text=${encodeURIComponent(`Olá! Tenho interesse em "${product.name}"`)}` : null;

  return (
    <article className="bg-card border border-border rounded-xl overflow-hidden flex flex-col hover:border-primary/40 transition-colors">
      <div className="aspect-square bg-secondary relative">
        {img ? (
          <img src={img} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">Sem imagem</div>
        )}
        {!product.active && (
          <span className="absolute top-2 left-2 bg-muted text-muted-foreground text-[10px] px-2 py-0.5 rounded">Inativo</span>
        )}
        {!canManage && (
          <div className="absolute top-2 right-2 bg-background/80 backdrop-blur rounded-full p-1.5">
            <ReportDialog targetType="product" targetId={product.id} variant="icon" />
          </div>
        )}
      </div>
      <div className="p-3 flex-1 flex flex-col">
        <h3 className="font-semibold text-sm line-clamp-2">{product.name}</h3>
        {product.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{product.description}</p>
        )}
        {product.price != null && (
          <p className="text-base font-bold text-primary mt-2">{formatPrice(product.price)}</p>
        )}
        <div className="mt-3 flex flex-col gap-2">
          {!canManage && (
            <Link to={`/mensagens?to=${product.user_id}&product=${product.id}`}>
              <Button size="sm" variant="outline" className="w-full gap-2"><Send className="h-4 w-4" />Conversar</Button>
            </Link>
          )}
          {waLink && (
            <a href={waLink} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline" className="w-full gap-2"><MessageCircle className="h-4 w-4" />WhatsApp</Button>
            </a>
          )}
          {product.external_url && (
            <a href={product.external_url} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="hero" className="w-full gap-2"><ShoppingBag className="h-4 w-4" />Comprar</Button>
            </a>
          )}
          {canManage && (
            <div className="flex gap-2 pt-2 border-t border-border">
              <Button size="sm" variant="outline" className="flex-1" onClick={onEdit}><Pencil className="h-3.5 w-3.5" />Editar</Button>
              <Button size="sm" variant="outline" className="flex-1 text-destructive" onClick={onDelete}><Trash2 className="h-3.5 w-3.5" />Excluir</Button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
};

export default ProductCard;
