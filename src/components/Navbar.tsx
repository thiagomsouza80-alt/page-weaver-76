import { User, Menu, X, Shield, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const navLinks = [
  { label: "Início", to: "/" },
  { label: "Notícias", to: "/noticias" },
  { label: "Artistas", to: "/artistas" },
  { label: "Empreendedores", to: "/empreendedores" },
  { label: "Eventos", to: "/eventos" },
  { label: "Sobre", to: "/sobre" },
  { label: "Contato", to: "/contato" },
];

const Navbar = () => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });
    supabase.auth.getSession().then(({ data: { session } }) => setIsLoggedIn(!!session));
    return () => subscription.unsubscribe();
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-3 bg-background/80 backdrop-blur-md border-b border-border/50">
      <Link to="/" className="text-lg font-bold text-foreground">Amazônia Pop</Link>
      <div className="hidden md:flex items-center gap-8">
        {navLinks.map((link) => (
          <Link
            key={link.label}
            to={link.to}
            className={`text-sm font-medium transition-colors hover:text-primary ${location.pathname === link.to ? "text-primary" : "text-foreground/70"}`}
          >
            {link.label}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <Link to="/cadastro-artista">
          <Button variant="nav" size="sm" className="gap-2 hidden md:inline-flex">
            <User className="h-4 w-4" />
            Fazer Cadastro
          </Button>
        </Link>
        {isLoggedIn ? (
          <Link to="/meu-perfil">
            <Button variant="ghost" size="sm" className="gap-1.5 hidden md:inline-flex text-primary hover:text-primary/80">
              <User className="h-4 w-4" />
              Meu Perfil
            </Button>
          </Link>
        ) : (
          <Link to="/login">
            <Button variant="ghost" size="sm" className="gap-1.5 hidden md:inline-flex text-muted-foreground hover:text-primary">
              <LogIn className="h-4 w-4" />
              Entrar
            </Button>
          </Link>
        )}
        <Link to="/admin/login">
          <Button variant="ghost" size="sm" className="gap-1.5 hidden md:inline-flex text-muted-foreground hover:text-primary">
            <Shield className="h-4 w-4" />
            Admin
          </Button>
        </Link>
        <button className="md:hidden text-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="absolute top-full left-0 right-0 bg-background/95 backdrop-blur-md border-b border-border p-6 flex flex-col gap-4 md:hidden">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              to={link.to}
              onClick={() => setMobileOpen(false)}
              className={`text-sm font-medium transition-colors hover:text-primary ${location.pathname === link.to ? "text-primary" : "text-foreground/70"}`}
            >
              {link.label}
            </Link>
          ))}
          <Link to="/cadastro-artista" onClick={() => setMobileOpen(false)}>
            <Button variant="nav" size="sm" className="gap-2 w-fit">
              <User className="h-4 w-4" />
              Fazer Cadastro
            </Button>
          </Link>
          {isLoggedIn ? (
            <Link to="/meu-perfil" onClick={() => setMobileOpen(false)}>
              <Button variant="ghost" size="sm" className="gap-1.5 w-fit text-primary">
                <User className="h-4 w-4" />
                Meu Perfil
              </Button>
            </Link>
          ) : (
            <Link to="/login" onClick={() => setMobileOpen(false)}>
              <Button variant="ghost" size="sm" className="gap-1.5 w-fit text-muted-foreground hover:text-primary">
                <LogIn className="h-4 w-4" />
                Entrar
              </Button>
            </Link>
          )}
          <Link to="/admin/login" onClick={() => setMobileOpen(false)}>
            <Button variant="ghost" size="sm" className="gap-1.5 w-fit text-muted-foreground hover:text-primary">
              <Shield className="h-4 w-4" />
              Admin
            </Button>
          </Link>
        </div>
      )}
    </nav>
  );
};

export default Navbar;