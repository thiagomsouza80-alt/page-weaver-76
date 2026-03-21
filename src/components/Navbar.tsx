import { User, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { useState } from "react";

const navLinks = [
  { label: "Início", to: "/" },
  { label: "Notícias", to: "/noticias" },
  { label: "Artistas", to: "/artistas" },
  { label: "Eventos", to: "/eventos" },
  { label: "Sobre", to: "/sobre" },
  { label: "Contato", to: "/contato" },
];

const Navbar = () => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

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
        <Button variant="nav" size="sm" className="gap-2 hidden md:inline-flex">
          <User className="h-4 w-4" />
          Entrar
        </Button>
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
          <Button variant="nav" size="sm" className="gap-2 w-fit">
            <User className="h-4 w-4" />
            Entrar
          </Button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
