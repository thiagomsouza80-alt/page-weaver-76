import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, LogOut, Camera, Upload, X, Clock, CheckCircle, XCircle } from "lucide-react";

type ProfileType = "artist" | "entrepreneur" | null;

interface ArtistData {
  id: string;
  name: string;
  bio: string | null;
  city: string | null;
  instagram: string | null;
  youtube_url: string | null;
  profile_image_url: string | null;
  portfolio_images: string[] | null;
}

interface EntrepreneurData {
  id: string;
  name: string;
  description: string;
  full_description: string | null;
  address: string | null;
  phone: string | null;
  instagram: string | null;
  hero_image_url: string | null;
  portfolio_images: string[] | null;
}

interface PendingUpdate {
  id: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  changes: Record<string, any>;
}

const MeuPerfil = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileType, setProfileType] = useState<ProfileType>(null);
  const [artistData, setArtistData] = useState<ArtistData | null>(null);
  const [entrepreneurData, setEntrepreneurData] = useState<EntrepreneurData | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [pendingUpdates, setPendingUpdates] = useState<PendingUpdate[]>([]);
  const [newProfileImage, setNewProfileImage] = useState<File | null>(null);
  const [newProfilePreview, setNewProfilePreview] = useState<string | null>(null);
  const [newPortfolioFiles, setNewPortfolioFiles] = useState<File[]>([]);
  const [newPortfolioPreviews, setNewPortfolioPreviews] = useState<string[]>([]);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/login");
      return;
    }

    const userId = session.user.id;

    // Check artist
    const { data: artist } = await supabase
      .from("artists")
      .select("id, name, bio, city, instagram, youtube_url, profile_image_url, portfolio_images")
      .eq("user_id", userId)
      .maybeSingle();

    if (artist) {
      setProfileType("artist");
      setArtistData(artist);
      setForm({
        bio: artist.bio || "",
        city: artist.city || "",
        instagram: artist.instagram || "",
        youtube_url: artist.youtube_url || "",
      });

      // Load pending updates
      const { data: pending } = await supabase
        .from("artist_pending_updates")
        .select("*")
        .eq("artist_id", artist.id)
        .order("created_at", { ascending: false })
        .limit(5);

      setPendingUpdates((pending || []) as unknown as PendingUpdate[]);
      setLoading(false);
      return;
    }

    // Check entrepreneur
    const { data: entrepreneur } = await supabase
      .from("entrepreneurs")
      .select("id, name, description, full_description, address, phone, instagram, hero_image_url, portfolio_images")
      .eq("user_id", userId)
      .maybeSingle();

    if (entrepreneur) {
      setProfileType("entrepreneur");
      setEntrepreneurData(entrepreneur);
      setForm({
        description: entrepreneur.description || "",
        full_description: entrepreneur.full_description || "",
        address: entrepreneur.address || "",
        phone: entrepreneur.phone || "",
        instagram: entrepreneur.instagram || "",
      });

      const { data: pending } = await supabase
        .from("entrepreneur_pending_updates" as any)
        .select("*")
        .eq("entrepreneur_id", entrepreneur.id)
        .order("created_at", { ascending: false })
        .limit(5);

      setPendingUpdates((pending || []) as unknown as PendingUpdate[]);
      setLoading(false);
      return;
    }

    // No profile found
    navigate("/login");
  };

  const handleProfileImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máximo 5MB", variant: "destructive" });
      return;
    }
    setNewProfileImage(file);
    setNewProfilePreview(URL.createObjectURL(file));
  };

  const handleNewPortfolioImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const max = profileType === "artist" ? 6 : 10;
    const currentCount = (profileType === "artist" ? artistData?.portfolio_images?.length : entrepreneurData?.portfolio_images?.length) || 0;
    if (currentCount + newPortfolioFiles.length + files.length > max) {
      toast({ title: `Máximo ${max} imagens`, variant: "destructive" });
      return;
    }
    const valid = files.filter(f => f.size <= 5 * 1024 * 1024);
    setNewPortfolioFiles(prev => [...prev, ...valid]);
    setNewPortfolioPreviews(prev => [...prev, ...valid.map(f => URL.createObjectURL(f))]);
  };

  const uploadFile = async (file: File, bucket: string, folder: string) => {
    const ext = file.name.split(".").pop();
    const path = `${folder}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada");

      const changes: Record<string, any> = {};

      if (profileType === "artist" && artistData) {
        if (form.bio !== (artistData.bio || "")) changes.bio = form.bio;
        if (form.city !== (artistData.city || "")) changes.city = form.city;
        if (form.instagram !== (artistData.instagram || "")) changes.instagram = form.instagram;
        if (form.youtube_url !== (artistData.youtube_url || "")) changes.youtube_url = form.youtube_url;

        if (newProfileImage) {
          const url = await uploadFile(newProfileImage, "artists", "profiles");
          changes.profile_image_url = url;
        }

        if (newPortfolioFiles.length > 0) {
          const urls: string[] = [];
          for (const file of newPortfolioFiles) {
            urls.push(await uploadFile(file, "artists", "portfolio"));
          }
          changes.portfolio_images = [...(artistData.portfolio_images || []), ...urls];
        }

        if (Object.keys(changes).length === 0) {
          toast({ title: "Nenhuma alteração detectada" });
          setSaving(false);
          return;
        }

        const { error } = await supabase.from("artist_pending_updates").insert({
          artist_id: artistData.id,
          user_id: session.user.id,
          changes,
        });
        if (error) throw error;
      }

      if (profileType === "entrepreneur" && entrepreneurData) {
        if (form.description !== (entrepreneurData.description || "")) changes.description = form.description;
        if (form.full_description !== (entrepreneurData.full_description || "")) changes.full_description = form.full_description;
        if (form.address !== (entrepreneurData.address || "")) changes.address = form.address;
        if (form.phone !== (entrepreneurData.phone || "")) changes.phone = form.phone;
        if (form.instagram !== (entrepreneurData.instagram || "")) changes.instagram = form.instagram;

        if (newProfileImage) {
          const url = await uploadFile(newProfileImage, "entrepreneurs", "hero");
          changes.hero_image_url = url;
        }

        if (newPortfolioFiles.length > 0) {
          const urls: string[] = [];
          for (const file of newPortfolioFiles) {
            urls.push(await uploadFile(file, "entrepreneurs", "portfolio"));
          }
          changes.portfolio_images = [...(entrepreneurData.portfolio_images || []), ...urls];
        }

        if (Object.keys(changes).length === 0) {
          toast({ title: "Nenhuma alteração detectada" });
          setSaving(false);
          return;
        }

        const { error } = await supabase.from("entrepreneur_pending_updates" as any).insert({
          entrepreneur_id: entrepreneurData.id,
          user_id: session.user.id,
          changes,
        } as any);
        if (error) throw error;
      }

      toast({
        title: "Alterações enviadas!",
        description: "Suas alterações serão analisadas pelo administrador.",
      });

      setNewProfileImage(null);
      setNewProfilePreview(null);
      setNewPortfolioFiles([]);
      setNewPortfolioPreviews([]);
      loadProfile();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[80vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const currentProfileImage = profileType === "artist"
    ? artistData?.profile_image_url
    : entrepreneurData?.hero_image_url;

  const currentName = profileType === "artist" ? artistData?.name : entrepreneurData?.name;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 px-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Meu Perfil</h1>
            <p className="text-muted-foreground text-sm">
              {currentName} · {profileType === "artist" ? "Artista" : "Empreendedor"}
            </p>
          </div>
          <Button variant="ghost" onClick={handleLogout} className="gap-2 text-muted-foreground">
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>

        {/* Pending updates history */}
        {pendingUpdates.length > 0 && (
          <div className="mb-8 space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">Histórico de Atualizações</h2>
            {pendingUpdates.map(u => (
              <div key={u.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 text-sm">
                {u.status === "pending" && <Clock className="h-4 w-4 text-yellow-500 shrink-0" />}
                {u.status === "approved" && <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />}
                {u.status === "rejected" && <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
                <div className="flex-1">
                  <span className="font-medium">
                    {u.status === "pending" ? "Pendente" : u.status === "approved" ? "Aprovada" : "Rejeitada"}
                  </span>
                  <span className="text-muted-foreground ml-2">
                    {new Date(u.created_at).toLocaleDateString("pt-BR")}
                  </span>
                  {u.admin_notes && (
                    <p className="text-xs text-muted-foreground mt-1">Nota: {u.admin_notes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Profile image */}
        <div className="space-y-3 mb-8">
          <Label>{profileType === "artist" ? "Foto de Perfil" : "Imagem Principal"}</Label>
          <div className="flex items-center gap-6">
            <label className="relative w-28 h-28 rounded-full bg-secondary border-2 border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors flex items-center justify-center overflow-hidden group">
              {(newProfilePreview || currentProfileImage) ? (
                <img src={newProfilePreview || currentProfileImage!} alt="Perfil" className="w-full h-full object-cover" />
              ) : (
                <Camera className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
              )}
              <input type="file" accept="image/*" onChange={handleProfileImage} className="hidden" />
            </label>
            <p className="text-sm text-muted-foreground">Clique para alterar</p>
          </div>
        </div>

        {/* Artist fields */}
        {profileType === "artist" && (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Bio</Label>
              <Textarea
                value={form.bio || ""}
                onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                rows={4}
                placeholder="Sobre você..."
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input
                  value={form.city || ""}
                  onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                  placeholder="Ex: Belém - PA"
                />
              </div>
              <div className="space-y-2">
                <Label>Instagram</Label>
                <Input
                  value={form.instagram || ""}
                  onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))}
                  placeholder="@seuinstagram"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>YouTube URL</Label>
              <Input
                value={form.youtube_url || ""}
                onChange={e => setForm(f => ({ ...f, youtube_url: e.target.value }))}
                placeholder="https://youtube.com/..."
              />
            </div>
          </div>
        )}

        {/* Entrepreneur fields */}
        {profileType === "entrepreneur" && (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Descrição Curta</Label>
              <Input
                value={form.description || ""}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição Completa</Label>
              <Textarea
                value={form.full_description || ""}
                onChange={e => setForm(f => ({ ...f, full_description: e.target.value }))}
                rows={5}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label>Endereço</Label>
                <Input
                  value={form.address || ""}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={form.phone || ""}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Instagram</Label>
                <Input
                  value={form.instagram || ""}
                  onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))}
                />
              </div>
            </div>
          </div>
        )}

        {/* Portfolio section */}
        <div className="space-y-3 mt-8">
          <Label>Portfólio</Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(profileType === "artist" ? artistData?.portfolio_images : entrepreneurData?.portfolio_images)?.map((src, i) => (
              <div key={i} className="aspect-square rounded-xl overflow-hidden bg-secondary">
                <img src={src} alt={`Portfolio ${i + 1}`} className="w-full h-full object-cover" />
              </div>
            ))}
            {newPortfolioPreviews.map((src, i) => (
              <div key={`new-${i}`} className="relative aspect-square rounded-xl overflow-hidden bg-secondary group">
                <img src={src} alt={`Novo ${i + 1}`} className="w-full h-full object-cover" />
                <div className="absolute top-1 right-1 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded">Novo</div>
                <button
                  type="button"
                  onClick={() => {
                    setNewPortfolioFiles(f => f.filter((_, idx) => idx !== i));
                    setNewPortfolioPreviews(f => f.filter((_, idx) => idx !== i));
                  }}
                  className="absolute bottom-1 right-1 bg-background/80 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            <label className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary/50 cursor-pointer flex flex-col items-center justify-center gap-1 transition-colors">
              <Upload className="h-5 w-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Adicionar</span>
              <input type="file" accept="image/*" multiple onChange={handleNewPortfolioImages} className="hidden" />
            </label>
          </div>
        </div>

        {/* Submit */}
        <div className="mt-10">
          <Button onClick={handleSubmit} variant="hero" size="lg" disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Enviar Alterações para Aprovação
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            As alterações serão revisadas pelo administrador antes de serem publicadas.
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default MeuPerfil;
