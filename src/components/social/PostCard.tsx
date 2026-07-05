import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, Trash2, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import CommentsDialog from "./CommentsDialog";
import ReportDialog from "./ReportDialog";

export interface SocialPost {
  id: string;
  user_id: string;
  author_type: string;
  author_name: string;
  author_avatar_url: string | null;
  content: string | null;
  media_urls: string[];
  media_type: string;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  created_at: string;
}

interface Props {
  post: SocialPost;
  currentUserId: string | null;
  isAdmin: boolean;
  onChanged: () => void;
}

const PostCard = ({ post, currentUserId, isAdmin, onChanged }: Props) => {
  const navigate = useNavigate();
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likes, setLikes] = useState(post.likes_count);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [activeImg, setActiveImg] = useState(0);

  const goToAuthor = async (e: React.MouseEvent) => {
    e.preventDefault();
    // For artists/entrepreneurs, prefer their dedicated public profile pages first.
    if (post.author_type === "artist") {
      const { data: a } = await supabase.from("artists").select("name").eq("user_id", post.user_id).maybeSingle();
      if (a?.name) {
        const slug = a.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        navigate(`/artistas/${slug}`); return;
      }
    }
    if (post.author_type === "entrepreneur") {
      const { data: e2 } = await supabase.from("entrepreneurs").select("slug,name").eq("user_id", post.user_id).maybeSingle();
      if (e2?.slug) { navigate(`/empreendedores/${e2.slug}`); return; }
      if (e2?.name) {
        const slug = e2.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        navigate(`/empreendedores/${slug}`); return;
      }
    }
    // Fallback: public user profile via username
    const { data: prof } = await supabase
      .from("user_profiles" as any)
      .select("username,visibility")
      .eq("user_id", post.user_id)
      .maybeSingle();
    const p = prof as any;
    if (p?.username && (!p.visibility || p.visibility === "public")) {
      navigate(`/u/${p.username}`);
      return;
    }
    if (p?.username) { navigate(`/u/${p.username}`); return; }
    toast({ title: "Este usuário ainda não tem perfil público." });
  };

  useEffect(() => { setLikes(post.likes_count); }, [post.likes_count]);

  useEffect(() => {
    if (!currentUserId) return;
    supabase.from("social_likes").select("id").eq("post_id", post.id).eq("user_id", currentUserId).maybeSingle()
      .then(({ data }) => setLiked(!!data));
    supabase.from("social_saved_posts").select("id").eq("post_id", post.id).eq("user_id", currentUserId).maybeSingle()
      .then(({ data }) => setSaved(!!data));
  }, [post.id, currentUserId]);

  const initials = post.author_name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  const time = formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ptBR });

  const toggleLike = async () => {
    if (!currentUserId) { toast({ title: "Faça login para curtir." }); return; }
    if (liked) {
      setLiked(false); setLikes(l => Math.max(l - 1, 0));
      await supabase.from("social_likes").delete().eq("post_id", post.id).eq("user_id", currentUserId);
      await supabase.rpc("social_decrement_likes", { _post_id: post.id });
    } else {
      setLiked(true); setLikes(l => l + 1);
      const { error } = await supabase.from("social_likes").insert({ post_id: post.id, user_id: currentUserId });
      if (!error) await supabase.rpc("social_increment_likes", { _post_id: post.id });
    }
  };

  const toggleSave = async () => {
    if (!currentUserId) { toast({ title: "Faça login para salvar." }); return; }
    if (saved) {
      setSaved(false);
      await supabase.from("social_saved_posts").delete().eq("post_id", post.id).eq("user_id", currentUserId);
      toast({ title: "Removido dos salvos" });
    } else {
      setSaved(true);
      await supabase.from("social_saved_posts").insert({ post_id: post.id, user_id: currentUserId });
      toast({ title: "Publicação salva" });
    }
  };

  const share = async () => {
    const url = `${window.location.origin}/social#post-${post.id}`;
    try {
      if (navigator.share) await navigator.share({ title: post.author_name, text: post.content ?? "", url });
      else { await navigator.clipboard.writeText(url); toast({ title: "Link copiado!" }); }
      await supabase.from("social_shares").insert({ post_id: post.id, user_id: currentUserId });
      await supabase.rpc("social_increment_shares", { _post_id: post.id });
    } catch {}
  };

  const remove = async () => {
    if (!confirm("Excluir esta publicação?")) return;
    await supabase.from("social_posts").update({ deleted: true }).eq("id", post.id);
    toast({ title: "Publicação excluída" });
    onChanged();
  };

  const hide = async () => {
    await supabase.from("social_posts").update({ hidden: true }).eq("id", post.id);
    toast({ title: "Publicação oculta" });
    onChanged();
  };

  const canManage = isAdmin || currentUserId === post.user_id;
  const badge = post.author_type === "artist" ? "Artista" : post.author_type === "entrepreneur" ? "Empreendedor" : null;

  return (
    <article id={`post-${post.id}`} className="bg-card border border-border rounded-xl overflow-hidden">
      <header className="flex items-center justify-between p-4">
        <button onClick={goToAuthor} className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity">
          <Avatar className="h-10 w-10">
            {post.author_avatar_url && <AvatarImage src={post.author_avatar_url} />}
            <AvatarFallback className="bg-primary/20 text-primary">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-foreground hover:underline">{post.author_name}</span>
              {badge && <Badge variant="secondary" className="text-[10px] py-0 px-1.5">{badge}</Badge>}
            </div>
            <span className="text-xs text-muted-foreground">{time}</span>
          </div>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {currentUserId && currentUserId !== post.user_id && (
              <div className="px-2 py-1.5 text-sm cursor-pointer hover:bg-accent rounded-sm">
                <ReportDialog targetType="post" targetId={post.id} variant="menuitem" />
              </div>
            )}
            {(isAdmin || canManage) && currentUserId && currentUserId !== post.user_id && <DropdownMenuSeparator />}
            {isAdmin && <DropdownMenuItem onClick={hide}><EyeOff className="h-4 w-4 mr-2" /> Ocultar</DropdownMenuItem>}
            {canManage && <DropdownMenuItem onClick={remove} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" /> Excluir</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {post.content && <p className="px-4 pb-3 text-sm text-foreground whitespace-pre-wrap">{post.content}</p>}

      {post.media_urls.length > 0 && post.media_type === "video" && (
        <video src={post.media_urls[0]} controls className="w-full max-h-[600px] bg-black" />
      )}
      {post.media_urls.length > 0 && (post.media_type === "image" || post.media_type === "gallery") && (
        <div className="relative bg-muted">
          <img src={post.media_urls[activeImg]} alt="" className="w-full max-h-[600px] object-contain" />
          {post.media_urls.length > 1 && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {post.media_urls.map((_, i) => (
                <button key={i} onClick={() => setActiveImg(i)}
                  className={`h-2 w-2 rounded-full ${i === activeImg ? "bg-primary" : "bg-background/60"}`} />
              ))}
            </div>
          )}
        </div>
      )}

      <footer className="flex items-center justify-between px-2 py-2 border-t border-border">
        <Button variant="ghost" size="sm" onClick={toggleLike} className={liked ? "text-primary" : ""}>
          <Heart className={`h-4 w-4 mr-1.5 ${liked ? "fill-current" : ""}`} /> {likes}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setCommentsOpen(true)}>
          <MessageCircle className="h-4 w-4 mr-1.5" /> {post.comments_count}
        </Button>
        <Button variant="ghost" size="sm" onClick={share}>
          <Share2 className="h-4 w-4 mr-1.5" /> {post.shares_count}
        </Button>
        <Button variant="ghost" size="sm" onClick={toggleSave} className={saved ? "text-primary" : ""}>
          <Bookmark className={`h-4 w-4 ${saved ? "fill-current" : ""}`} />
        </Button>
      </footer>

      {commentsOpen && (
        <CommentsDialog
          postId={post.id}
          open={commentsOpen}
          onOpenChange={setCommentsOpen}
          currentUserId={currentUserId}
          onCommentAdded={onChanged}
        />
      )}
    </article>
  );
};

export default PostCard;
