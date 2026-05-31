import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useSocialAuthor } from "@/hooks/useSocialAuthor";
import PostComposer from "@/components/social/PostComposer";
import PostCard, { type SocialPost } from "@/components/social/PostCard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

type SortKey = "recent" | "popular" | "trending";

const SocialPop = () => {
  const { author, loading: authorLoading } = useSocialAuthor();
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortKey>("recent");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!author) return;
    supabase.rpc("has_role", { _user_id: author.userId, _role: "admin" })
      .then(({ data }) => setIsAdmin(!!data));
  }, [author]);

  const load = async () => {
    setLoading(true);
    let q = supabase.from("social_posts").select("*").eq("deleted", false).eq("hidden", false);
    if (sort === "recent") q = q.order("created_at", { ascending: false });
    else if (sort === "popular") q = q.order("likes_count", { ascending: false }).order("created_at", { ascending: false });
    else {
      const since = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
      q = q.gte("created_at", since).order("likes_count", { ascending: false });
    }
    const { data } = await q.limit(50);
    setPosts((data as SocialPost[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [sort]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 pt-24 pb-16">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="h-7 w-7 text-primary" />
            Social Pop
          </h1>
          <p className="text-sm text-muted-foreground mt-1">A comunidade da cultura pop paraense.</p>
        </header>

        {authorLoading ? null : author ? (
          <PostComposer author={author} onPosted={load} />
        ) : (
          <div className="bg-card border border-border rounded-xl p-6 text-center">
            <p className="text-sm text-muted-foreground mb-3">Entre para publicar, curtir e comentar.</p>
            <div className="flex gap-2 justify-center">
              <Link to="/login"><Button size="sm">Entrar</Button></Link>
              <Link to="/cadastro"><Button size="sm" variant="outline">Cadastrar</Button></Link>
            </div>
          </div>
        )}

        <Tabs value={sort} onValueChange={v => setSort(v as SortKey)} className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="recent">Recentes</TabsTrigger>
            <TabsTrigger value="popular">Populares</TabsTrigger>
            <TabsTrigger value="trending">Em alta</TabsTrigger>
          </TabsList>
        </Tabs>

        <section className="mt-4 space-y-4">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : posts.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">Nenhuma publicação ainda. Seja o primeiro!</p>
          ) : (
            posts.map(p => (
              <PostCard key={p.id} post={p} currentUserId={author?.userId ?? null} isAdmin={isAdmin} onChanged={load} />
            ))
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default SocialPop;
