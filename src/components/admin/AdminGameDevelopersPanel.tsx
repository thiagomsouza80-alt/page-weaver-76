import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Loader2, Check, X, MessageSquare, Gamepad2 } from "lucide-react";

interface Row {
  id: string; user_id: string; developer_id: string;
  proposed_game_name: string | null; category: string | null; description: string | null;
  logo_url: string | null; banner_url: string | null; links: any;
  status: string; admin_notes: string | null; created_at: string;
  game_developers?: { studio_name: string };
}

const AdminGameDevelopersPanel = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any).from("game_developer_requests")
      .select("*, game_developers(studio_name)")
      .order("created_at", { ascending: false });
    setRows((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const decide = async (r: Row, status: "approved" | "rejected" | "changes_requested") => {
    const admin_notes = notes[r.id] || null;
    try {
      await (supabase as any).from("game_developer_requests").update({
        status, admin_notes, decided_at: new Date().toISOString(),
      }).eq("id", r.id);
      // Update developer status (trigger will grant role if approved)
      await (supabase as any).from("game_developers").update({ status }).eq("id", r.developer_id);
      if (status !== "approved") {
        await (supabase as any).from("social_notifications").insert({
          user_id: r.user_id,
          type: status === "rejected" ? "game_dev_rejected" : "game_dev_changes",
          preview: status === "rejected"
            ? "Sua solicitação de desenvolvedor foi rejeitada."
            : "O admin solicitou alterações na sua solicitação de desenvolvedor.",
          target_type: "game_developer", target_id: r.developer_id,
        });
      }
      toast({ title: "Atualizado" });
      load();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold flex items-center gap-2"><Gamepad2 className="h-6 w-6 text-primary" />Pop Games — Desenvolvedores</h2>
      {rows.length === 0 ? (
        <p className="text-muted-foreground">Nenhuma solicitação.</p>
      ) : rows.map(r => (
        <div key={r.id} className="p-4 bg-card border border-border rounded-xl space-y-3">
          <div className="flex items-start gap-3">
            {r.logo_url && <img src={r.logo_url} alt="" className="w-14 h-14 rounded-lg object-cover" />}
            <div className="flex-1 min-w-0">
              <h3 className="font-bold">{r.game_developers?.studio_name || "—"}</h3>
              <p className="text-sm text-muted-foreground">Jogo proposto: {r.proposed_game_name} · {r.category}</p>
              <p className="text-xs text-muted-foreground">Solicitado em {new Date(r.created_at).toLocaleString("pt-BR")}</p>
            </div>
            <span className={`text-xs font-bold px-2 py-1 rounded-full ${
              r.status === "approved" ? "bg-emerald-500/20 text-emerald-500" :
              r.status === "rejected" ? "bg-destructive/20 text-destructive" :
              r.status === "changes_requested" ? "bg-amber-500/20 text-amber-500" :
              "bg-secondary text-muted-foreground"
            }`}>{r.status}</span>
          </div>
          {r.description && <p className="text-sm text-muted-foreground">{r.description}</p>}
          {r.links?.portfolio && <a href={r.links.portfolio} target="_blank" rel="noreferrer" className="text-xs text-primary underline">{r.links.portfolio}</a>}
          {r.status === "pending" && (
            <>
              <Textarea placeholder="Notas para o solicitante (opcional)"
                value={notes[r.id] || ""} onChange={e => setNotes({ ...notes, [r.id]: e.target.value })} rows={2} />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => decide(r, "approved")} className="gap-1"><Check className="h-4 w-4" />Aprovar</Button>
                <Button size="sm" variant="outline" onClick={() => decide(r, "changes_requested")} className="gap-1"><MessageSquare className="h-4 w-4" />Pedir alterações</Button>
                <Button size="sm" variant="destructive" onClick={() => decide(r, "rejected")} className="gap-1"><X className="h-4 w-4" />Rejeitar</Button>
              </div>
            </>
          )}
          {r.admin_notes && (
            <p className="text-xs text-muted-foreground border-l-2 border-primary pl-2">Nota: {r.admin_notes}</p>
          )}
        </div>
      ))}
    </div>
  );
};

export default AdminGameDevelopersPanel;
