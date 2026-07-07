import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSocialAuthor } from "@/hooks/useSocialAuthor";
import { useGameDeveloper } from "@/hooks/useGameDeveloper";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { uploadGameAsset, slugify, GAME_CATEGORIES } from "@/lib/popGames";
import { Loader2, Plus, Wrench, Edit, Send, Users, Star, Newspaper, ExternalLink } from "lucide-react";

interface Game {
  id: string; slug: string; name: string; category: string; description: string | null;
  short_description: string | null; logo_url: string | null; banner_url: string | null; trailer_url: string | null;
  status: string; version: string | null; players_count: number; rating_avg: number; ratings_count: number;
  is_featured: boolean; is_new: boolean; is_in_development: boolean; screenshots: string[];
}

const emptyGame: Partial<Game> = {
  name: "", category: "tcg", description: "", short_description: "",
  logo_url: null, banner_url: null, trailer_url: null, version: "0.1.0",
  is_in_development: true, is_new: true, is_featured: false, status: "draft",
};

const GameForm = ({ initial, onSave, saving, userId }:
  { initial: Partial<Game>; onSave: (g: Partial<Game>) => void; saving: boolean; userId: string }) => {
  const [g, setG] = useState<Partial<Game>>(initial);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    let logo_url = g.logo_url;
    let banner_url = g.banner_url;
    if (logoFile) logo_url = await uploadGameAsset(userId, logoFile, "logo");
    if (bannerFile) banner_url = await uploadGameAsset(userId, bannerFile, "banner");
    onSave({ ...g, logo_url, banner_url });
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div><Label>Nome *</Label><Input value={g.name || ""} onChange={e => setG({ ...g, name: e.target.value })} required maxLength={100} /></div>
      <div><Label>Descrição curta</Label><Input value={g.short_description || ""} onChange={e => setG({ ...g, short_description: e.target.value })} maxLength={160} /></div>
      <div><Label>Descrição completa</Label><Textarea rows={4} value={g.description || ""} onChange={e => setG({ ...g, description: e.target.value })} maxLength={2000} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Categoria</Label>
          <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={g.category} onChange={e => setG({ ...g, category: e.target.value })}>
            {GAME_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div><Label>Versão</Label><Input value={g.version || ""} onChange={e => setG({ ...g, version: e.target.value })} maxLength={20} /></div>
      </div>
      <div><Label>URL do trailer (opcional)</Label><Input value={g.trailer_url || ""} onChange={e => setG({ ...g, trailer_url: e.target.value })} maxLength={300} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Logo</Label><Input type="file" accept="image/*" onChange={e => setLogoFile(e.target.files?.[0] || null)} />
          {g.logo_url && <img src={g.logo_url} alt="" className="mt-1 w-12 h-12 rounded object-cover" />}
        </div>
        <div><Label>Banner</Label><Input type="file" accept="image/*" onChange={e => setBannerFile(e.target.files?.[0] || null)} />
          {g.banner_url && <img src={g.banner_url} alt="" className="mt-1 h-12 rounded object-cover" />}
        </div>
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" checked={!!g.is_in_development} onChange={e => setG({ ...g, is_in_development: e.target.checked })} />Em desenvolvimento</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={!!g.is_new} onChange={e => setG({ ...g, is_new: e.target.checked })} />Novo</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={g.status === "published"} onChange={e => setG({ ...g, status: e.target.checked ? "published" : "draft" })} />Publicado</label>
      </div>
      <Button type="submit" disabled={saving} className="w-full">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
      </Button>
    </form>
  );
};

const DevPanel = () => {
  const nav = useNavigate();
  const { author, loading: aLoading } = useSocialAuthor();
  const { developer, loading: dLoading } = useGameDeveloper(author?.userId ?? null);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingGame, setEditingGame] = useState<Partial<Game> | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newsOpen, setNewsOpen] = useState<Game | null>(null);
  const [newsTitle, setNewsTitle] = useState("");
  const [newsBody, setNewsBody] = useState("");

  const load = async () => {
    if (!developer?.id) return;
    setLoading(true);
    const { data } = await (supabase as any).from("games").select("*").eq("developer_id", developer.id).order("created_at", { ascending: false });
    setGames((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { if (developer?.id) load(); else if (!dLoading) setLoading(false); }, [developer?.id, dLoading]);

  if (aLoading || dLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  if (!author?.userId) {
    return <div className="min-h-screen bg-background"><Navbar /><main className="pt-24 text-center"><p>Faça login.</p></main></div>;
  }

  if (!developer || developer.status !== "approved") {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="max-w-xl mx-auto pt-24 px-4 text-center">
          <Wrench className="h-12 w-12 mx-auto text-primary mb-3" />
          <h1 className="text-2xl font-bold mb-2">Acesso restrito</h1>
          <p className="text-muted-foreground mb-4">
            {developer?.status === "pending"
              ? "Sua solicitação está sendo analisada. Você receberá uma notificação quando for aprovada."
              : "Você precisa ser aprovado como desenvolvedor para acessar este painel."}
          </p>
          <Button onClick={() => nav("/pop-games/dev/solicitar")}>Solicitar acesso</Button>
        </main>
        <Footer />
      </div>
    );
  }

  const saveGame = async (g: Partial<Game>) => {
    setSaving(true);
    try {
      if (editingGame && (editingGame as any).id) {
        await (supabase as any).from("games").update({
          ...g, last_update_at: new Date().toISOString(),
        }).eq("id", (editingGame as any).id);
      } else {
        const slug = slugify(g.name || "") + "-" + Math.random().toString(36).slice(2, 6);
        await (supabase as any).from("games").insert({
          ...g, slug, developer_id: developer.id,
        });
      }
      toast({ title: "Jogo salvo!" });
      setDialogOpen(false);
      setEditingGame(null);
      load();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const submitNews = async () => {
    if (!newsOpen || !newsTitle.trim()) return;
    await (supabase as any).from("game_news").insert({
      game_id: newsOpen.id, title: newsTitle, body: newsBody, created_by: author.userId,
    });
    toast({ title: "Notícia publicada!" });
    setNewsOpen(null); setNewsTitle(""); setNewsBody("");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-5xl mx-auto pt-24 px-4 pb-16">
        <header className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2"><Wrench className="h-7 w-7 text-primary" />Painel do Desenvolvedor</h1>
            <p className="text-sm text-muted-foreground mt-1">{developer.studio_name}</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditingGame(null); }}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={() => setEditingGame(emptyGame)}><Plus className="h-4 w-4" />Novo jogo</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{(editingGame as any)?.id ? "Editar jogo" : "Novo jogo"}</DialogTitle></DialogHeader>
              {editingGame && <GameForm initial={editingGame} onSave={saveGame} saving={saving} userId={author.userId} />}
            </DialogContent>
          </Dialog>
        </header>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : games.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-xl">
            <p className="text-muted-foreground mb-3">Você ainda não criou nenhum jogo.</p>
            <Button onClick={() => { setEditingGame(emptyGame); setDialogOpen(true); }}>Criar primeiro jogo</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {games.map(g => (
              <div key={g.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
                <div className="flex gap-3">
                  {g.logo_url && <img src={g.logo_url} alt="" className="w-14 h-14 rounded-lg object-cover" />}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold truncate">{g.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {g.status === "published" ? "Publicado" : "Rascunho"} · v{g.version || "0.1.0"}
                    </p>
                    <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{g.players_count}</span>
                      <span className="inline-flex items-center gap-1"><Star className="h-3 w-3" />{Number(g.rating_avg).toFixed(1)} ({g.ratings_count})</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => { setEditingGame(g); setDialogOpen(true); }}><Edit className="h-3 w-3" />Editar</Button>
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => setNewsOpen(g)}><Newspaper className="h-3 w-3" />Notícia</Button>
                  <Link to={`/pop-games/jogos/${g.slug}`} target="_blank"><Button size="sm" variant="ghost" className="gap-1"><ExternalLink className="h-3 w-3" />Ver</Button></Link>
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={!!newsOpen} onOpenChange={o => !o && setNewsOpen(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova notícia — {newsOpen?.name}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Título" value={newsTitle} onChange={e => setNewsTitle(e.target.value)} maxLength={140} />
              <Textarea placeholder="Conteúdo" rows={5} value={newsBody} onChange={e => setNewsBody(e.target.value)} maxLength={2000} />
              <Button onClick={submitNews} className="w-full gap-2"><Send className="h-4 w-4" />Publicar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
      <Footer />
    </div>
  );
};

export default DevPanel;
