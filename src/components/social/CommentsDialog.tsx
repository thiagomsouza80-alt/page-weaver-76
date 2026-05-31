import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useSocialAuthor } from "@/hooks/useSocialAuthor";
import { toast } from "@/hooks/use-toast";
import { Loader2, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Comment {
  id: string;
  user_id: string;
  parent_comment_id: string | null;
  author_name: string;
  author_avatar_url: string | null;
  content: string;
  created_at: string;
}

interface Props {
  postId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  currentUserId: string | null;
  onCommentAdded: () => void;
}

const CommentsDialog = ({ postId, open, onOpenChange, currentUserId, onCommentAdded }: Props) => {
  const { author } = useSocialAuthor();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("social_comments").select("*").eq("post_id", postId).order("created_at");
    setComments((data as Comment[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { if (open) load(); }, [open, postId]);

  const submit = async () => {
    if (!author || !text.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from("social_comments").insert({
      post_id: postId,
      user_id: author.userId,
      parent_comment_id: replyTo,
      author_name: author.name,
      author_avatar_url: author.avatarUrl,
      content: text.trim(),
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); }
    else {
      await supabase.rpc("social_increment_comments", { _post_id: postId });
      setText(""); setReplyTo(null);
      await load();
      onCommentAdded();
    }
    setSubmitting(false);
  };

  const remove = async (id: string) => {
    await supabase.from("social_comments").delete().eq("id", id);
    await load();
  };

  const roots = comments.filter(c => !c.parent_comment_id);
  const replies = (id: string) => comments.filter(c => c.parent_comment_id === id);

  const renderComment = (c: Comment, isReply = false) => {
    const initials = c.author_name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
    return (
      <div key={c.id} className={`flex gap-3 ${isReply ? "ml-10" : ""}`}>
        <Avatar className="h-8 w-8 shrink-0">
          {c.author_avatar_url && <AvatarImage src={c.author_avatar_url} />}
          <AvatarFallback className="text-xs bg-primary/20 text-primary">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="bg-secondary rounded-xl px-3 py-2">
            <div className="text-xs font-semibold text-foreground">{c.author_name}</div>
            <p className="text-sm text-foreground whitespace-pre-wrap">{c.content}</p>
          </div>
          <div className="flex gap-3 mt-1 px-3 text-xs text-muted-foreground">
            <span>{formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: ptBR })}</span>
            {!isReply && author && (
              <button onClick={() => setReplyTo(c.id)} className="hover:text-primary">Responder</button>
            )}
            {currentUserId === c.user_id && (
              <button onClick={() => remove(c.id)} className="hover:text-destructive flex items-center gap-1">
                <Trash2 className="h-3 w-3" /> Excluir
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader><DialogTitle>Comentários</DialogTitle></DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-4 -mx-6 px-6">
          {loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> :
            roots.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">Seja o primeiro a comentar.</p> :
              roots.map(r => (
                <div key={r.id} className="space-y-3">
                  {renderComment(r)}
                  {replies(r.id).map(rep => renderComment(rep, true))}
                </div>
              ))}
        </div>
        {author ? (
          <div className="border-t border-border pt-3 space-y-2">
            {replyTo && (
              <div className="text-xs text-muted-foreground flex items-center justify-between bg-secondary px-2 py-1 rounded">
                Respondendo… <button onClick={() => setReplyTo(null)}>cancelar</button>
              </div>
            )}
            <div className="flex gap-2">
              <Textarea value={text} onChange={e => setText(e.target.value)} placeholder="Comentar…" className="min-h-[60px]" maxLength={500} />
              <Button onClick={submit} disabled={submitting || !text.trim()}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar"}
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center border-t pt-3">Faça login para comentar.</p>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CommentsDialog;
