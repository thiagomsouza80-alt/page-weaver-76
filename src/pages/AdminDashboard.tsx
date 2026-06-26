import { useState, useEffect } from "react";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Loader2, Newspaper, CalendarDays, Users, LogOut, ExternalLink, Store,
  ClipboardCheck, Handshake, UserX, Bell, Trophy, Crown, Gift, Shield, ShieldCheck,
  Images, Database, Ticket, CalendarCheck, Wallet, BarChart3, CreditCard,
  Settings, FileText, Menu, X, ChevronDown, Globe2, RotateCcw,
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { usePersistentBool } from "@/hooks/useSidebarState";
import { cn } from "@/lib/utils";
import AdminNewsPanel from "@/components/admin/AdminNewsPanel";
import AdminEventsPanel from "@/components/admin/AdminEventsPanel";
import AdminArtistsPanel from "@/components/admin/AdminArtistsPanel";
import AdminEntrepreneursPanel from "@/components/admin/AdminEntrepreneursPanel";
import AdminPendingUpdatesPanel from "@/components/admin/AdminPendingUpdatesPanel";
import AdminSponsorsPanel from "@/components/admin/AdminSponsorsPanel";
import AdminOrphanUsersPanel from "@/components/admin/AdminOrphanUsersPanel";
import AdminFanRankingPanel from "@/components/admin/AdminFanRankingPanel";
import AdminMembersPanel from "@/components/admin/AdminMembersPanel";
import AdminRafflePanel from "@/components/admin/AdminRafflePanel";
import AdminModerationPanel from "@/components/admin/AdminModerationPanel";
import AdminBannersPanel from "@/components/admin/AdminBannersPanel";
import AdminDatabasePanel from "@/components/admin/AdminDatabasePanel";
import AdminTicketValidationPanel from "@/components/admin/AdminTicketValidationPanel";
import AdminOrganizersPanel from "@/components/admin/AdminOrganizersPanel";
import AdminWithdrawalsPanel from "@/components/admin/AdminWithdrawalsPanel";
import AdminFinancePanel from "@/components/admin/AdminFinancePanel";
import AdminGatewayConfigPanel from "@/components/admin/AdminGatewayConfigPanel";
import AdminSettingsPanel from "@/components/admin/AdminSettingsPanel";
import AdminLogsPanel from "@/components/admin/AdminLogsPanel";
import AdminRefundsPanel from "@/components/admin/AdminRefundsPanel";
import AdminMessengerVerificationsPanel from "@/components/admin/AdminMessengerVerificationsPanel";
import AdminSocialPopPanel from "@/components/admin/AdminSocialPopPanel";
import logoOficial from "@/assets/logo-oficial.png";

type Tab =
  | "news" | "events" | "artists" | "entrepreneurs" | "pending" | "sponsors" | "banners"
  | "ranking" | "members" | "raffle" | "social" | "moderation" | "messenger_verif" | "gamification"
  | "tickets" | "organizers" | "database"
  | "withdrawals" | "refunds" | "finance" | "gateway"
  | "settings" | "orphans" | "logs";

interface NavItem {
  key: Tab;
  label: string;
  icon: any;
  badge?: number;
  external?: string;
}

interface NavGroup {
  id: string;
  label: string;
  emoji: string;
  items: NavItem[];
}

const AdminDashboard = () => {
  const { loading, isAdmin } = useAdmin();
  const [tab, setTab] = useState<Tab>("news");
  const [pendingCount, setPendingCount] = useState(0);
  const [reportsCount, setReportsCount] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  // Persistent open state per group
  const [openContent, setOpenContent] = usePersistentBool("admin.group.content", true);
  const [openCommunity, setOpenCommunity] = usePersistentBool("admin.group.community", false);
  const [openEvents, setOpenEvents] = usePersistentBool("admin.group.events", false);
  const [openFinance, setOpenFinance] = usePersistentBool("admin.group.finance", false);
  const [openSystem, setOpenSystem] = usePersistentBool("admin.group.system", false);

  useEffect(() => {
    const fetchCounts = async () => {
      const [{ count: artistCount }, { count: entCount }, { count: rpCount }] = await Promise.all([
        supabase.from("artist_pending_updates").select("*", { count: "exact", head: true }).in("status", ["pending", "auto_approved", "approved"]),
        supabase.from("entrepreneur_pending_updates").select("*", { count: "exact", head: true }).in("status", ["pending", "auto_approved", "approved"]),
        supabase.from("social_reports" as any).select("*", { count: "exact", head: true }).eq("status", "pending"),
      ]);
      setPendingCount((artistCount || 0) + ((entCount as number) || 0));
      setReportsCount((rpCount as number) || 0);
    };
    fetchCounts();
  }, [tab]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!isAdmin) return null;

  const groups: Array<NavGroup & { open: boolean; toggle: () => void }> = [
    {
      id: "content", label: "Conteúdo", emoji: "📰",
      open: openContent, toggle: () => setOpenContent(!openContent),
      items: [
        { key: "news", label: "Notícias", icon: Newspaper },
        { key: "events", label: "Eventos", icon: CalendarDays },
        { key: "artists", label: "Artistas", icon: Users },
        { key: "entrepreneurs", label: "Empreendedores", icon: Store },
        { key: "sponsors", label: "Apoiadores", icon: Handshake },
        { key: "pending", label: "Atualizações", icon: ClipboardCheck, badge: pendingCount },
        { key: "banners", label: "Banners da Home", icon: Images },
      ],
    },
    {
      id: "community", label: "Comunidade", emoji: "👥",
      open: openCommunity, toggle: () => setOpenCommunity(!openCommunity),
      items: [
        { key: "ranking", label: "Ranking de Fãs", icon: Trophy },
        { key: "members", label: "Membros Pagos", icon: Crown },
        { key: "raffle", label: "Sorteios", icon: Gift },
        { key: "social", label: "Social Pop", icon: Globe2 },
        { key: "moderation", label: "Moderação Social", icon: Shield, badge: reportsCount },
        { key: "messenger_verif", label: "Verif. Messenger", icon: ShieldCheck },
        { key: "gamification", label: "Gamificação (XP/Ranks)", icon: Trophy },
      ],
    },
    {
      id: "events", label: "Eventos e Ingressos", emoji: "🎟️",
      open: openEvents, toggle: () => setOpenEvents(!openEvents),
      items: [
        { key: "tickets", label: "Validar Ingressos", icon: Ticket },
        { key: "organizers", label: "Organizadores", icon: CalendarCheck },
        { key: "database", label: "Banco de Dados", icon: Database },
      ],
    },
    {
      id: "finance", label: "Financeiro", emoji: "💰",
      open: openFinance, toggle: () => setOpenFinance(!openFinance),
      items: [
        { key: "withdrawals", label: "Solicitações de Saque", icon: Wallet },
        { key: "refunds", label: "Reembolsos", icon: RotateCcw },
        { key: "finance", label: "Controle Financeiro", icon: BarChart3 },
        { key: "gateway", label: "Gateway de Pagamento", icon: CreditCard },
      ],
    },
    {
      id: "system", label: "Sistema", emoji: "⚙️",
      open: openSystem, toggle: () => setOpenSystem(!openSystem),
      items: [
        { key: "settings", label: "Configurações Gerais", icon: Settings },
        { key: "orphans", label: "E-mails Órfãos", icon: UserX },
        { key: "logs", label: "Logs do Sistema", icon: FileText },
      ],
    },
  ];

  const handleSelectTab = (key: Tab) => {
    if (key === "social") {
      window.open("/social", "_blank");
      return;
    }
    setTab(key);
    setMobileOpen(false);
  };

  const SidebarContent = () => (
    <>
      <div className="flex items-center justify-between mb-6">
        <img src={logoOficial} alt="Amazônia Pop" className="w-28" />
        <button
          className="md:hidden text-muted-foreground hover:text-foreground p-1"
          onClick={() => setMobileOpen(false)}
          aria-label="Fechar menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto space-y-1 pr-1 -mr-1">
        {groups.map((g) => (
          <div key={g.id}>
            <button
              onClick={g.toggle}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <span aria-hidden>{g.emoji}</span>
                {g.label}
              </span>
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", g.open && "rotate-180")} />
            </button>
            {g.open && (
              <div className="mt-1 mb-2 space-y-0.5">
                {g.items.map((item) => {
                  const Icon = item.icon;
                  const active = tab === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => handleSelectTab(item.key)}
                      className={cn(
                        "w-full flex items-center gap-3 pl-7 pr-3 py-2 rounded-lg text-sm font-medium transition-colors",
                        active
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate text-left">{item.label}</span>
                      {item.badge != null && item.badge > 0 && (
                        <span className="ml-auto flex items-center gap-1 bg-destructive text-destructive-foreground text-xs font-bold rounded-full px-2 py-0.5">
                          <Bell className="h-3 w-3" />
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className="pt-3 border-t border-border space-y-1 mt-3">
        <Link to="/" onClick={() => setMobileOpen(false)}>
          <Button variant="ghost" className="justify-start gap-3 text-muted-foreground w-full">
            <ExternalLink className="h-4 w-4" />
            Ver Portal
          </Button>
        </Link>
        <Button variant="ghost" className="justify-start gap-3 text-muted-foreground w-full" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          Encerrar Sessão
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-40 flex items-center justify-between bg-card/95 backdrop-blur border-b border-border px-4 h-14">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 -ml-2 text-foreground"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <img src={logoOficial} alt="Amazônia Pop" className="h-8" />
        <div className="w-9" />
      </header>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 bg-card border-r border-border p-5 flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => setMobileOpen(false)}
            className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />
          <aside className="md:hidden fixed left-0 top-0 bottom-0 z-50 w-[85%] max-w-[300px] bg-card border-r border-border p-5 flex flex-col overflow-hidden animate-in slide-in-from-left duration-200">
            <SidebarContent />
          </aside>
        </>
      )}

      {/* Main content */}
      <main className="md:ml-64 p-4 md:p-8">
        {tab === "news" && <AdminNewsPanel />}
        {tab === "events" && <AdminEventsPanel />}
        {tab === "artists" && <AdminArtistsPanel />}
        {tab === "entrepreneurs" && <AdminEntrepreneursPanel />}
        {tab === "pending" && <AdminPendingUpdatesPanel />}
        {tab === "sponsors" && <AdminSponsorsPanel />}
        {tab === "banners" && <AdminBannersPanel />}
        {tab === "orphans" && <AdminOrphanUsersPanel />}
        {tab === "ranking" && <AdminFanRankingPanel />}
        {tab === "members" && <AdminMembersPanel />}
        {tab === "raffle" && <AdminRafflePanel />}
        {tab === "moderation" && <AdminModerationPanel />}
        {tab === "database" && <AdminDatabasePanel />}
        {tab === "tickets" && <AdminTicketValidationPanel />}
        {tab === "organizers" && <AdminOrganizersPanel />}
        {tab === "withdrawals" && <AdminWithdrawalsPanel />}
        {tab === "refunds" && <AdminRefundsPanel />}
        {tab === "finance" && <AdminFinancePanel />}
        {tab === "gateway" && <AdminGatewayConfigPanel />}
        {tab === "settings" && <AdminSettingsPanel />}
        {tab === "logs" && <AdminLogsPanel />}
        {tab === "messenger_verif" && <AdminMessengerVerificationsPanel />}
        {tab === "gamification" && <AdminSocialPopPanel />}
      </main>
    </div>
  );
};

export default AdminDashboard;
