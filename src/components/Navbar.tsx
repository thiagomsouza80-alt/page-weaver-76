import { User, Menu, X, Shield, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const navLinks = [
  { label: "Início", to: "/" },
  { label: "Notícias", to: "/noticias" },
  { label: "Artistas", to: "/artistas" },
  { label: "Empreendedores", to: "/empreendedores" },
  { label: "Social Pop", to: "/social" },
  { label: "Eventos", to: "/eventos" },
  { label: "Sobre", to: "/sobre" },
  { label: "Contato", to: "/contato" },
];

const Navbar = () => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string>("");

  useEffect(() => {
    const fetchProfile = async (userId: string) => {
      // Check artist profile
      const { data: artist } = await supabase
        .from("artists")
        .select("profile_image_url, name")
        .eq("user_id", userId)
        .maybeSingle();
      if (artist) {
        setProfileImage(artist.profile_image_url);
        setProfileName(artist.name);
        return;
      }
      // Check entrepreneur profile
      const { data: entrepreneur } = await supabase
        .from("entrepreneurs")
        .select("image_url, name")
        .eq("user_id", userId)
        .maybeSingle();
      if (entrepreneur) {
        setProfileImage(entrepreneur.image_url);
        setProfileName(entrepreneur.name);
      }
    };

    const checkAdminAndProfile = async (userId: string) => {
      fetchProfile(userId);
      const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
      setIsAdmin(!!data);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
      if (session?.user) {
        checkAdminAndProfile(session.user.id);
      } else {
        setProfileImage(null);
        setProfileName("");
        setIsAdmin(false);
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
      if (session?.user) checkAdminAndProfile(session.user.id);
    });
    return () => subscription.unsubscribe();
  }, []);

  const initials = profileName
    ? profileName.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
    : "U";

  const ProfileAvatar = ({ size = "sm" }: { size?: "sm" | "md" }) => (
    <Avatar className={size === "sm" ? "h-8 w-8" : "h-9 w-9"}>
      {profileImage && <AvatarImage src={profileImage} alt={profileName} />}
      <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
        {initials}
      </AvatarFallback>
    </Avatar>
  );

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
        {isLoggedIn ? (
          <Link to="/meu-perfil" className="hidden md:flex items-center gap-2 hover:opacity-80 transition-opacity">
            <ProfileAvatar />
            <span className="text-sm font-medium text-primary">{profileName.split(" ")[0]}</span>
          </Link>
        ) : (
          <>
            <Link to="/cadastro">
              <Button variant="nav" size="sm" className="gap-2 hidden md:inline-flex">
                <User className="h-4 w-4" />
                Fazer Cadastro
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="ghost" size="sm" className="gap-1.5 hidden md:inline-flex text-muted-foreground hover:text-primary">
                <LogIn className="h-4 w-4" />
                Entrar
              </Button>
            </Link>
          </>
        )}
        <Link to={isAdmin ? "/admin" : "/admin/login"}>
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
          {isLoggedIn ? (
            <Link to="/meu-perfil" onClick={() => setMobileOpen(false)} className="flex items-center gap-3">
              <ProfileAvatar size="md" />
              <span className="text-sm font-medium text-primary">{profileName}</span>
            </Link>
          ) : (
            <>
              <Link to="/cadastro" onClick={() => setMobileOpen(false)}>
                <Button variant="nav" size="sm" className="gap-2 w-fit">
                  <User className="h-4 w-4" />
                  Fazer Cadastro
                </Button>
              </Link>
              <Link to="/login" onClick={() => setMobileOpen(false)}>
                <Button variant="ghost" size="sm" className="gap-1.5 w-fit text-muted-foreground hover:text-primary">
                  <LogIn className="h-4 w-4" />
                  Entrar
                </Button>
              </Link>
            </>
          )}
          <Link to={isAdmin ? "/admin" : "/admin/login"} onClick={() => setMobileOpen(false)}>
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
