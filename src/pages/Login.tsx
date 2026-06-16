import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, LogIn } from "lucide-react";
import { PasswordInput } from "@/components/ui/password-input";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // Check if user has an artist, entrepreneur, or organizer profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Erro ao buscar usuário");

      const [{ data: artist }, { data: entrepreneur }, { data: organizer }, { data: isAdmin }] = await Promise.all([
        supabase.from("artists").select("id").eq("user_id", user.id).maybeSingle(),
        supabase.from("entrepreneurs").select("id").eq("user_id", user.id).maybeSingle(),
        supabase.from("organizers").select("id").eq("user_id", user.id).maybeSingle(),
        supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }),
      ]);

      if (isAdmin) { navigate("/admin"); return; }
      if (organizer) { navigate("/organizador"); return; }
      if (artist || entrepreneur) { navigate("/meu-perfil"); return; }

      await supabase.auth.signOut();
      throw new Error("Nenhum perfil encontrado para este e-mail. Faça seu cadastro primeiro.");
    } catch (err: any) {
      toast({ title: "Erro no login", description: err.message, variant: "destructive" });
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
              <LogIn className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-bold">Entrar no Portal</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Acesse seu perfil de artista, empreendedor ou organizador
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <PasswordInput
                id="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <Button type="submit" variant="hero" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
            </Button>
          </form>

          <div className="text-center space-y-2">
            <p className="text-sm">
              <a href="/esqueci-senha" className="text-primary hover:underline">Esqueci minha senha</a>
            </p>
            <p className="text-sm text-muted-foreground">
              Ainda não tem cadastro?{" "}
              <a href="/cadastro-artista" className="text-primary hover:underline">Cadastre-se</a>
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Login;
