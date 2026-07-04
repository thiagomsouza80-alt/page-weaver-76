import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Loader2, CalendarCheck } from "lucide-react";
import { PasswordInput } from "@/components/ui/password-input";
import { PasswordStrengthBar } from "@/components/ui/password-strength";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { fetchClassByCode } from "./ClassSelector";


const schema = z.object({
  name: z.string().trim().min(2, "Nome obrigatório").max(120),
  email: z.string().trim().email("Email inválido").max(255),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  phone: z.string().trim().min(8, "WhatsApp obrigatório").max(30),
  organization_name: z.string().trim().min(2, "Nome da produtora/empresa obrigatório").max(160),
  document: z.string().trim().max(40).optional(),
  bio: z.string().trim().max(1000).optional(),
  instagram: z.string().trim().max(100).optional(),
  website: z.string().trim().max(200).optional(),
});

type FormData = z.infer<typeof schema>;

const CadastroOrganizadorForm = () => {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const friendlyAuthError = (msg: string): string => {
    const m = (msg || "").toLowerCase();
    if (m.includes("already") || m.includes("registered") || m.includes("exists"))
      return "Este e-mail já está cadastrado. Faça login ou use 'Esqueci minha senha'.";
    if (m.includes("pwned") || m.includes("compromised") || m.includes("hibp"))
      return "Esta senha aparece em vazamentos públicos. Escolha outra senha.";
    if (m.includes("password") && m.includes("weak")) return "Senha muito fraca.";
    if (m.includes("invalid") && m.includes("email")) return "E-mail inválido.";
    return msg || "Erro interno. Tente novamente.";
  };

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    try {
      // Classe automática para organizadores
      const orgClass = await fetchClassByCode("organizador_eventos");

      // 1) signup
      const { data: auth, error: signErr } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/organizador`,
          data: { name: data.name, class_id: orgClass?.id || null },
        },
      });
      if (signErr) throw new Error(friendlyAuthError(signErr.message));
      const userId = auth.user?.id;
      if (!userId) throw new Error("Falha ao criar usuário.");

      // 2) ensure session
      if (!auth.session) {
        const { error: loginErr } = await supabase.auth.signInWithPassword({
          email: data.email, password: data.password,
        });
        if (loginErr) throw new Error(friendlyAuthError(loginErr.message));
      }

      if (orgClass?.id) {
        await supabase.from("user_profiles" as any).upsert(
          { user_id: userId, class_id: orgClass.id },
          { onConflict: "user_id" }
        );
      }


      // 3) create organizer profile (pending)
      const { error: orgErr } = await supabase.from("organizers").insert({
        user_id: userId,
        name: data.name,
        email: data.email,
        phone: data.phone,
        organization_name: data.organization_name,
        document: data.document || null,
        bio: data.bio || null,
        instagram: data.instagram || null,
        website: data.website || null,
        approval_status: "pending",
      } as any);
      if (orgErr) throw new Error(orgErr.message || "Não foi possível salvar o perfil de organizador.");

      setSuccess(true);
      toast({ title: "Cadastro enviado!", description: "Aguarde aprovação do administrador." });
    } catch (err: any) {
      toast({ title: "Erro no cadastro", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-12 animate-fade-up">
        <CheckCircle className="h-16 w-16 text-primary mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Cadastro enviado!</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Sua solicitação de Organizador foi enviada para análise. Você receberá acesso ao painel de eventos assim que for aprovado pelo administrador.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 animate-fade-up">
      <div className="flex items-center gap-3 mb-2">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
          <CalendarCheck className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Cadastro de Organizador</h1>
          <p className="text-sm text-muted-foreground">Cadastre sua produtora para publicar eventos no portal.</p>
        </div>
      </div>

      <Alert>
        <AlertDescription>
          Após o cadastro, seu perfil ficará <strong>pendente de aprovação</strong>. Depois de aprovado, você poderá criar e gerenciar seus eventos.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Nome completo *</Label>
          <Input {...register("name")} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Nome da produtora/empresa *</Label>
          <Input {...register("organization_name")} />
          {errors.organization_name && <p className="text-xs text-destructive">{errors.organization_name.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Email *</Label>
          <Input type="email" {...register("email")} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Senha *</Label>
          <PasswordInput {...register("password")} />
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>WhatsApp *</Label>
          <Input placeholder="(91) 99999-9999" {...register("phone")} />
          {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>CNPJ/CPF (opcional)</Label>
          <Input {...register("document")} />
        </div>
        <div className="space-y-2">
          <Label>Instagram</Label>
          <Input placeholder="@suaprodutora" {...register("instagram")} />
        </div>
        <div className="space-y-2">
          <Label>Site</Label>
          <Input placeholder="https://..." {...register("website")} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Sobre a produtora</Label>
        <Textarea rows={4} {...register("bio")} placeholder="Conte um pouco sobre os eventos que você organiza." />
      </div>

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar cadastro"}
      </Button>
    </form>
  );
};

export default CadastroOrganizadorForm;
