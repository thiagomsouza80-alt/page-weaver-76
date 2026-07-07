import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSocialAuthor } from "@/hooks/useSocialAuthor";
import { useGameDeveloper } from "@/hooks/useGameDeveloper";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { uploadGameAsset, GAME_CATEGORIES } from "@/lib/popGames";
import { Loader2, Gamepad2 } from "lucide-react";

const BeDeveloper = () => {
  const nav = useNavigate();
  const { author, loading: aLoading } = useSocialAuthor();
  const { developer, loading: dLoading, reload } = useGameDeveloper(author?.userId ?? null);

  const [studio, setStudio] = useState("");
  const [gameName, setGameName] = useState("");
  const [category, setCategory] = useState("tcg");
  const [description, setDescription] = useState("");
  const [portfolio, setPortfolio] = useState("");
  const [logo, setLogo] = useState<File | null>(null);
  const [banner, setBanner] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  if (aLoading || dLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (!author?.userId) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="max-w-xl mx-auto pt-24 px-4 text-center">
          <h1 className="text-2xl font-bold mb-2">Entre para continuar</h1>
          <p className="text-muted-foreground mb-4">Você precisa estar logado para se tornar desenvolvedor de jogos.</p>
          <Button onClick={() => nav("/login")}>Entrar</Button>
        </main>
        <Footer />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studio.trim() || !gameName.trim()) {
      toast({ title: "Preencha ao menos estúdio e nome do jogo", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      let logoUrl: string | null = null;
      let bannerUrl: string | null = null;
      if (logo) logoUrl = await uploadGameAsset(author.userId, logo, "logo");
      if (banner) bannerUrl = await uploadGameAsset(author.userId, banner, "banner");

      // Upsert developer profile
      let devId = developer?.id;
      if (devId) {
        await (supabase as any).from("game_developers").update({
          studio_name: studio, bio: description, logo_url: logoUrl || developer?.logo_url,
          banner_url: bannerUrl || developer?.banner_url, links: { portfolio },
          status: "pending",
        }).eq("id", devId);
      } else {
        const { data, error } = await (supabase as any).from("game_developers").insert({
          user_id: author.userId, studio_name: studio, bio: description,
          logo_url: logoUrl, banner_url: bannerUrl, links: { portfolio }, status: "pending",
        }).select("id").single();
        if (error) throw error;
        devId = data.id;
      }

      await (supabase as any).from("game_developer_requests").insert({
        developer_id: devId, user_id: author.userId,
        proposed_game_name: gameName, category, description,
        logo_url: logoUrl, banner_url: bannerUrl, links: { portfolio },
        status: "pending",
      });

      toast({ title: "Solicitação enviada!", description: "O administrador vai avaliar em breve." });
      await reload();
      nav("/pop-games");
    } catch (err: any) {
      toast({ title: "Erro", description: err.message || "Falha ao enviar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-2xl mx-auto pt-24 px-4 pb-16">
        <h1 className="text-3xl font-bold flex items-center gap-2 mb-2">
          <Gamepad2 className="h-7 w-7 text-primary" /> Seja Desenvolvedor
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          Publique seus próprios jogos no Pop Games. Você continua com todos os seus outros papéis (artista, empreendedor, organizador, etc).
        </p>

        {developer?.status === "pending" && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/40 text-sm mb-4">
            Sua solicitação anterior está pendente. Você pode reenviar com novos dados abaixo.
          </div>
        )}
        {developer?.status === "approved" && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/40 text-sm mb-4">
            Você já é desenvolvedor aprovado. <a className="underline" href="/pop-games/dev">Ir para o painel</a>.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 bg-card p-5 rounded-xl border border-border">
          <div>
            <Label>Nome do estúdio ou desenvolvedor *</Label>
            <Input value={studio} onChange={e => setStudio(e.target.value)} maxLength={100} required />
          </div>
          <div>
            <Label>Nome do jogo proposto *</Label>
            <Input value={gameName} onChange={e => setGameName(e.target.value)} maxLength={100} required />
          </div>
          <div>
            <Label>Categoria</Label>
            <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={category} onChange={e => setCategory(e.target.value)}>
              {GAME_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} maxLength={1000} />
          </div>
          <div>
            <Label>Redes sociais / Portfólio (opcional)</Label>
            <Input value={portfolio} onChange={e => setPortfolio(e.target.value)} placeholder="https://..." maxLength={300} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Logo (opcional)</Label>
              <Input type="file" accept="image/*" onChange={e => setLogo(e.target.files?.[0] || null)} />
            </div>
            <div>
              <Label>Banner (opcional)</Label>
              <Input type="file" accept="image/*" onChange={e => setBanner(e.target.files?.[0] || null)} />
            </div>
          </div>
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar solicitação"}
          </Button>
        </form>
      </main>
      <Footer />
    </div>
  );
};

export default BeDeveloper;
