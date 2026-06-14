import { Link, useLocation } from "react-router-dom";
import { Home, Newspaper, CalendarDays, Globe2, User } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "Início", icon: Home, match: (p: string) => p === "/" },
  { to: "/noticias", label: "Notícias", icon: Newspaper, match: (p: string) => p.startsWith("/noticias") },
  { to: "/eventos", label: "Eventos", icon: CalendarDays, match: (p: string) => p.startsWith("/eventos") },
  { to: "/social", label: "Social Pop", icon: Globe2, match: (p: string) => p.startsWith("/social") },
  { to: "/meu-perfil", label: "Conta", icon: User, match: (p: string) => p.startsWith("/meu-perfil") || p.startsWith("/login") },
];

/**
 * Bottom navigation bar shown only on mobile (acts as the app shell when installed as PWA).
 * Hidden on routes where it would overlap with specialized UIs (admin, scanner, etc).
 */
const MobileBottomNav = () => {
  const location = useLocation();
  const path = location.pathname;

  const hiddenRoutes = ["/admin", "/validador/eventos", "/organizador/eventos", "/login", "/admin/login"];
  if (hiddenRoutes.some((r) => path.startsWith(r) && path !== "/login")) return null;

  return (
    <>
      {/* Spacer so content isn't hidden under the nav */}
      <div className="h-16 md:hidden" aria-hidden="true" />
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-[env(safe-area-inset-bottom)]"
        aria-label="Navegação inferior"
      >
        <ul className="grid grid-cols-5 h-16">
          {items.map(({ to, label, icon: Icon, match }) => {
            const active = match(path);
            return (
              <li key={to} className="flex">
                <Link
                  to={to}
                  className={cn(
                    "flex-1 flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors",
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className={cn("h-5 w-5", active && "scale-110")} aria-hidden="true" />
                  <span>{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
};

export default MobileBottomNav;
