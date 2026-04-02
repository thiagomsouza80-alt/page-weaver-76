import { useState, useEffect } from "react";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Newspaper, CalendarDays, Users, LogOut, ExternalLink, Store, ClipboardCheck, Handshake, UserX, Bell } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import AdminNewsPanel from "@/components/admin/AdminNewsPanel";
import AdminEventsPanel from "@/components/admin/AdminEventsPanel";
import AdminArtistsPanel from "@/components/admin/AdminArtistsPanel";
import AdminEntrepreneursPanel from "@/components/admin/AdminEntrepreneursPanel";
import AdminPendingUpdatesPanel from "@/components/admin/AdminPendingUpdatesPanel";
import AdminSponsorsPanel from "@/components/admin/AdminSponsorsPanel";
import AdminOrphanUsersPanel from "@/components/admin/AdminOrphanUsersPanel";
import logoOficial from "@/assets/logo-oficial.png";

type Tab = "news" | "events" | "artists" | "entrepreneurs" | "pending" | "sponsors" | "orphans";

const AdminDashboard = () => {
  const { loading, isAdmin } = useAdmin();
  const [tab, setTab] = useState<Tab>("news");
  const [pendingCount, setPendingCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPendingCount = async () => {
      const [{ count: artistCount }, { count: entCount }] = await Promise.all([
        supabase.from("artist_pending_updates").select("*", { count: "exact", head: true }).in("status", ["pending", "auto_approved"]),
        supabase.from("entrepreneur_pending_updates" as any).select("*", { count: "exact", head: true }).in("status", ["pending", "auto_approved"]),
      ]);
      setPendingCount((artistCount || 0) + ((entCount as number) || 0));
    };
    fetchPendingCount();
  }, [tab]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) return null;

  const tabs = [
    { key: "news" as Tab, label: "Notícias", icon: Newspaper },
    { key: "events" as Tab, label: "Eventos", icon: CalendarDays },
    { key: "artists" as Tab, label: "Artistas", icon: Users },
    { key: "entrepreneurs" as Tab, label: "Empreendedores", icon: Store },
    { key: "pending" as Tab, label: "Atualizações", icon: ClipboardCheck },
    { key: "sponsors" as Tab, label: "Apoiadores", icon: Handshake },
    { key: "orphans" as Tab, label: "E-mails Órfãos", icon: UserX },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-card border-r border-border p-6 flex flex-col">
        <img src={logoOficial} alt="Amazônia Pop" className="w-32 mb-8" />
        <nav className="flex-1 space-y-1">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                tab === t.key ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
              {t.key === "pending" && pendingCount > 0 && (
                <span className="ml-auto flex items-center gap-1 bg-destructive text-destructive-foreground text-xs font-bold rounded-full px-2 py-0.5">
                  <Bell className="h-3 w-3" />
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </nav>
        <Link to="/">
          <Button variant="ghost" className="justify-start gap-3 text-muted-foreground w-full">
            <ExternalLink className="h-4 w-4" />
            Ver Portal
          </Button>
        </Link>
        <Button variant="ghost" className="justify-start gap-3 text-muted-foreground" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </aside>

      {/* Main content */}
      <main className="ml-64 p-8">
        {tab === "news" && <AdminNewsPanel />}
        {tab === "events" && <AdminEventsPanel />}
        {tab === "artists" && <AdminArtistsPanel />}
        {tab === "entrepreneurs" && <AdminEntrepreneursPanel />}
        {tab === "pending" && <AdminPendingUpdatesPanel />}
        {tab === "sponsors" && <AdminSponsorsPanel />}
        {tab === "orphans" && <AdminOrphanUsersPanel />}
      </main>
    </div>
  );
};

export default AdminDashboard;
