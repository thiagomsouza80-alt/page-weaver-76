import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Users, Loader2, Heart, Trash2 } from "lucide-react";

type Community = {
  id: string; name: string; slug: string; description: string | null;
  category: string | null; cover_url: string | null; members_count: number;
  posts_count: number; owner_user_id: string;
};

type Post = {
  id: string; user_id: string; author_name: string | null; author_avatar_url: string | null;
  content: string; image_url: string | null; likes_count: number; created_at: string;
};

export default function ComunidadeDetalhe() {
  const { slug } = useParams();
  const { toast } = useToast();
  const [c, setC] = useState<Community | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [me, setMe] = useState<string | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [liked, setLiked] = useState<Set<string>>(new Set());

  const load = async () => {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    setMe(u.user?.id ?? null);

    const { data: cd } = await supabase.from("communities" as any).select("*").eq("slug", slug).maybeSingle();
    if (!cd) { setLoading(false); return; }
    setC(cd as Community);

    if (u.user?.id) {
      const { data: mem } = await supabase.from("community_members" as any)
        .select("id").eq("community_id", (cd as any).id).eq("user_id", u.user.id).maybeSingle();
      setIsMember(!!mem);

      if (mem) {
        const { data: pd } = await supabase.from("community_posts" as any)
          .select("*").eq("community_id", (cd as any).id).eq("deleted", false)
          .order("created_at", { ascending: false }).limit(60);
        setPosts(((pd as any) || []) as Post[]);

        const ids = (pd || []).map((p: any) => p.id);
        if (ids.length) {
          const { data: lk } = await supabase.from("community_post_likes" as any)
            .select("post_id").in("post_id", ids).eq("user_id", u.user.id);
          setLiked(new Set((lk || []).map((l: any) => l.post_id)));
        }
      }
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [slug]);

  const join = async () => {
    if (!me || !c) return;
    const { error } = await supabase.from("community_members" as any).insert({ community_id: c.id, user_id: me } as any);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Bem-vindo(a) à comunidade!" }); load();
  };

  const leave = async () => {
    if (!me || !c) return;
    if (c.owner_user_id === me) { toast({ title: "O dono não pode sair da própria comunidade.", variant: "destructive" }); return; }
    if (!confirm("Sair desta comunidade?")) return;
    await supabase.from("community_members" as any).delete().eq("community_id", c.id).eq("user_id", me);
    toast({ title: "Você saiu da comunidade." }); load();
  };

  const submit = async () => {
    if (!me || !c || content.trim().length < 2) return;
    setPosting(true);
    const { data: profile } = await supabase.from("user_profiles").select("display_name, username, avatar_url").eq("user_id", me).maybeSingle();
    const { error } = await supabase.from("community_posts" as any).insert({
      community_id: c.id, user_id: me,
      author_name: (profile as any)?.display_name || (profile as any)?.username || "Usuário",
      author_avatar_url: (profile as any)?.avatar_url || null,
      content: content.trim(),
    } as any);
    setPosting(false);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    setContent(""); load();
  };

  const toggleLike = async (post: Post) => {
    if (!me) return;
    if (liked.has(post.id)) {
      await supabase.from("community_post_likes" as any).delete().eq("post_id", post.id).eq("user_id", me);
      liked.delete(post.id);
      setPosts(posts.map(p => p.id === post.id ? { ...p, likes_count: Math.max(p.likes_count - 1, 0) } : p));
    } else {
      await supabase.from("community_post_likes" as any).insert({ post_id: post.id, user_id: me } as any);
      liked.add(post.id);
      setPosts(posts.map(p => p.id === post.id ? { ...p, likes_count: p.likes_count + 1 } : p));
    }
    setLiked(new Set(liked));
  };

  const del = async (post: Post) => {
    if (!confirm("Excluir esta publicação?")) return;
    await supabase.from("community_posts" as any).delete().eq("id", post.id);
    load();
  };

  if (loading) return <div className="min-h-screen bg-background"><Navbar /><div className="flex justify-center py-32"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div></div>;
  if (!c) return <div className="min-h-screen bg-background"><Navbar /><p className="text-center py-32">Comunidade não encontrada.</p></div>;

  const isOwner = me === c.owner_user_id;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 pt-24 pb-16">
        <Link to="/comunidades"><Button variant="ghost" size="sm" className="gap-2 mb-3"><ArrowLeft className="h-4 w-4" /> Voltar</Button></Link>

        <div className="bg-card border border-border rounded-xl overflow-hidden mb-6">
          <div className="h-40 bg-secondary">
            {c.cover_url ? <img src={c.cover_url} alt={c.name} className="w-full h-full object-cover" /> :
              <div className="w-full h-full bg-gradient-to-br from-primary/40 to-fuchsia-500/40 flex items-center justify-center"><Users className="h-14 w-14 text-white/80" /></div>}
          </div>
          <div className="p-5">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <h1 className="text-2xl font-bold">{c.name}</h1>
                {c.category && <p className="text-sm text-primary">{c.category}</p>}
              </div>
              {me && (
                isMember ? (
                  isOwner ? <span className="text-xs text-muted-foreground">Você é o dono</span> :
                    <Button variant="outline" size="sm" onClick={leave}>Sair</Button>
                ) : <Button size="sm" onClick={join}>Entrar</Button>
              )}
            </div>
            {c.description && <p className="text-sm text-muted-foreground mt-3 whitespace-pre-wrap">{c.description}</p>}
            <div className="mt-3 text-xs text-muted-foreground flex gap-4">
              <span>{c.members_count} membros</span>
              <span>{c.posts_count} posts</span>
            </div>
          </div>
        </div>

        {!me ? (
          <div className="bg-card border border-border rounded-xl p-6 text-center text-sm text-muted-foreground">
            <Link to="/login" className="text-primary underline">Entre</Link> para participar e ver as discussões.
          </div>
        ) : !isMember ? (
          <div className="bg-card border border-border rounded-xl p-6 text-center text-sm text-muted-foreground">
            Entre na comunidade para ver e publicar posts.
          </div>
        ) : (
          <>
            <div className="bg-card border border-border rounded-xl p-4 mb-4">
              <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Compartilhe algo com a comunidade..." rows={3} maxLength={2000} />
              <div className="flex justify-end mt-2">
                <Button size="sm" onClick={submit} disabled={posting || content.trim().length < 2}>
                  {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Publicar"}
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {posts.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">Sem posts ainda. Seja o primeiro!</p>}
              {posts.map((p) => (
                <article key={p.id} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar className="h-8 w-8">
                      {p.author_avatar_url && <AvatarImage src={p.author_avatar_url} />}
                      <AvatarFallback>{p.author_name?.[0] || "?"}</AvatarFallback>
                    </Avatar>
                    <div className="text-sm flex-1">
                      <div className="font-medium">{p.author_name || "Usuário"}</div>
                      <div className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString("pt-BR")}</div>
                    </div>
                    {(p.user_id === me || isOwner) && (
                      <Button size="icon" variant="ghost" onClick={() => del(p)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    )}
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{p.content}</p>
                  {p.image_url && <img src={p.image_url} alt="" className="mt-3 rounded-lg max-h-96 w-full object-cover" />}
                  <div className="mt-3">
                    <button onClick={() => toggleLike(p)} className={`text-xs flex items-center gap-1 ${liked.has(p.id) ? "text-primary" : "text-muted-foreground"}`}>
                      <Heart className={`h-4 w-4 ${liked.has(p.id) ? "fill-current" : ""}`} /> {p.likes_count}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
