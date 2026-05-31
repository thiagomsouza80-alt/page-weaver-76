import { Link } from "react-router-dom";
import { Instagram, Youtube, Twitter, Facebook } from "lucide-react";
import logoOficial from "@/assets/logo-oficial.png";

const pageLinks = [
  { label: "Início", to: "/" },
  { label: "Notícias", to: "/noticias" },
  { label: "Artistas", to: "/artistas" },
  { label: "Eventos", to: "/eventos" },
  { label: "Sobre", to: "/sobre" },
  { label: "Contato", to: "/contato" },
];

const socialLinks = [
  { icon: Instagram, href: "https://www.instagram.com/amazoniapopoficial?igsh=eGc1ZDBnZTdxM3Ji", label: "Instagram" },
  { icon: Youtube, href: "#", label: "YouTube" },
  { icon: Twitter, href: "#", label: "Twitter" },
  { icon: Facebook, href: "#", label: "Facebook" },
];

const Footer = () => {
  return (
    <footer className="border-t border-border bg-card mt-16">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div className="space-y-4">
            <img src={logoOficial} alt="Amazônia Pop" className="w-40" />
            <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
              O principal HUB digital de cultura pop, anime, games e eventos geek da Amazônia.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-wider mb-4 text-foreground/80">Navegação</h4>
            <ul className="space-y-2">
              {pageLinks.map((link) => (
                <li key={link.label}>
                  <Link to={link.to} className="text-sm text-muted-foreground hover:text-primary transition-colors">{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-wider mb-4 text-foreground/80">Redes Sociais</h4>
            <div className="flex gap-3">
              {socialLinks.map((social) => (
                <a key={social.label} href={social.href} aria-label={social.label}
                  className="flex items-center justify-center w-10 h-10 rounded-lg bg-secondary text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all active:scale-95">
                  <social.icon className="h-5 w-5" />
                </a>
              ))}
            </div>
            <p className="text-muted-foreground text-xs mt-6">contato@amazoniapop.com.br</p>
          </div>
        </div>
        <div className="border-t border-border mt-10 pt-6 text-center">
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Amazônia Pop. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
