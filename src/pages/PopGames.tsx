import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSocialAuthor } from "@/hooks/useSocialAuthor";
import { useGameDeveloper } from "@/hooks/useGameDeveloper";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Gamepad2, Sparkles, Trophy, Star, Wrench, Heart, Newspaper, Loader2, Plus } from "lucide-react";

interface Game {
  id: string; slug: string; name: string; category: string;
  short_description: string | null; logo_url: string | null; banner_url: string | null;
  status: string; is_featured: boolean; is_new: boolean; is_in_development: boolean;
  players_count: number; rating_avg: number; last_update_at: string;
}

const GameCard = ({ g }: { g: Game }) => (
  <Link to={`/pop-games/jogos/${g.slug}`}
    className="group block rounded-xl overflow-hidden bg-card border border-border hover:border-primary/60 transition">
    <div className="relative aspect-[16/9] bg-gradient-to-br from-primary/20 to-secondary overflow-hidden">
      {g.banner_url
        ? <img src={g.banner_url} alt={g.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
        : <div className="w-full h-full flex items-center justify-center"><Gamepad2 className="h-12 w-12 text-primary/40" /></div>}
      {g.is_in_development && (
        <span className="absolute top-2 left-2 bg-amber-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Em desenvolvimento</span>
      )}
      {g.is_new && !g.is_in_development && (
        <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Novo</span>
      )}
    </div>
    <div className="p-3 flex gap-3">
      {g.logo_url && <img src={g.logo_url} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0 -mt-8 border-2 border-card" />}
      <div className="min-w-0 flex-1">
        <h3 className="font-bold truncate">{g.name}</h3>
        <p className="text-xs text-muted-foreground truncate">{g.short_description || g.category}</p>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1">
          <span className="inline-flex items-center gap-1"><Star className="h-3 w-3" /> {Number(g.rating_avg).toFixed(1)}</span>
          <span>{g.players_count} jogadores</span>
        </div>
      </div>
    </div>
  </Link>
);

const Section = ({ title, icon: Icon, games, empty }:
  { title: string; icon: any; games: Game[]; empty?: string }) => {
  if (!games?.length && !empty) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold flex items-center gap-2"><Icon className="h-5 w-5 text-primary" />{title}</h2>
      {games.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {games.map(g => <GameCard key={g.id} g={g} />)}
        </div>
      )}
    </section>
  );
};

const PopGames = () => {
  const { author } = useSocialAuthor();
  const { developer } = useGameDeveloper(author?.userId ?? null);
  const [featured, setFeatured] = useState<Game[]>([]);
  const [recent, setRecent] = useState<Game[]>([]);
  const [popular, setPopular] = useState<Game[]>([]);
  const [inDev, setInDev] = useState<Game[]>([]);
  const [favorites, setFavorites] = useState<Game[]>([]);
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const base = (supabase as any).from("games").select("*").eq("status", "published");
      const [f, r, p, d, n] = await Promise.all([
        base.eq("is_featured", true).limit(6),
        (supabase as any).from("games").select("*").eq("status", "published").order("created_at", { ascending: false }).limit(6),
        (supabase as any).from("games").select("*").eq("status", "published").order("players_count", { ascending: false }).limit(6),
        (supabase as any).from("games").select("*").eq("is_in_development", true).limit(6),
        (supabase as any).from("game_news").select("*, games(name, slug)").eq("published", true).order("created_at", { ascending: false }).limit(5),
      ]);
      setFeatured((f.data as any) || []);
      setRecent((r.data as any) || []);
      setPopular((p.data as any) || []);
      setInDev((d.data as any) || []);
      setNews((n.data as any) || []);

      if (author?.userId) {
        const { data: favs } = await (supabase as any)
          .from("game_favorites").select("game_id, games(*)").eq("user_id", author.userId);
        setFavorites(((favs as any) || []).map((x: any) => x.games).filter(Boolean));
      }
      setLoading(false);
    };
    load();
  }, [author?.userId]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 pt-24 pb-16">
        <header className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Gamepad2 className="h-7 w-7 text-primary" />
              Pop Games
            </h1>
            <p className="text-sm text-muted-foreground mt-1">A plataforma de jogos digitais do Amazônia Pop.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {developer?.status === "approved" ? (
              <Link to="/pop-games/dev"><Button size="sm" className="gap-2"><Wrench className="h-4 w-4" />Painel do Desenvolvedor</Button></Link>
            ) : (
              <Link to="/pop-games/dev/solicitar">
                <Button size="sm" variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  {developer?.status === "pending" ? "Solicitação pendente" : "Seja desenvolvedor"}
                </Button>
              </Link>
            )}
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <Tabs defaultValue="destaques">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 mb-6">
              <TabsTrigger value="destaques">Destaques</TabsTrigger>
              <TabsTrigger value="explorar">Explorar</TabsTrigger>
              <TabsTrigger value="favoritos">Favoritos</TabsTrigger>
              <TabsTrigger value="noticias">Notícias</TabsTrigger>
            </TabsList>

            <TabsContent value="destaques" className="space-y-8">
              <Section title="Jogos em destaque" icon={Sparkles} games={featured} empty="Ainda não há jogos em destaque." />
              <Section title="Recém-lançados" icon={Star} games={recent} empty="Novos jogos aparecerão aqui." />
              <Section title="Mais populares" icon={Trophy} games={popular} />
            </TabsContent>

            <TabsContent value="explorar" className="space-y-8">
              <Section title="Em desenvolvimento" icon={Wrench} games={inDev} empty="Nenhum jogo em desenvolvimento no momento." />
              <Section title="Todos publicados" icon={Gamepad2} games={recent} />
            </TabsContent>

            <TabsContent value="favoritos" className="space-y-4">
              {!author?.userId ? (
                <p className="text-sm text-muted-foreground">Entre para favoritar jogos.</p>
              ) : (
                <Section title="Seus favoritos" icon={Heart} games={favorites} empty="Você ainda não favoritou nenhum jogo." />
              )}
            </TabsContent>

            <TabsContent value="noticias" className="space-y-3">
              <h2 className="text-lg font-bold flex items-center gap-2"><Newspaper className="h-5 w-5 text-primary" />Notícias dos jogos</h2>
              {news.length === 0 ? (
                <p className="text-sm text-muted-foreground">Ainda não há notícias.</p>
              ) : news.map((n: any) => (
                <article key={n.id} className="p-4 rounded-xl border border-border bg-card">
                  <div className="text-xs text-muted-foreground mb-1">
                    {n.games?.name && <Link to={`/pop-games/jogos/${n.games.slug}`} className="hover:text-primary">{n.games.name}</Link>}
                    <span className="mx-1">·</span>
                    {new Date(n.created_at).toLocaleDateString("pt-BR")}
                  </div>
                  <h3 className="font-bold">{n.title}</h3>
                  {n.body && <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{n.body}</p>}
                </article>
              ))}
            </TabsContent>
          </Tabs>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default PopGames;
