import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Camera, CheckCircle, Loader2, AlertTriangle } from "lucide-react";
import { PasswordInput } from "@/components/ui/password-input";
import { membershipTypes, membershipDescriptions } from "@/lib/membership";
import { Alert, AlertDescription } from "@/components/ui/alert";

const segments = [
  { value: "cosplayer", label: "Cosplayer" },
  { value: "cosmaker", label: "Cosmaker" },
  { value: "kpop", label: "K-Pop" },
  { value: "ilustrador", label: "Ilustrador" },
  { value: "quadrinista", label: "Quadrinista" },
  { value: "colecionador", label: "Colecionador" },
  { value: "desenvolvedor_jogos", label: "Desenvolvedor de Jogos" },
  { value: "fan_cultura_pop", label: "Fã de Cultura Pop" },
  { value: "youtuber", label: "YouTuber" },
  { value: "influenciador_digital", label: "Influenciador Digital" },
] as const;

const schema = z.object({
  name: z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres").max(100),
  email: z.string().trim().email("Email inválido").max(255),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  segment: z.enum(["cosplayer", "cosmaker", "kpop", "ilustrador", "quadrinista", "colecionador", "desenvolvedor_jogos", "fan_cultura_pop", "youtuber", "influenciador_digital"], { required_error: "Selecione um segmento" }),
  birth_date: z.string().min(1, "Data de nascimento é obrigatória"),
  guardian_name: z.string().trim().max(100).optional(),
  guardian_phone: z.string().trim().max(30).optional(),
  bio: z.string().trim().max(1000, "Máximo 1000 caracteres").optional(),
  city: z.string().trim().max(100).optional(),
  instagram: z.string().trim().max(100).optional(),
  phone: z.string().trim().max(20, "Máximo 20 caracteres").optional(),
  membership_type: z.enum(["free", "star", "pro", "hero"]).default("free"),
  youtube_url: z.string().trim().url("URL inválida").max(500).optional().or(z.literal("")),
});

type FormData = z.infer<typeof schema>;

const CadastroArtistaForm = () => {
  const { toast } = useToast();
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [portfolioFiles, setPortfolioFiles] = useState<File[]>([]);
  const [portfolioPreviews, setPortfolioPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors }, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const segmentValue = watch("segment");
  const membershipValue = watch("membership_type") || "free";
  const birthDateValue = watch("birth_date");

  const isMinor = (() => {
    if (!birthDateValue) return false;
    const birth = new Date(birthDateValue);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age < 18;
  })();

  const handleProfileImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máximo 5MB", variant: "destructive" });
      return;
    }
    setProfileImage(file);
    setProfilePreview(URL.createObjectURL(file));
  };

  const handlePortfolioImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (portfolioFiles.length + files.length > 6) {
      toast({ title: "Máximo 6 imagens", description: "Remova algumas para adicionar novas", variant: "destructive" });
      return;
    }
    const valid = files.filter(f => {
      if (f.size > 5 * 1024 * 1024) {
        toast({ title: `${f.name} muito grande`, description: "Máximo 5MB", variant: "destructive" });
        return false;
      }
      return true;
    });
    setPortfolioFiles(prev => [...prev, ...valid]);
    setPortfolioPreviews(prev => [...prev, ...valid.map(f => URL.createObjectURL(f))]);
  };

  const removePortfolioImage = (index: number) => {
    setPortfolioFiles(prev => prev.filter((_, i) => i !== index));
    setPortfolioPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFile = async (file: File, folder: string) => {
    const ext = file.name.split(".").pop();
    const path = `${folder}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("artists").upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from("artists").getPublicUrl(path);
    return data.publicUrl;
  };

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    try {
      await supabase.auth.signOut();

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
      });
      if (authError) throw authError;
      if (!authData.user) throw new Error("Erro ao criar conta");

      const userId = authData.user.id;
      await supabase.auth.signOut();

      let profileUrl: string | null = null;
      if (profileImage) {
        profileUrl = await uploadFile(profileImage, "profiles");
      }

      const portfolioUrls: string[] = [];
      for (const file of portfolioFiles) {
        const url = await uploadFile(file, "portfolio");
        portfolioUrls.push(url);
      }

      const { error } = await supabase.from("artists").insert({
        name: data.name,
        email: data.email,
        segment: data.segment,
        birth_date: data.birth_date,
        guardian_name: data.guardian_name || null,
        guardian_phone: data.guardian_phone || null,
        bio: data.bio || null,
        city: data.city || null,
        instagram: data.instagram || null,
        phone: data.phone || null,
        membership_type: data.membership_type || "free",
        youtube_url: data.youtube_url || null,
        profile_image_url: profileUrl,
        portfolio_images: portfolioUrls,
        user_id: userId,
        approved: true,
      });

      if (error) throw error;

      setSuccess(true);
      toast({ title: "Cadastro concluído!", description: "Seu perfil já está ativo no portal." });
    } catch (err: any) {
      toast({ title: "Erro ao cadastrar", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-6" />
        <h2 className="text-3xl font-bold mb-4">Cadastro Concluído!</h2>
        <p className="text-muted-foreground text-lg mb-4">
          Seu perfil já está ativo no portal Amazônia Pop.
          Você pode acessar e editar seu perfil a qualquer momento.
        </p>
        <Button variant="outline" size="lg" onClick={() => window.location.href = "/"}>
          Voltar ao Início
        </Button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl md:text-3xl font-bold mb-2">Cadastro de Artista</h2>
      <p className="text-muted-foreground mb-10">
        Preencha seus dados para fazer parte da comunidade Amazônia Pop.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Profile Image */}
        <div className="space-y-3">
          <Label>Foto de Perfil</Label>
          <div className="flex items-center gap-6">
            <label className="relative w-28 h-28 rounded-full bg-secondary border-2 border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors flex items-center justify-center overflow-hidden group">
              {profilePreview ? (
                <img src={profilePreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <Camera className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
              )}
              <input type="file" accept="image/*" onChange={handleProfileImage} className="hidden" />
            </label>
            <div className="text-sm text-muted-foreground">
              <p>Clique para enviar sua foto</p>
              <p className="text-xs">JPG, PNG até 5MB</p>
            </div>
          </div>
        </div>

        {/* Basic Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="artist-name">Nome Completo *</Label>
            <Input id="artist-name" placeholder="Seu nome completo" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="artist-email">E-mail *</Label>
            <Input id="artist-email" type="email" placeholder="seu@email.com" {...register("email")} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="artist-password">Senha de Acesso *</Label>
          <PasswordInput id="artist-password" placeholder="Mínimo 6 caracteres" {...register("password")} />
          {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
          <p className="text-xs text-muted-foreground">Essa senha será usada para acessar e editar seu perfil</p>
        </div>

        {/* Segment */}
        <div className="space-y-2">
          <Label>Segmento *</Label>
          <Select value={segmentValue} onValueChange={(val) => setValue("segment", val as FormData["segment"])}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione seu segmento" />
            </SelectTrigger>
            <SelectContent>
              {segments.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.segment && <p className="text-sm text-destructive">{errors.segment.message}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="artist-city">Cidade</Label>
            <Input id="artist-city" placeholder="Ex: Belém - PA" {...register("city")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="artist-instagram">Instagram</Label>
            <Input id="artist-instagram" placeholder="@seuinstagram" {...register("instagram")} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="artist-phone">Telefone / WhatsApp</Label>
          <Input id="artist-phone" placeholder="(91) 99999-9999" {...register("phone")} />
          <p className="text-xs text-muted-foreground">Visível apenas para a administração do portal</p>
        </div>

        {/* Membership Type */}
        <div className="space-y-2">
          <Label>Tipo de Membro *</Label>
          <Select value={membershipValue} onValueChange={(val) => setValue("membership_type", val as "free" | "star" | "pro" | "hero")}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo de membro" />
            </SelectTrigger>
            <SelectContent>
              {membershipTypes.map(m => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {membershipValue && membershipDescriptions[membershipValue] && (
            <p className="text-sm text-primary font-medium mt-2 p-3 rounded-lg bg-primary/10">
              {membershipDescriptions[membershipValue]}
            </p>
          )}
        </div>

        {(segmentValue === "cosplayer" || segmentValue === "kpop" || segmentValue === "youtuber" || segmentValue === "influenciador_digital") && (
          <div className="space-y-2">
            <Label htmlFor="artist-youtube">Vídeo de Apresentação (YouTube)</Label>
            <Input id="artist-youtube" placeholder="https://www.youtube.com/watch?v=..." {...register("youtube_url")} />
            {errors.youtube_url && <p className="text-sm text-destructive">{errors.youtube_url.message}</p>}
            <p className="text-xs text-muted-foreground">Cole o link do seu vídeo de apresentação no YouTube</p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="artist-bio">Bio / Sobre você</Label>
          <Textarea id="artist-bio" placeholder="Conte um pouco sobre você e seu trabalho..." rows={4} {...register("bio")} />
          {errors.bio && <p className="text-sm text-destructive">{errors.bio.message}</p>}
        </div>

        {/* Portfolio */}
        <div className="space-y-3">
          <Label>Portfólio (até 6 imagens)</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {portfolioPreviews.map((src, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-secondary group">
                <img src={src} alt={`Portfolio ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePortfolioImage(i)}
                  className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            {portfolioFiles.length < 6 && (
              <label className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary/50 cursor-pointer flex flex-col items-center justify-center gap-2 transition-colors group">
                <Upload className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-xs text-muted-foreground">Adicionar</span>
                <input type="file" accept="image/*" multiple onChange={handlePortfolioImages} className="hidden" />
              </label>
            )}
          </div>
        </div>

        <Button type="submit" variant="hero" size="lg" disabled={submitting} className="w-full sm:w-auto">
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Enviando...
            </>
          ) : (
            "Enviar Cadastro"
          )}
        </Button>
      </form>
    </div>
  );
};

export default CadastroArtistaForm;
