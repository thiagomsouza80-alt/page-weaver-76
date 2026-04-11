import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { membershipTypes } from "@/lib/membership";

interface PaidMember {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  membership_type: string;
  created_at: string;
  membership_approved_at: string | null;
  membership_expires_at: string | null;
  profile_image_url: string | null;
}

const membershipLabel = (type: string) =>
  membershipTypes.find(m => m.value === type)?.label || type;

const membershipColor: Record<string, string> = {
  star: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  pro: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  hero: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
};

const AdminMembersPanel = () => {
  const { toast } = useToast();
  const [members, setMembers] = useState<PaidMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [renewingId, setRenewingId] = useState<string | null>(null);

  const fetchMembers = async () => {
    const { data } = await supabase
      .from("artists")
      .select("id, name, email, phone, membership_type, created_at, membership_approved_at, membership_expires_at, profile_image_url")
      .neq("membership_type", "free")
      .order("created_at", { ascending: false });
    setMembers((data as PaidMember[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchMembers(); }, []);

  const handleApprove = async (member: PaidMember) => {
    setRenewingId(member.id);
    const now = new Date();
    const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const { error } = await supabase.from("artists").update({
      membership_approved_at: now.toISOString(),
      membership_expires_at: expires.toISOString(),
    } as any).eq("id", member.id);
    setRenewingId(null);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: member.membership_approved_at ? "Plano renovado por +30 dias!" : "Plano aprovado!" });
      fetchMembers();
    }
  };

  const getStatus = (member: PaidMember) => {
    if (!member.membership_approved_at) return "pending";
    if (new Date(member.membership_expires_at!) > new Date()) return "active";
    return "expired";
  };

  const statusConfig = {
    pending: { label: "Aguardando Aprovação", className: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" },
    active: { label: "Ativo", className: "bg-green-500/10 text-green-600 dark:text-green-400" },
    expired: { label: "Expirado", className: "bg-destructive/10 text-destructive" },
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  const pending = members.filter(m => getStatus(m) === "pending");
  const active = members.filter(m => getStatus(m) === "active");
  const expired = members.filter(m => getStatus(m) === "expired");

  const renderMemberRow = (member: PaidMember) => {
    const status = getStatus(member);
    const config = statusConfig[status];
    return (
      <div key={member.id} className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
        {member.profile_image_url ? (
          <img src={member.profile_image_url} alt={member.name} className="w-12 h-12 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center shrink-0">
            <span className="text-lg font-bold text-muted-foreground">{member.name[0]}</span>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm truncate">{member.name}</h4>
          <p className="text-xs text-muted-foreground truncate">{member.email}{member.phone ? ` • 📱 ${member.phone}` : ""}</p>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${membershipColor[member.membership_type] || ""}`}>
              {membershipLabel(member.membership_type)}
            </span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${config.className}`}>
              {config.label}
            </span>
          </div>
        </div>

        <div className="text-right shrink-0 space-y-1">
          <p className="text-xs text-muted-foreground">
            Adesão: {new Date(member.created_at).toLocaleDateString("pt-BR")}
          </p>
          {member.membership_approved_at && (
            <p className="text-xs text-muted-foreground">
              Aprovado: {new Date(member.membership_approved_at).toLocaleDateString("pt-BR")}
            </p>
          )}
          {member.membership_expires_at && (
            <p className={`text-xs font-medium ${status === "expired" ? "text-destructive" : "text-muted-foreground"}`}>
              Vencimento: {new Date(member.membership_expires_at).toLocaleDateString("pt-BR")}
            </p>
          )}
        </div>

        <div className="shrink-0">
          <Button
            size="sm"
            variant={status === "pending" ? "default" : "outline"}
            disabled={renewingId === member.id}
            onClick={() => handleApprove(member)}
            className="gap-1.5"
          >
            {renewingId === member.id ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            {status === "pending" ? "Aprovar" : "Renovar"}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Crown className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Membros Pagos</h2>
        <span className="text-sm text-muted-foreground ml-2">{members.length} membro{members.length !== 1 ? "s" : ""}</span>
      </div>

      {members.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">Nenhum membro com plano pago cadastrado.</p>
      ) : (
        <div className="space-y-8">
          {pending.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-yellow-600 dark:text-yellow-400 uppercase tracking-wider mb-3">
                ⏳ Aguardando Aprovação ({pending.length})
              </h3>
              <div className="space-y-3">{pending.map(renderMemberRow)}</div>
            </div>
          )}

          {active.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider mb-3">
                ✅ Ativos ({active.length})
              </h3>
              <div className="space-y-3">{active.map(renderMemberRow)}</div>
            </div>
          )}

          {expired.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-destructive uppercase tracking-wider mb-3">
                ⚠️ Expirados ({expired.length})
              </h3>
              <div className="space-y-3">{expired.map(renderMemberRow)}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminMembersPanel;
