import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, KeyRound } from "lucide-react";
import { PasswordInput } from "@/components/ui/password-input";

const RedefinirSenha = () => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // The recovery link establishes a session via the hash fragment.
    // Wait one tick then verify we have a session.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "Senha muito curta", description: "Use pelo menos 6 caracteres.", variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "Senhas não conferem", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({ title: "Senha redefinida!", description: "Você já está logado." });
      navigate("/meu-perfil");
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 px-6 flex items-center justify-center min-h-[80vh]">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <KeyRound className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-bold">Redefinir senha</h1>
            </div>
            <p className="text-sm text-muted-foreground">Defina sua nova senha de acesso.</p>
          </div>

          {!ready ? (
            <p className="text-center text-sm text-muted-foreground">
              Abra esta página pelo link enviado no seu e-mail para continuar.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="password">Nova senha</Label>
                <PasswordInput id="password" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirmar nova senha</Label>
                <PasswordInput id="confirm" value={confirm} onChange={e => setConfirm(e.target.value)} required />
              </div>
              <Button type="submit" variant="hero" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar nova senha"}
              </Button>
            </form>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default RedefinirSenha;
