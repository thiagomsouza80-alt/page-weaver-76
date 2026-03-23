import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, LogOut, Save, Upload, X, Camera, Heart, Eye, ExternalLink, Clock, CheckCircle, XCircle,
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

const segmentLabels: Record<string, string> = {
  cosplayer: "Cosplayer",
  cosmaker: "Cosmaker",
  kpop: "K-Pop",
  ilustrador: "Ilustrador",
  quadrinista: "Quadrinista",
  colecionador: "Colecionador",
  desenvolvedor_jogos: "Desenvolvedor de Jogos",
  fan_cultura_pop: "Fã de Cultura Pop",
  youtuber: "YouTuber",
  influenciador_digital: "Influenciador Digital",
};

const getSlug = (name: string) =>
  name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

interface PendingUpdate {
  id: string;
  changes: Record<string, any>;
  status: string;
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
}

const ArtistaDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [artist, setArtist] = useState<Tables<"artists"> | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [pendingUpdates, setPendingUpdates] = useState<PendingUpdate[]>([]);
  const [hasPending, setHasPending] = useState(false);

  // Editable fields
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [instagram, setInstagram] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");

  // Profile image
  const [newProfileImage, setNewProfileImage] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);

  // Portfolio
  const [portfolioImages, setPortfolioImages] = useState<string[]>([]);
  const [newPortfolioFiles, setNewPortfolioFiles] = useState<File[]>([]);
  const [newPortfolioPreviews, setNewPortfolioPreviews] = useState<string[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/artista/login"); return; }

      setUserId(user.id);

      const { data: artistData } = await supabase
        .from("artists")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!artistData) { navigate("/artista/login"); return; }

      setArtist(artistData);
      setBio(artistData.bio || "");
      setCity(artistData.city || "");
      setInstagram(artistData.instagram || "");
      setYoutubeUrl((artistData as any).youtube_url || "");
      setPortfolioImages(artistData.portfolio_images?.filter(Boolean) || []);
      setProfilePreview(artistData.profile_image_url);

      // Load pending updates
      const { data: pending } = await supabase
        .from("artist_pending_updates")
        .select("*")
        .eq("artist_id", artistData.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (pending) {
        setPendingUpdates(pending as unknown as PendingUpdate[]);
        setHasPending(pending.some((p: any) => p.status === "pending"));
      }

      setLoading(false);
    };

    loadData();
  }, [navigate]);

  const uploadFile = async (file: File, folder: string) => {
    const ext = file.name.split(".").pop();
    const path = `${folder}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("artists").upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from("artists").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleProfileImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máximo 5MB", variant: "destructive" });
      return;
    }
    setNewProfileImage(file);
    setProfilePreview(URL.createObjectURL(file));
  };

  const handleNewPortfolioImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const total = portfolioImages.length + newPortfolioFiles.length + files.length;
    if (total > 6) {
      toast({ title: "Máximo 6 imagens", variant: "destructive" });
      return;
    }
    const valid = files.filter(f => f.size <= 5 * 1024 * 1024);
    setNewPortfolioFiles(prev => [...prev, ...valid]);
    setNewPortfolioPreviews(prev => [...prev, ...valid.map(f => URL.createObjectURL(f))]);
  };

  const removeExistingPortfolio = (index: number) => {
    setPortfolioImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeNewPortfolio = (index: number) => {
    setNewPortfolioFiles(prev => prev.filter((_, i) => i !== index));
    setNewPortfolioPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!artist || !userId) return;

    if (hasPending) {
      toast({
        title: "Atualização pendente",
        description: "Você já tem uma atualização aguardando aprovação. Aguarde a análise do administrador.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // Upload new images first
      let newProfileUrl: string | null = null;
      if (newProfileImage) {
        newProfileUrl = await uploadFile(newProfileImage, "profiles");
      }

      const newPortfolioUrls: string[] = [];
      for (const file of newPortfolioFiles) {
        const url = await uploadFile(file, "portfolio");
        newPortfolioUrls.push(url);
      }

      const allPortfolio = [...portfolioImages, ...newPortfolioUrls];

      // Build changes object (only changed fields)
      const changes: Record<string, any> = {};
      if (bio !== (artist.bio || "")) changes.bio = bio || null;
      if (city !== (artist.city || "")) changes.city = city || null;
      if (instagram !== (artist.instagram || "")) changes.instagram = instagram || null;
      if (youtubeUrl !== ((artist as any).youtube_url || "")) changes.youtube_url = youtubeUrl || null;
      if (newProfileUrl) changes.profile_image_url = newProfileUrl;

      const currentPortfolio = artist.portfolio_images?.filter(Boolean) || [];
      if (JSON.stringify(allPortfolio) !== JSON.stringify(currentPortfolio)) {
        changes.portfolio_images = allPortfolio;
      }

      if (Object.keys(changes).length === 0) {
        toast({ title: "Nenhuma alteração", description: "Você não modificou nenhum dado." });
        setSaving(false);
        return;
      }

      // Submit as pending update
      const { error } = await supabase
        .from("artist_pending_updates")
        .insert({
          artist_id: artist.id,
          user_id: userId,
          changes,
        });

      if (error) throw error;

      setHasPending(true);
      setNewProfileImage(null);
      setNewPortfolioFiles([]);
      setNewPortfolioPreviews([]);

      // Refresh pending updates
      const { data: pending } = await supabase
        .from("artist_pending_updates")
        .select("*")
        .eq("artist_id", artist.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (pending) setPendingUpdates(pending as unknown as PendingUpdate[]);

      toast({
        title: "Atualização enviada!",
        description: "Suas alterações serão analisadas pelo administrador antes de serem publicadas.",
      });
    } catch (err: any) {
      toast({ title: "Erro ao enviar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/artista/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex justify-center items-center py-40">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!artist) return null;

  const totalPortfolio = portfolioImages.length + newPortfolioFiles.length;

  const statusIcon = (status: string) => {
    if (status === "pending") return <Clock className="h-4 w-4 text-yellow-500" />;
    if (status === "approved") return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <XCircle className="h-4 w-4 text-destructive" />;
  };

  const statusLabel = (status: string) => {
    if (status === "pending") return "Em análise";
    if (status === "approved") return "Aprovada";
    return "Rejeitada";
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 px-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 animate-fade-up">
          <div>
            <h1 className="text-3xl font-bold">Meu Perfil</h1>
            <p className="text-muted-foreground">Gerencie suas informações e portfólio</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" size="sm" asChild>
              <a href={`/artistas/${getSlug(artist.name)}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-1" /> Ver perfil público
              </a>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-1" /> Sair
            </Button>
          </div>
        </div>

        {/* Pending update banner */}
        {hasPending && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6 flex items-center gap-3 animate-fade-up">
            <Clock className="h-5 w-5 text-yellow-500 shrink-0" />
            <div>
              <p className="text-sm font-medium">Atualização em análise</p>
              <p className="text-xs text-muted-foreground">
                Você tem alterações aguardando aprovação do administrador. Novas edições só poderão ser enviadas após a análise.
              </p>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8 animate-fade-up">
          <div className="bg-card rounded-xl border border-border p-6 text-center">
            <Heart className="h-6 w-6 text-primary mx-auto mb-2" />
            <p className="text-3xl font-bold">{artist.fan_count}</p>
            <p className="text-sm text-muted-foreground">Fãs</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-6 text-center">
            <Eye className="h-6 w-6 text-primary mx-auto mb-2" />
            {artist.approved ? (
              <p className="text-base font-semibold text-green-500">Aprovado ✓</p>
            ) : (
              <p className="text-base font-semibold text-yellow-500">Em análise</p>
            )}
            <p className="text-sm text-muted-foreground mt-1">Status do perfil</p>
          </div>
        </div>

        {/* Recent updates history */}
        {pendingUpdates.length > 0 && (
          <div className="bg-card rounded-2xl border border-border p-6 mb-8 animate-fade-up">
            <h2 className="text-lg font-bold mb-4">Histórico de Atualizações</h2>
            <div className="space-y-3">
              {pendingUpdates.map((update) => (
                <div key={update.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div className="flex items-center gap-3">
                    {statusIcon(update.status)}
                    <div>
                      <p className="text-sm font-medium">{statusLabel(update.status)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(update.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {Object.keys(update.changes).length} campo(s) alterado(s)
                    </p>
                    {update.admin_notes && (
                      <p className="text-xs text-muted-foreground mt-0.5">Nota: {update.admin_notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Edit Form */}
        <div className="bg-card rounded-2xl border border-border p-8 space-y-8 animate-fade-up-delay-1">
          <h2 className="text-xl font-bold">Editar Informações</h2>
          <p className="text-sm text-muted-foreground -mt-4">
            As alterações serão enviadas para aprovação do administrador antes de serem publicadas.
          </p>

          {/* Profile Photo */}
          <div className="space-y-3">
            <Label>Foto de Perfil</Label>
            <div className="flex items-center gap-6">
              <label className="relative w-28 h-28 rounded-full bg-secondary border-2 border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors flex items-center justify-center overflow-hidden group">
                {profilePreview ? (
                  <img src={profilePreview} alt="Perfil" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
                )}
                <input type="file" accept="image/*" onChange={handleProfileImage} className="hidden" disabled={hasPending} />
              </label>
              <div className="text-sm text-muted-foreground">
                <p>Clique para alterar</p>
                <p className="text-xs">JPG, PNG até 5MB</p>
              </div>
            </div>
          </div>

          {/* Name (read-only) & Segment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Nome Artístico</Label>
              <Input value={artist.name} disabled className="opacity-60" />
              <p className="text-xs text-muted-foreground">Para alterar, entre em contato com o admin</p>
            </div>
            <div className="space-y-2">
              <Label>Segmento</Label>
              <Input value={segmentLabels[artist.segment] || artist.segment} disabled className="opacity-60" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="city">Cidade</Label>
              <Input id="city" placeholder="Ex: Belém - PA" value={city} onChange={e => setCity(e.target.value)} disabled={hasPending} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instagram">Instagram</Label>
              <Input id="instagram" placeholder="@seuinstagram" value={instagram} onChange={e => setInstagram(e.target.value)} disabled={hasPending} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="youtube_url">Vídeo de Apresentação (YouTube)</Label>
            <Input id="youtube_url" placeholder="https://www.youtube.com/watch?v=..." value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} disabled={hasPending} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio / Sobre você</Label>
            <Textarea id="bio" placeholder="Conte um pouco sobre você..." rows={5} value={bio} onChange={e => setBio(e.target.value)} disabled={hasPending} />
          </div>

          {/* Portfolio */}
          <div className="space-y-3">
            <Label>Portfólio ({totalPortfolio}/6 imagens)</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {portfolioImages.map((src, i) => (
                <div key={`existing-${i}`} className="relative aspect-square rounded-xl overflow-hidden bg-secondary group">
                  <img src={src} alt={`Portfolio ${i + 1}`} className="w-full h-full object-cover" />
                  {!hasPending && (
                    <button
                      type="button"
                      onClick={() => removeExistingPortfolio(i)}
                      className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              {newPortfolioPreviews.map((src, i) => (
                <div key={`new-${i}`} className="relative aspect-square rounded-xl overflow-hidden bg-secondary group ring-2 ring-primary/30">
                  <img src={src} alt={`Novo ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeNewPortfolio(i)}
                    className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <span className="absolute bottom-2 left-2 text-[10px] bg-primary/80 text-primary-foreground px-2 py-0.5 rounded-full">Novo</span>
                </div>
              ))}
              {totalPortfolio < 6 && !hasPending && (
                <label className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary/50 cursor-pointer flex flex-col items-center justify-center gap-2 transition-colors group">
                  <Upload className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="text-xs text-muted-foreground">Adicionar</span>
                  <input type="file" accept="image/*" multiple onChange={handleNewPortfolioImages} className="hidden" />
                </label>
              )}
            </div>
          </div>

          <Button onClick={handleSave} variant="hero" size="lg" disabled={saving || hasPending} className="w-full sm:w-auto">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : hasPending ? (
              <>
                <Clock className="h-4 w-4" />
                Aguardando Aprovação
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Enviar para Aprovação
              </>
            )}
          </Button>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ArtistaDashboard;
