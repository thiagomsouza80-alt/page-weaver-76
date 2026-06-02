import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Loader2, EyeOff, Trash2, Check, X, Pause, Ban, Shield } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type Report = {
  id: string;
  reporter_user_id: string;
  target_type: "post" | "comment" | "product" | "profile";
  target_id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
};

type StatusRow = { user_id: string; status: string; reason: string | null; suspended_until: string | null; updated_at: string };

const AdminModerationPanel = () => {
  const [tab, setTab] = useState("pending");
  const [reports, setReports] = useState<Report[]>([]);
  const [statuses, setStatuses] = useState<StatusRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [targetData, setTargetData] = useState<Record<string, any>>({});

  const load = async () => {
    setLoading(true);
    const filter = tab === "pending" ? ["pending"] : tab === "actioned" ? ["actioned"] : ["dismissed", "reviewed"];
    const { data: reportData } = await supabase
      .from("social_reports" as any)
      .select("*")
      .in("status", filter)
      .order("created_at", { ascending: false })
      .limit(100);
    setReports((reportData as any) ?? []);

    // fetch related target data
    const map: Record<string, any> = {};
    for (const r of (reportData as any[]) ?? []) {
      const key = `${r.target_type}:${r.target_id}`;
      if (map[key]) continue;
      if (r.target_type === "post") {
        const { data } = await supabase.from("social_posts").select("id,author_name,content,user_id,hidden,deleted").eq("id", r.target_id).maybeSingle();
        map[key] = data;
      } else if (r.target_type === "comment") {
        const { data } = await supabase.from("social_comments").select("id,author_name,content,user_id,hidden").eq("id", r.target_id).maybeSingle();
        map[key] = data;
      } else if (r.target_type === "product") {
        const { data } = await supabase.from("social_products" as any).select("id,name,description,user_id,active,hidden").eq("id", r.target_id).maybeSingle();
        map[key] = data;
      }
    }
    setTargetData(map);

    const { data: statusData } = await supabase
      .from("social_user_status" as any).select("*").order("updated_at", { ascending: false }).limit(100);
    setStatuses((statusData as any) ?? []);

    setLoading(false);
  };

  useEffect(() => { load(); }, [tab]);

  const updateReport = async (id: string, status: string, notes?: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    await supabase.from("social_reports" as any).update({
      status, admin_notes: notes ?? null, reviewed_at: new Date().toISOString(), reviewed_by: session?.user.id,
    } as any).eq("id", id);
  };

  const dismiss = async (r: Report) => {
    await updateReport(r.id, "dismissed");
    toast.success("Denúncia descartada");
    load();
  };

  const hideTarget = async (r: Report) => {
    if (r.target_type === "post") await supabase.from("social_posts").update({ hidden: true }).eq("id", r.target_id);
    else if (r.target_type === "comment") await supabase.from("social_comments").update({ hidden: true }).eq("id", r.target_id);
    else if (r.target_type === "product") await supabase.from("social_products" as any).update({ hidden: true } as any).eq("id", r.target_id);
    await updateReport(r.id, "actioned", "Conteúdo ocultado");
    toast.success("Conteúdo ocultado");
    load();
  };

  const deleteTarget = async (r: Report) => {
    if (!confirm("Excluir conteúdo permanentemente?")) return;
    if (r.target_type === "post") await supabase.from("social_posts").update({ deleted: true }).eq("id", r.target_id);
    else if (r.target_type === "comment") await supabase.from("social_comments").delete().eq("id", r.target_id);
    else if (r.target_type === "product") await supabase.from("social_products" as any).delete().eq("id", r.target_id);
    await updateReport(r.id, "actioned", "Conteúdo excluído");
    toast.success("Conteúdo excluído");
    load();
  };

  const setUserStatus = async (userId: string, status: "active" | "suspended" | "banned", days?: number) => {
    const { data: { session } } = await supabase.auth.getSession();
    const suspended_until = status === "suspended" && days ? new Date(Date.now() + days * 86400000).toISOString() : null;
    await supabase.from("social_user_status" as any).upsert({
      user_id: userId, status, suspended_until, updated_by: session?.user.id, updated_at: new Date().toISOString(),
    } as any, { onConflict: "user_id" });
    toast.success(status === "active" ? "Usuário reativado" : status === "suspended" ? `Suspenso por ${days} dias` : "Usuário banido");
    load();
  };

  const suspendFromReport = async (r: Report, days: number) => {
    const key = `${r.target_type}:${r.target_id}`;
    const t = targetData[key];
    if (!t?.user_id) { toast.error("Usuário não encontrado"); return; }
    await setUserStatus(t.user_id, "suspended", days);
    await updateReport(r.id, "actioned", `Autor suspenso por ${days} dias`);
    load();
  };

  const banFromReport = async (r: Report) => {
    if (!confirm("Banir permanentemente este usuário?")) return;
    const key = `${r.target_type}:${r.target_id}`;
    const t = targetData[key];
    if (!t?.user_id) { toast.error("Usuário não encontrado"); return; }
    await setUserStatus(t.user_id, "banned");
    await updateReport(r.id, "actioned", "Autor banido");
    load();
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" /> Moderação Social
        </h1>
        <p className="text-sm text-muted-foreground">Denúncias e gestão de usuários do Social Pop.</p>
      </header>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pending">Pendentes</TabsTrigger>
          <TabsTrigger value="actioned">Resolvidas</TabsTrigger>
          <TabsTrigger value="dismissed">Descartadas</TabsTrigger>
          <TabsTrigger value="users">Usuários Bloqueados</TabsTrigger>
        </TabsList>

        {["pending", "actioned", "dismissed"].map(t => (
          <TabsContent key={t} value={t} className="space-y-3 mt-4">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
            ) : reports.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhuma denúncia.</p>
            ) : reports.map(r => {
              const key = `${r.target_type}:${r.target_id}`;
              const target = targetData[key];
              return (
                <Card key={r.id} className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">{r.target_type}</Badge>
                        <Badge variant="secondary">{r.reason}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  {r.details && <p className="text-sm text-muted-foreground mb-2 italic">"{r.details}"</p>}
                  {target ? (
                    <div className="bg-secondary rounded-lg p-3 text-sm">
                      <p className="font-semibold">{target.author_name || target.name || "Sem título"}</p>
                      <p className="text-muted-foreground line-clamp-3">{target.content || target.description || ""}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Conteúdo não encontrado</p>
                  )}
                  {t === "pending" && (
                    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border">
                      <Button size="sm" variant="outline" onClick={() => dismiss(r)}><Check className="h-3.5 w-3.5" />Aprovar</Button>
                      <Button size="sm" variant="outline" onClick={() => hideTarget(r)}><EyeOff className="h-3.5 w-3.5" />Ocultar</Button>
                      <Button size="sm" variant="outline" onClick={() => deleteTarget(r)} className="text-destructive"><Trash2 className="h-3.5 w-3.5" />Excluir</Button>
                      <Button size="sm" variant="outline" onClick={() => suspendFromReport(r, 7)}><Pause className="h-3.5 w-3.5" />Suspender 7d</Button>
                      <Button size="sm" variant="outline" onClick={() => banFromReport(r)} className="text-destructive"><Ban className="h-3.5 w-3.5" />Banir</Button>
                    </div>
                  )}
                </Card>
              );
            })}
          </TabsContent>
        ))}

        <TabsContent value="users" className="space-y-3 mt-4">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : statuses.filter(s => s.status !== "active").length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum usuário bloqueado.</p>
          ) : statuses.filter(s => s.status !== "active").map(s => (
            <Card key={s.user_id} className="p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-mono truncate">{s.user_id}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={s.status === "banned" ? "destructive" : "secondary"}>{s.status === "banned" ? "Banido" : "Suspenso"}</Badge>
                  {s.suspended_until && <span className="text-xs text-muted-foreground">até {new Date(s.suspended_until).toLocaleDateString("pt-BR")}</span>}
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => setUserStatus(s.user_id, "active")}><X className="h-3.5 w-3.5" />Reativar</Button>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminModerationPanel;
