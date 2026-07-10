import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSocialAuthor } from "@/hooks/useSocialAuthor";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Loader2, Gamepad2, Heart, Users, Star, Play, Calendar, Library, Package, Gift, Target, Award, Trophy } from "lucide-react";
import PackOpenDialog from "@/components/pop-games/PackOpenDialog";
import DailyRewardCard from "@/components/pop-games/DailyRewardCard";
import MissionsList from "@/components/pop-games/MissionsList";
import AchievementsList from "@/components/pop-games/AchievementsList";
import GameRanking from "@/components/pop-games/GameRanking";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface Game {
  id: string; slug: string; name: string; category: string; description: string | null;
  short_description: string | null; logo_url: string | null; banner_url: string | null; trailer_url: string | null;
  status: string; version: string | null; players_count: number; rating_avg: number; ratings_count: number;
  is_in_development: boolean; screenshots: string[]; last_update_at: string;
  developer_id: string; game_developers?: { studio_name: string };
}

const GameDetail = () => {
  const { slug } = useParams();
  const { author } = useSocialAuthor();
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [favorited, setFavorited] = useState(false);
  const [joined, setJoined] = useState(false);
  const [news, setNews] = useState<any[]>([]);
  const [packs, setPacks] = useState<any[]>([]);
  const [hasStarter, setHasStarter] = useState(false);
  const [starterClaimed, setStarterClaimed] = useState(false);
  const [openPackId, setOpenPackId] = useState<string | null>(null);
  const [openPackName, setOpenPackName] = useState<string>("");

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any).from("games")
      .select("*, game_developers(studio_name)")
      .eq("slug", slug).maybeSingle();
    setGame((data as any) ?? null);
    if (data) {
      const { data: n } = await (supabase as any).from("game_news")
        .select("*").eq("game_id", (data as any).id).eq("published", true)
        .order("created_at", { ascending: false }).limit(10);
      setNews((n as any) || []);
      const { data: pk } = await (supabase as any).from("game_packs")
        .select("*").eq("game_id", (data as any).id).eq("is_active", true).eq("is_free", true);
      setPacks((pk as any) || []);
      const starter = ((pk as any) || []).find((p: any) => p.pack_type === "starter");
      setHasStarter(!!starter);
      if (author?.userId) {
        const [{ data: fav }, { data: pl }, { data: opened }] = await Promise.all([
          (supabase as any).from("game_favorites").select("id").eq("user_id", author.userId).eq("game_id", (data as any).id).maybeSingle(),
          (supabase as any).from("game_players").select("id").eq("user_id", author.userId).eq("game_id", (data as any).id).maybeSingle(),
          starter ? (supabase as any).from("game_pack_openings").select("id").eq("user_id", author.userId).eq("pack_id", starter.id).maybeSingle() : Promise.resolve({ data: null } as any),
        ]);
        setFavorited(!!fav); setJoined(!!pl); setStarterClaimed(!!opened);
      }
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [slug, author?.userId]);

  const claimStarter = async () => {
    if (!game) return;
    const { error } = await (supabase as any).rpc("game_claim_starter", { _game_id: game.id });
    if (error) { toast({ title: "Não foi possível", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Deck inicial recebido!" });
    setStarterClaimed(true);
    load();
  };

  const toggleFav = async () => {
    if (!author?.userId || !game) { toast({ title: "Entre para favoritar" }); return; }
    if (favorited) {
      await (supabase as any).from("game_favorites").delete().eq("user_id", author.userId).eq("game_id", game.id);
      setFavorited(false);
    } else {
      await (supabase as any).from("game_favorites").insert({ user_id: author.userId, game_id: game.id });
      setFavorited(true);
    }
  };

  const play = async () => {
    if (!author?.userId) { toast({ title: "Entre para jogar" }); return; }
    if (!game) return;
    if (!joined) {
      await (supabase as any).from("game_players").insert({
        user_id: author.userId, game_id: game.id, last_played_at: new Date().toISOString(),
      });
      await (supabase as any).from("games").update({
        players_count: (game.players_count || 0) + 1,
      }).eq("id", game.id);
      setJoined(true);
    } else {
      await (supabase as any).from("game_players").update({
        last_played_at: new Date().toISOString(),
      }).eq("user_id", author.userId).eq("game_id", game.id);
    }
    toast({
      title: game.is_in_development ? "Jogo em desenvolvimento" : "Bem-vindo!",
      description: game.is_in_development
        ? "Você está inscrito. Avisaremos quando o jogo estiver jogável."
        : "O motor de partidas será liberado em breve.",
    });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!game) return (
    <div className="min-h-screen bg-background"><Navbar />
      <main className="max-w-xl mx-auto pt-24 px-4 text-center">
        <p className="text-muted-foreground">Jogo não encontrado.</p>
        <Link to="/pop-games"><Button className="mt-3">Voltar ao Pop Games</Button></Link>
      </main><Footer />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-16 pb-16">
        <div className="relative w-full aspect-[21/9] max-h-[420px] bg-gradient-to-br from-primary/20 to-secondary overflow-hidden">
          {game.banner_url
            ? <img src={game.banner_url} alt={game.name} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center"><Gamepad2 className="h-20 w-20 text-primary/40" /></div>}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        </div>

        <div className="max-w-4xl mx-auto px-4 -mt-20 relative">
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            {game.logo_url && <img src={game.logo_url} alt="" className="w-24 h-24 rounded-2xl object-cover border-4 border-background shadow-lg" />}
            <div className="flex-1 min-w-0 pt-2">
              <h1 className="text-3xl font-bold">{game.name}</h1>
              <p className="text-sm text-muted-foreground">
                {game.game_developers?.studio_name} · {game.category} · v{game.version || "0.1.0"}
              </p>
              <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Users className="h-4 w-4" />{game.players_count} jogadores</span>
                <span className="inline-flex items-center gap-1"><Star className="h-4 w-4" />{Number(game.rating_avg).toFixed(1)}</span>
                <span className="inline-flex items-center gap-1"><Calendar className="h-4 w-4" />Atualizado {new Date(game.last_update_at).toLocaleDateString("pt-BR")}</span>
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto flex-wrap">
              <Button onClick={play} className="gap-2">
                <Play className="h-4 w-4" />{joined ? "Continuar" : "Jogar"}
              </Button>
              <Button variant="outline" onClick={toggleFav} className="gap-2">
                <Heart className={`h-4 w-4 ${favorited ? "fill-primary text-primary" : ""}`} />
                {favorited ? "Favorito" : "Favoritar"}
              </Button>
              <Link to={`/pop-games/jogos/${game.slug}/colecao`}>
                <Button variant="outline" className="gap-2"><Library className="h-4 w-4" />Coleção</Button>
              </Link>
              <Link to={`/pop-games/jogos/${game.slug}/decks`}>
                <Button variant="outline" className="gap-2"><Package className="h-4 w-4" />Meus Decks</Button>
              </Link>
            </div>
          </div>

          {hasStarter && author?.userId && !starterClaimed && (
            <div className="mt-6 p-4 rounded-xl bg-primary/10 border border-primary/40 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-sm">
                <Gift className="h-5 w-5 text-primary" />
                <span>Você ainda não pegou seu <strong>deck inicial gratuito</strong>!</span>
              </div>
              <Button size="sm" onClick={claimStarter}>Resgatar</Button>
            </div>
          )}

          {packs.length > 0 && (
            <section className="mt-8">
              <h2 className="text-lg font-bold mb-3 flex items-center gap-2"><Package className="h-5 w-5 text-primary" />Pacotes disponíveis</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {packs.filter(p => p.pack_type !== "starter" || starterClaimed).map(p => (
                  <button key={p.id} onClick={() => { setOpenPackId(p.id); setOpenPackName(p.name); }}
                    className="p-4 bg-card border border-border rounded-xl hover:border-primary transition text-left">
                    <Package className="h-8 w-8 text-primary mb-2" />
                    <p className="font-bold text-sm">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.cards_per_pack} cartas · {p.is_free ? "grátis" : `${p.price_coins} moedas`}</p>
                  </button>
                ))}
              </div>
            </section>
          )}

          {game.is_in_development && (
            <div className="mt-6 p-3 rounded-lg bg-amber-500/10 border border-amber-500/40 text-sm">
              Este jogo está em desenvolvimento. Favorite ou entre no jogo para receber atualizações.
            </div>
          )}

          {author?.userId && (
            <div className="mt-6">
              <DailyRewardCard gameId={game.id} userId={author.userId} />
            </div>
          )}

          <Tabs defaultValue="sobre" className="mt-8">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="sobre">Sobre</TabsTrigger>
              <TabsTrigger value="missoes" className="gap-1"><Target className="h-3.5 w-3.5" />Missões</TabsTrigger>
              <TabsTrigger value="conquistas" className="gap-1"><Award className="h-3.5 w-3.5" />Conquistas</TabsTrigger>
              <TabsTrigger value="ranking" className="gap-1"><Trophy className="h-3.5 w-3.5" />Ranking</TabsTrigger>
            </TabsList>

            <TabsContent value="sobre" className="mt-4">
              {game.short_description && <p className="text-muted-foreground">{game.short_description}</p>}
              {game.description && <p className="text-sm whitespace-pre-wrap mt-3">{game.description}</p>}
            </TabsContent>

            <TabsContent value="missoes" className="mt-4">
              <MissionsList gameId={game.id} userId={author?.userId ?? null} />
            </TabsContent>

            <TabsContent value="conquistas" className="mt-4">
              <AchievementsList gameId={game.id} userId={author?.userId ?? null} />
            </TabsContent>

            <TabsContent value="ranking" className="mt-4">
              <GameRanking gameId={game.id} />
            </TabsContent>
          </Tabs>



          {game.trailer_url && (
            <section className="mt-8">
              <h2 className="text-lg font-bold mb-2">Trailer</h2>
              <a href={game.trailer_url} target="_blank" rel="noreferrer" className="text-primary underline text-sm">{game.trailer_url}</a>
            </section>
          )}

          {game.screenshots?.length > 0 && (
            <section className="mt-8">
              <h2 className="text-lg font-bold mb-2">Capturas</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {game.screenshots.map((s, i) => <img key={i} src={s} alt="" className="w-full aspect-video object-cover rounded-lg" loading="lazy" />)}
              </div>
            </section>
          )}

          {news.length > 0 && (
            <section className="mt-8">
              <h2 className="text-lg font-bold mb-2">Novidades</h2>
              <div className="space-y-3">
                {news.map(n => (
                  <article key={n.id} className="p-4 rounded-xl border border-border bg-card">
                    <div className="text-xs text-muted-foreground mb-1">{new Date(n.created_at).toLocaleDateString("pt-BR")}</div>
                    <h3 className="font-bold">{n.title}</h3>
                    {n.body && <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{n.body}</p>}
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
      <PackOpenDialog packId={openPackId} packName={openPackName}
        open={!!openPackId} onOpenChange={(o) => { if (!o) setOpenPackId(null); }} onOpened={load} />
      <Footer />
    </div>
  );
};

export default GameDetail;
