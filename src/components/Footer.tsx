import { Link } from "react-router-dom";
import { Instagram, Facebook } from "lucide-react";
import logoOficial from "@/assets/logo-oficial.png";
import { PwaInstallButton } from "./PwaInstallButton";

const pageLinks = [
  { label: "Início", to: "/" },
  { label: "Notícias", to: "/noticias" },
  { label: "Artistas", to: "/artistas" },
  { label: "Eventos", to: "/eventos" },
  { label: "Sobre", to: "/sobre" },
  { label: "Contato", to: "/contato" },
];

const TikTokIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.94a8.16 8.16 0 0 0 4.77 1.52V7a4.85 4.85 0 0 1-1.84-.31Z"/>
  </svg>
);

const socialLinks = [
  { icon: Instagram, href: "https://www.instagram.com/amazoniapopoficial?igsh=eGc1ZDBnZTdxM3Ji", label: "Instagram" },
  { icon: TikTokIcon, href: "https://www.tiktok.com/@amazoniapop?_r=1&_t=ZS-97lZDHHFhoK", label: "TikTok" },
  { icon: Facebook, href: "https://www.facebook.com/share/1EKn9ag317/", label: "Facebook" },
];

const Footer = () => {
  return (
    <footer className="border-t border-border bg-card mt-16">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
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
                  target={social.href.startsWith("http") ? "_blank" : undefined}
                  rel={social.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="flex items-center justify-center w-10 h-10 rounded-lg bg-secondary text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all active:scale-95">
                  <social.icon className="h-5 w-5" />
                </a>
              ))}
            </div>
            <p className="text-muted-foreground text-xs mt-6">contatoamazoniapop@gmail.com</p>
          </div>
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-wider mb-4 text-foreground/80">Aplicativo</h4>
            <PwaInstallButton />
          </div>
        </div>
        <div className="border-t border-border mt-10 pt-6 text-center space-y-1">
          <p className="text-xs text-muted-foreground">© Vox Group. Todos os direitos reservados.</p>
          <p className="text-xs text-muted-foreground/80">Idealizado por: <span className="font-medium text-foreground/80">Thiago Moraes</span> — 2026</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
