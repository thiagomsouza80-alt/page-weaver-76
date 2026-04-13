import { Share2 } from "lucide-react";
import { toast } from "sonner";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const getShareUrl = () => {
  const path = window.location.pathname;
  // Only use OG proxy for detail pages
  if (/^\/(artistas|noticias|eventos|empreendedores)\/[^/]+/.test(path)) {
    return `${SUPABASE_URL}/functions/v1/og-preview?path=${encodeURIComponent(path)}`;
  }
  return window.location.href;
};

const ShareButtons = ({ artistName }: { artistName: string }) => {
  const handleCopyLink = () => {
    const shareUrl = getShareUrl();
    navigator.clipboard.writeText(shareUrl);
    toast.success("Link copiado!");
  };

  return (
    <div className="mt-4 space-y-3">
      <button
        onClick={handleCopyLink}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all active:scale-[0.97] bg-secondary hover:bg-secondary/80 text-foreground"
      >
        <Share2 className="h-4 w-4" /> Compartilhar link do perfil
      </button>
      <p className="text-xs text-muted-foreground">Compartilhe seu perfil e ganhe mais fans!</p>
    </div>
  );
};

export default ShareButtons;
