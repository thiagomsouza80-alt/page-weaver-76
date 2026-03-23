import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, LogIn } from "lucide-react";

const ArtistaLogin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // Check if user has an artist profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Erro ao obter usuário");

      const { data: artist } = await supabase
        .from("artists")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!artist) {
        await supabase.auth.signOut();
        toast({
          title: "Perfil não encontrado",
          description: "Nenhum perfil de artista associado a este e-mail.",
          variant: "destructive",
        });
        return;
      }

      navigate("/meu-perfil");
    } catch (err: any) {
      toast({
        title: "Erro ao entrar",
        description: err.message === "Invalid login credentials"
          ? "E-mail ou senha incorretos."
          : err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 px-6 max-w-md mx-auto">
        <div className="animate-fade-up">
          <h1 className="text-3xl font-bold mb-2 text-center">Login do Artista</h1>
          <p className="text-muted-foreground text-center mb-8">
            Acesse seu painel para gerenciar seu perfil
          </p>

          <form onSubmit={handleLogin} className="space-y-6 bg-card rounded-2xl p-8 border border-border">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  Entrar
                </>
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Ainda não tem conta?{" "}
            <Link to="/cadastro-artista" className="text-primary hover:underline font-medium">
              Cadastre-se aqui
            </Link>
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ArtistaLogin;
