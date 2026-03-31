import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, CheckCircle, Loader2, Image } from "lucide-react";
import { PasswordInput } from "@/components/ui/password-input";

const schema = z.object({
  name: z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres").max(100),
  email: z.string().trim().email("Email inválido").max(255),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  badge: z.string().trim().min(1, "Informe a categoria").max(100),
  description: z.string().trim().min(5, "Descrição curta obrigatória").max(300),
  full_description: z.string().trim().max(3000, "Máximo 3000 caracteres").optional(),
  address: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(30).optional(),
  instagram: z.string().trim().max(100).optional(),
});

type FormData = z.infer<typeof schema>;

const CadastroEmpreendedorForm = () => {
  const { toast } = useToast();
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [heroPreview, setHeroPreview] = useState<string | null>(null);
  const [portfolioFiles, setPortfolioFiles] = useState<File[]>([]);
  const [portfolioPreviews, setPortfolioPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const heroInputRef = useRef<HTMLInputElement>(null);
  const portfolioInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const handleHeroImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máximo 5MB", variant: "destructive" });
      return;
    }
    setHeroFile(file);
    setHeroPreview(URL.createObjectURL(file));
  };

  const handlePortfolioImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (portfolioFiles.length + files.length > 10) {
      toast({ title: "Máximo 10 imagens", description: "Remova algumas para adicionar novas", variant: "destructive" });
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

  const generateSlug = (name: string) =>
    name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const uploadFile = async (file: File, folder: string) => {
    const ext = file.name.split(".").pop();
    const path = `${folder}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("entrepreneurs").upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from("entrepreneurs").getPublicUrl(path);
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

      let heroUrl: string | null = null;
      if (heroFile) {
        heroUrl = await uploadFile(heroFile, "hero");
      }

      const portfolioUrls: string[] = [];
      for (const file of portfolioFiles) {
        const url = await uploadFile(file, "portfolio");
        portfolioUrls.push(url);
      }

      const slug = generateSlug(data.name);

      const { error } = await supabase.from("entrepreneurs").insert({
        name: data.name,
        slug,
        badge: data.badge,
        description: data.description,
        full_description: data.full_description || null,
        hero_image_url: heroUrl,
        image_url: heroUrl,
        address: data.address || null,
        phone: data.phone || null,
        instagram: data.instagram || null,
        portfolio_images: portfolioUrls.length > 0 ? portfolioUrls : null,
        published: true,
        email: data.email,
        user_id: userId,
      } as any);

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
        <p className="text-muted-foreground text-lg mb-8">
          Seu empreendimento já está publicado no portal Amazônia Pop.
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
      <h2 className="text-2xl md:text-3xl font-bold mb-2">Cadastro de Empreendedor</h2>
      <p className="text-muted-foreground mb-10">
        Cadastre seu negócio para fazer parte do portal Amazônia Pop.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Hero Image */}
        <div className="space-y-3">
          <Label>Imagem Principal (topo do perfil)</Label>
          {heroPreview ? (
            <div className="relative group w-full max-w-md">
              <img src={heroPreview} alt="Preview" className="w-full h-40 object-cover rounded-xl border border-border" />
              <button
                type="button"
                onClick={() => { setHeroFile(null); setHeroPreview(null); }}
                className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div
              onClick={() => heroInputRef.current?.click()}
              className="w-full max-w-md h-40 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/50 transition-colors"
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Clique para enviar a imagem principal</span>
              <span className="text-xs text-muted-foreground">JPG, PNG até 5MB</span>
            </div>
          )}
          <input ref={heroInputRef} type="file" accept="image/*" className="hidden" onChange={handleHeroImage} />
        </div>

        {/* Basic Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="emp-name">Nome do Negócio *</Label>
            <Input id="emp-name" placeholder="Nome do seu negócio" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="emp-badge">Categoria *</Label>
            <Input id="emp-badge" placeholder="Ex: Loja Geek, Gastronomia, Ateliê" {...register("badge")} />
            {errors.badge && <p className="text-sm text-destructive">{errors.badge.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="emp-email">E-mail *</Label>
            <Input id="emp-email" type="email" placeholder="seu@email.com" {...register("email")} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="emp-password">Senha de Acesso *</Label>
            <PasswordInput id="emp-password" placeholder="Mínimo 6 caracteres" {...register("password")} />
            {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
          </div>
        </div>
        <p className="text-xs text-muted-foreground -mt-4">Essa senha será usada para acessar e editar seu perfil</p>

        <div className="space-y-2">
          <Label htmlFor="emp-description">Descrição Curta *</Label>
          <Input id="emp-description" placeholder="Breve descrição do seu negócio" maxLength={300} {...register("description")} />
          {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="emp-full_description">Descrição Completa</Label>
          <Textarea
            id="emp-full_description"
            placeholder="Conte a história do seu negócio, diferenciais, o que oferece..."
            rows={5}
            maxLength={3000}
            {...register("full_description")}
          />
          {errors.full_description && <p className="text-sm text-destructive">{errors.full_description.message}</p>}
        </div>

        <h3 className="font-semibold text-lg pt-2 border-t border-border">Informações de Contato</h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label htmlFor="emp-address">Endereço</Label>
            <Input id="emp-address" placeholder="Rua, número, bairro..." {...register("address")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emp-phone">Telefone</Label>
            <Input id="emp-phone" placeholder="(91) 99999-9999" {...register("phone")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emp-instagram">Instagram</Label>
            <Input id="emp-instagram" placeholder="@usuario" {...register("instagram")} />
          </div>
        </div>

        {/* Portfolio */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Portfólio / Galeria (até 10 imagens)</Label>
            {portfolioFiles.length < 10 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => portfolioInputRef.current?.click()}
              >
                <Image className="h-4 w-4 mr-1" />
                Adicionar fotos
              </Button>
            )}
            <input ref={portfolioInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePortfolioImages} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
          </div>
          {portfolioFiles.length === 0 && (
            <p className="text-xs text-muted-foreground">Adicione fotos do seu negócio, produtos ou espaço.</p>
          )}
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

export default CadastroEmpreendedorForm;
