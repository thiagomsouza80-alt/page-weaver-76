import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/imageCompression";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, LogOut, Camera, Upload, X, Clock, CheckCircle, XCircle, Pencil, Instagram, MapPin, Youtube, Phone, Home } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { membershipTypes, membershipDescriptions, membershipPaymentInfo } from "@/lib/membership";
import ShareButtons from "@/components/ShareButtons";
import MyProductsSection from "@/components/social/MyProductsSection";
import MeusIngressosSection from "@/components/tickets/MeusIngressosSection";
import NotificationSettingsCard from "@/components/notifications/NotificationSettingsCard";
import MessengerVerificationCard from "@/components/messenger/MessengerVerificationCard";


type ProfileType = "artist" | "entrepreneur" | null;

const getSlug = (name: string) =>
  name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

interface ArtistData {
  id: string;
  name: string;
  segment: string;
  bio: string | null;
  city: string | null;
  instagram: string | null;
  youtube_url: string | null;
  phone: string | null;
  membership_type: string;
  membership_approved_at: string | null;
  membership_expires_at: string | null;
  profile_image_url: string | null;
  portfolio_images: string[] | null;
  fan_count: number;
}

interface EntrepreneurData {
  id: string;
  name: string;
  slug?: string;
  badge: string;
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

const segments = [
  { value: "cosplayer", label: "Cosplayer" }, { value: "cosmaker", label: "Cosmaker" },
  { value: "kpop", label: "K-Pop" }, { value: "ilustrador", label: "Ilustrador" },
  { value: "quadrinista", label: "Quadrinista" }, { value: "colecionador", label: "Colecionador" },
  { value: "desenvolvedor_jogos", label: "Desenvolvedor de Jogos" }, { value: "fan_cultura_pop", label: "Fã de Cultura Pop" },
  { value: "youtuber", label: "YouTuber" }, { value: "influenciador_digital", label: "Influenciador Digital" },
] as const;

const segmentLabels: Record<string, string> = {
  cosplayer: "Cosplayer", cosmaker: "Cosmaker", kpop: "K-Pop", ilustrador: "Ilustrador",
  quadrinista: "Quadrinista", colecionador: "Colecionador", desenvolvedor_jogos: "Desenvolvedor de Jogos",
  fan_cultura_pop: "Fã de Cultura Pop", youtuber: "YouTuber", influenciador_digital: "Influenciador Digital",
};

const MeuPerfil = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [profileType, setProfileType] = useState<ProfileType>(null);
  const [artistData, setArtistData] = useState<ArtistData | null>(null);
  const [entrepreneurData, setEntrepreneurData] = useState<EntrepreneurData | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [pendingUpdates, setPendingUpdates] = useState<PendingUpdate[]>([]);
  const [newProfileImage, setNewProfileImage] = useState<File | null>(null);
  const [newProfilePreview, setNewProfilePreview] = useState<string | null>(null);
  const [newPortfolioFiles, setNewPortfolioFiles] = useState<File[]>([]);
  const [newPortfolioPreviews, setNewPortfolioPreviews] = useState<string[]>([]);
  const [removedPortfolioImages, setRemovedPortfolioImages] = useState<string[]>([]);
  const [showMembershipQR, setShowMembershipQR] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/login"); return; }
    const userId = session.user.id;
    setUserId(userId);

    const { data: artist } = await supabase
      .from("artists")
      .select("id, name, segment, bio, city, instagram, youtube_url, phone, membership_type, membership_approved_at, membership_expires_at, profile_image_url, portfolio_images, fan_count")
      .eq("user_id", userId)
      .maybeSingle();

    if (artist) {
      setProfileType("artist");
      setArtistData(artist as ArtistData);
      setForm({ name: artist.name || "", segment: artist.segment || "", bio: artist.bio || "", city: artist.city || "", instagram: artist.instagram || "", youtube_url: artist.youtube_url || "", phone: artist.phone || "", membership_type: artist.membership_type || "free" });
      const { data: pending } = await supabase.from("artist_pending_updates").select("*").eq("artist_id", artist.id).order("created_at", { ascending: false }).limit(5);
      setPendingUpdates((pending || []) as unknown as PendingUpdate[]);
      setLoading(false);
      return;
    }

    const { data: entrepreneur } = await supabase
      .from("entrepreneurs")
      .select("id, name, slug, badge, description, full_description, address, phone, instagram, hero_image_url, portfolio_images")
      .eq("user_id", userId)
      .maybeSingle();

    if (entrepreneur) {
      setProfileType("entrepreneur");
      setEntrepreneurData(entrepreneur as EntrepreneurData);
      setForm({ name: entrepreneur.name || "", badge: entrepreneur.badge || "", description: entrepreneur.description || "", full_description: entrepreneur.full_description || "", address: entrepreneur.address || "", phone: entrepreneur.phone || "", instagram: entrepreneur.instagram || "" });
      const { data: pending } = await supabase.from("entrepreneur_pending_updates" as any).select("*").eq("entrepreneur_id", entrepreneur.id).order("created_at", { ascending: false }).limit(5);
      setPendingUpdates((pending || []) as unknown as PendingUpdate[]);
      setLoading(false);
      return;
    }

    navigate("/login");
  };

  const handleProfileImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast({ title: "Arquivo muito grande", description: "Máximo 5MB", variant: "destructive" }); return; }
    setNewProfileImage(file);
    setNewProfilePreview(URL.createObjectURL(file));
  };

  const handleNewPortfolioImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const max = 20;
    const currentCount = (profileType === "artist" ? artistData?.portfolio_images?.length : entrepreneurData?.portfolio_images?.length) || 0;
    if (currentCount + newPortfolioFiles.length + files.length > max) { toast({ title: `Máximo ${max} imagens`, variant: "destructive" }); return; }
    const valid = files.filter(f => f.size <= 5 * 1024 * 1024);
    setNewPortfolioFiles(prev => [...prev, ...valid]);
    setNewPortfolioPreviews(prev => [...prev, ...valid.map(f => URL.createObjectURL(f))]);
  };

  const uploadFile = async (file: File, bucket: string, folder: string) => {
    const compressed = await compressImage(file);
    const ext = compressed.name.split(".").pop();
    const path = `${folder}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, compressed);
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
        if (form.name !== (artistData.name || "")) changes.name = form.name;
        if (form.segment !== (artistData.segment || "")) changes.segment = form.segment;
        if (form.bio !== (artistData.bio || "")) changes.bio = form.bio;
        if (form.city !== (artistData.city || "")) changes.city = form.city;
        if (form.instagram !== (artistData.instagram || "")) changes.instagram = form.instagram;
        if (form.youtube_url !== (artistData.youtube_url || "")) changes.youtube_url = form.youtube_url;
        if (form.phone !== (artistData.phone || "")) changes.phone = form.phone;
        if (form.membership_type !== (artistData.membership_type || "free")) changes.membership_type = form.membership_type;
        if (newProfileImage) changes.profile_image_url = await uploadFile(newProfileImage, "artists", "profiles");
        const remainingExisting = (artistData.portfolio_images || []).filter(url => !removedPortfolioImages.includes(url));
        const newUrls: string[] = [];
        if (newPortfolioFiles.length > 0) {
          for (const file of newPortfolioFiles) newUrls.push(await uploadFile(file, "artists", "portfolio"));
        }
        if (newPortfolioFiles.length > 0 || removedPortfolioImages.length > 0) {
          changes.portfolio_images = [...remainingExisting, ...newUrls];
        }
        if (Object.keys(changes).length === 0) { toast({ title: "Nenhuma alteração detectada" }); setSaving(false); return; }
        // Apply changes directly to the profile
        const { error: updateError } = await supabase.from("artists").update(changes as any).eq("id", artistData.id);
        if (updateError) throw updateError;
        // Also record the update for admin tracking
        await supabase.from("artist_pending_updates").insert({ artist_id: artistData.id, user_id: session.user.id, changes: changes as any, status: "auto_approved" });
      }

      if (profileType === "entrepreneur" && entrepreneurData) {
        if (form.name !== (entrepreneurData.name || "")) changes.name = form.name;
        if (form.badge !== (entrepreneurData.badge || "")) changes.badge = form.badge;
        if (form.description !== (entrepreneurData.description || "")) changes.description = form.description;
        if (form.full_description !== (entrepreneurData.full_description || "")) changes.full_description = form.full_description;
        if (form.address !== (entrepreneurData.address || "")) changes.address = form.address;
        if (form.phone !== (entrepreneurData.phone || "")) changes.phone = form.phone;
        if (form.instagram !== (entrepreneurData.instagram || "")) changes.instagram = form.instagram;
        if (newProfileImage) changes.hero_image_url = await uploadFile(newProfileImage, "entrepreneurs", "hero");
        const remainingExistingE = (entrepreneurData.portfolio_images || []).filter(url => !removedPortfolioImages.includes(url));
        const newUrlsE: string[] = [];
        if (newPortfolioFiles.length > 0) {
          for (const file of newPortfolioFiles) newUrlsE.push(await uploadFile(file, "entrepreneurs", "portfolio"));
        }
        if (newPortfolioFiles.length > 0 || removedPortfolioImages.length > 0) {
          changes.portfolio_images = [...remainingExistingE, ...newUrlsE];
        }
        if (Object.keys(changes).length === 0) { toast({ title: "Nenhuma alteração detectada" }); setSaving(false); return; }
        // Apply changes directly to the profile
        const { error: updateError } = await supabase.from("entrepreneurs").update(changes as any).eq("id", entrepreneurData.id);
        if (updateError) throw updateError;
        // Also record the update for admin tracking
        await supabase.from("entrepreneur_pending_updates" as any).insert({ entrepreneur_id: entrepreneurData.id, user_id: session.user.id, changes, status: "auto_approved" } as any);
      }

      // Check if membership was upgraded to a paid plan
      const newMembership = changes.membership_type;
      if (newMembership && newMembership !== "free" && membershipPaymentInfo[newMembership]) {
        setShowMembershipQR(newMembership);
      }

      toast({ title: "Perfil atualizado!", description: "Suas alterações foram aplicadas com sucesso." });
      setNewProfileImage(null); setNewProfilePreview(null); setNewPortfolioFiles([]); setNewPortfolioPreviews([]); setRemovedPortfolioImages([]);
      setEditing(false);
      loadProfile();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); navigate("/"); };

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

  const currentProfileImage = profileType === "artist" ? artistData?.profile_image_url : entrepreneurData?.hero_image_url;
  const currentName = profileType === "artist" ? artistData?.name : entrepreneurData?.name;

  // QR Code modal for membership upgrade
  const qrPaymentInfo = showMembershipQR ? membershipPaymentInfo[showMembershipQR] : null;

  // VIEW MODE
  if (!editing) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        {showMembershipQR && qrPaymentInfo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-card rounded-2xl border border-border/50 p-8 max-w-md w-full text-center shadow-xl">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-2">Plano Alterado!</h3>
              <p className="text-muted-foreground mb-6">
                Para ativar o plano <strong>{qrPaymentInfo.label}</strong>, realize o pagamento de <strong>{qrPaymentInfo.price}</strong> via PIX usando o QR Code abaixo:
              </p>
              <div className="bg-white rounded-xl p-4 inline-block mb-4">
                <img
                  src={qrPaymentInfo.qrCodeImage}
                  alt={`QR Code para pagamento ${qrPaymentInfo.label}`}
                  className="w-56 h-56 object-contain mx-auto"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
              {qrPaymentInfo.pixCode && (
                <div className="mb-4 text-center">
                  <p className="text-sm font-semibold mb-2">Pix copiar e colar</p>
                  <div className="relative">
                    <textarea
                      readOnly
                      value={qrPaymentInfo.pixCode}
                      className="w-full text-xs bg-muted rounded-lg p-3 resize-none border border-border"
                      rows={3}
                      onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-2"
                      onClick={() => {
                        navigator.clipboard.writeText(qrPaymentInfo.pixCode!);
                        toast({ title: "Código PIX copiado!" });
                      }}
                    >
                      Copiar código
                    </Button>
                  </div>
                </div>
              )}
              <p className="text-sm text-muted-foreground mb-6">
                Após o pagamento, seu plano será ativado pelo administrador.
              </p>
              <Button variant="outline" size="lg" onClick={() => setShowMembershipQR(null)}>
                Fechar
              </Button>
            </div>
          </div>
        )}
        <div className="pt-24 pb-16 px-6 max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold">Meu Perfil</h1>
              <p className="text-muted-foreground text-sm">
                {currentName} · {profileType === "artist" ? "Artista" : "Empreendedor"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="hero" size="sm" onClick={() => setEditing(true)} className="gap-2">
                <Pencil className="h-4 w-4" />
                Editar Perfil
              </Button>
              <Button variant="ghost" onClick={handleLogout} className="gap-2 text-muted-foreground">
                <LogOut className="h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>

          {/* Profile card */}
          <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
            {/* Header with image */}
            <div className="flex flex-col sm:flex-row items-center gap-6 p-6">
              <div className="w-28 h-28 rounded-full bg-secondary overflow-hidden shrink-0 border-2 border-primary/20">
                {currentProfileImage ? (
                  <img src={currentProfileImage} alt={currentName || ""} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-3xl font-bold text-muted-foreground/40">{currentName?.[0]}</span>
                  </div>
                )}
              </div>
              <div className="text-center sm:text-left">
                <h2 className="text-xl font-bold">{currentName}</h2>
                <p className="text-primary text-sm font-medium">
                  {profileType === "artist" ? segmentLabels[artistData?.segment || ""] || artistData?.segment : entrepreneurData?.badge}
                </p>
                {profileType === "artist" && artistData && artistData.fan_count > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">❤️ {artistData.fan_count} {artistData.fan_count === 1 ? "fã" : "fãs"}</p>
                )}
                {profileType === "artist" && artistData && (
                  <ShareButtons label="Compartilhar link do perfil" hint={`amazoniapop.com/artistas/${getSlug(artistData.name)}`} overridePath={`/artistas/${getSlug(artistData.name)}`} />
                )}
                {profileType === "entrepreneur" && entrepreneurData?.slug && (
                  <ShareButtons label="Compartilhar link do perfil" hint={`amazoniapop.com/empreendedores/${entrepreneurData.slug}`} overridePath={`/empreendedores/${entrepreneurData.slug}`} />
                )}
                {profileType === "artist" && artistData && artistData.membership_type !== "free" && (
                  <div className="mt-2 p-3 rounded-lg bg-primary/10 text-sm">
                    <p className="font-semibold text-primary">
                      {membershipTypes.find(m => m.value === artistData.membership_type)?.label || artistData.membership_type}
                    </p>
                    {artistData.membership_expires_at ? (
                      <p className="text-muted-foreground text-xs mt-1">
                        {new Date(artistData.membership_expires_at) > new Date()
                          ? `Válido até ${new Date(artistData.membership_expires_at).toLocaleDateString("pt-BR")}`
                          : "⚠️ Plano expirado"}
                      </p>
                    ) : (
                      <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">⏳ Aguardando aprovação do administrador</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-border/50 p-6 space-y-4">
              {profileType === "artist" && artistData && (
                <>
                  {artistData.bio && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Bio</p>
                      <p className="text-sm leading-relaxed">{artistData.bio}</p>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-4">
                    {artistData.city && (
                      <span className="text-sm text-muted-foreground flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{artistData.city}</span>
                    )}
                    {artistData.instagram && (
                      <span className="text-sm text-muted-foreground flex items-center gap-1.5"><Instagram className="h-3.5 w-3.5" />{artistData.instagram}</span>
                    )}
                    {artistData.youtube_url && (
                      <span className="text-sm text-muted-foreground flex items-center gap-1.5"><Youtube className="h-3.5 w-3.5" />YouTube</span>
                    )}
                  </div>
                </>
              )}

              {profileType === "entrepreneur" && entrepreneurData && (
                <>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Descrição</p>
                    <p className="text-sm leading-relaxed">{entrepreneurData.description}</p>
                  </div>
                  {entrepreneurData.full_description && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Descrição Completa</p>
                      <p className="text-sm leading-relaxed">{entrepreneurData.full_description}</p>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-4">
                    {entrepreneurData.address && (
                      <span className="text-sm text-muted-foreground flex items-center gap-1.5"><Home className="h-3.5 w-3.5" />{entrepreneurData.address}</span>
                    )}
                    {entrepreneurData.phone && (
                      <span className="text-sm text-muted-foreground flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{entrepreneurData.phone}</span>
                    )}
                    {entrepreneurData.instagram && (
                      <span className="text-sm text-muted-foreground flex items-center gap-1.5"><Instagram className="h-3.5 w-3.5" />{entrepreneurData.instagram}</span>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Portfolio */}
            {((profileType === "artist" ? artistData?.portfolio_images : entrepreneurData?.portfolio_images) || []).length > 0 && (
              <div className="border-t border-border/50 p-6">
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">Portfólio</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(profileType === "artist" ? artistData?.portfolio_images : entrepreneurData?.portfolio_images)?.map((src, i) => (
                    <div key={i} className="aspect-square rounded-xl overflow-hidden bg-secondary">
                      <img src={src} alt={`Portfolio ${i + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-8">
            <MeusIngressosSection />
          </div>

          <div className="mt-8">
            <NotificationSettingsCard />
          </div>

        </div>
        <Footer />
      </div>
    );
  }

  // EDIT MODE
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 px-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Editar Perfil</h1>
            <p className="text-muted-foreground text-sm">
              {currentName} · {profileType === "artist" ? "Artista" : "Empreendedor"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => { setEditing(false); setNewProfileImage(null); setNewProfilePreview(null); setNewPortfolioFiles([]); setNewPortfolioPreviews([]); setRemovedPortfolioImages([]); }} className="text-muted-foreground">
              Cancelar
            </Button>
            <Button variant="ghost" onClick={handleLogout} className="gap-2 text-muted-foreground">
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>

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

        {profileType === "artist" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Nome Completo</Label>
                <Input value={form.name || ""} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Seu nome completo" />
              </div>
              <div className="space-y-2">
                <Label>Segmento</Label>
                <Select value={form.segment || ""} onValueChange={(val) => setForm(f => ({ ...f, segment: val }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione seu segmento" />
                  </SelectTrigger>
                  <SelectContent>
                    {segments.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Bio</Label>
              <Textarea value={form.bio || ""} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} rows={4} placeholder="Sobre você..." />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input value={form.city || ""} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Ex: Belém - PA" />
              </div>
              <div className="space-y-2">
                <Label>Instagram</Label>
                <Input value={form.instagram || ""} onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))} placeholder="@seuinstagram" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Telefone / WhatsApp</Label>
                <Input value={form.phone || ""} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(91) 99999-9999" />
              </div>
              <div className="space-y-2">
                <Label>YouTube URL</Label>
                <Input value={form.youtube_url || ""} onChange={e => setForm(f => ({ ...f, youtube_url: e.target.value }))} placeholder="https://youtube.com/..." />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tipo de Membro</Label>
              <Select value={form.membership_type || "free"} onValueChange={(val) => setForm(f => ({ ...f, membership_type: val }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo de membro" />
                </SelectTrigger>
                <SelectContent>
                  {membershipTypes.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.membership_type && membershipDescriptions[form.membership_type] && (
                <p className="text-sm text-primary font-medium mt-2 p-3 rounded-lg bg-primary/10">
                  {membershipDescriptions[form.membership_type]}
                </p>
              )}
            </div>
          </div>
        )}

        {profileType === "entrepreneur" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Nome do Negócio</Label>
                <Input value={form.name || ""} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome do seu negócio" />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Input value={form.badge || ""} onChange={e => setForm(f => ({ ...f, badge: e.target.value }))} placeholder="Ex: Loja Geek, Gastronomia" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição Curta</Label>
              <Input value={form.description || ""} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Descrição Completa</Label>
              <Textarea value={form.full_description || ""} onChange={e => setForm(f => ({ ...f, full_description: e.target.value }))} rows={5} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label>Endereço</Label>
                <Input value={form.address || ""} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={form.phone || ""} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Instagram</Label>
                <Input value={form.instagram || ""} onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))} />
              </div>
            </div>
          </div>
        )}

        {/* Portfolio */}
        <div className="space-y-3 mt-8">
          <Label>Portfólio</Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(profileType === "artist" ? artistData?.portfolio_images : entrepreneurData?.portfolio_images)?.filter(src => !removedPortfolioImages.includes(src)).map((src, i) => (
              <div key={src} className="relative aspect-square rounded-xl overflow-hidden bg-secondary group">
                <img src={src} alt={`Portfolio ${i + 1}`} className="w-full h-full object-cover" />
                {editing && (
                  <button
                    type="button"
                    onClick={() => setRemovedPortfolioImages(prev => [...prev, src])}
                    className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                    aria-label="Remover foto"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
            {newPortfolioPreviews.map((src, i) => (
              <div key={`new-${i}`} className="relative aspect-square rounded-xl overflow-hidden bg-secondary group">
                <img src={src} alt={`Novo ${i + 1}`} className="w-full h-full object-cover" />
                <div className="absolute top-1 right-1 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded">Novo</div>
                <button type="button" onClick={() => { setNewPortfolioFiles(f => f.filter((_, idx) => idx !== i)); setNewPortfolioPreviews(f => f.filter((_, idx) => idx !== i)); }} className="absolute bottom-1 right-1 bg-background/80 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
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



        {profileType === "entrepreneur" && entrepreneurData?.id && userId && (
          <div className="mt-12 pt-8 border-t border-border">
            <MyProductsSection userId={userId} entrepreneurId={entrepreneurData.id} />
          </div>
        )}


        <div className="mt-10">
          <Button onClick={handleSubmit} variant="hero" size="lg" disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Atualizar Perfil
          </Button>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default MeuPerfil;
