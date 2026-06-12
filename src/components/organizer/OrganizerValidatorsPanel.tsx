import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, Pause, Play, Trash2, Users } from "lucide-react";
import AddValidatorDialog from "./AddValidatorDialog";

interface Props {
  organizerId: string;
  organizerUserId: string;
}

type Row = {
  id: string;
  event_id: string;
  user_id: string;
  validator_name: string;
  validator_email: string | null;
  validator_avatar_url: string | null;
  status: string;
  starts_at: string;
  ends_at: string | null;
  last_access_at: string | null;
  validations_count: number;
  events: { id: string; title: string; event_date: string } | null;
};

const OrganizerValidatorsPanel = ({ organizerId, organizerUserId }: Props) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("event_validators" as any)
      .select("id, event_id, user_id, validator_name, validator_email, validator_avatar_url, status, starts_at, ends_at, last_access_at, validations_count, events:event_id(id,title,event_date)")
      .eq("organizer_id", organizerId)
      .order("created_at", { ascending: false });
    setRows(((data as any[]) || []) as Row[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [organizerId]);

  const setStatus = async (id: string, status: "active" | "suspended") => {
    const { error } = await supabase.from("event_validators" as any).update({ status } as any).eq("id", id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: status === "active" ? "Validador reativado" : "Validador suspenso" });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Remover este validador?")) return;
    const { error } = await supabase.from("event_validators" as any).delete().eq("id", id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Validador removido" });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><Users className="h-5 w-5" /> Equipe de Validação</h2>
          <p className="text-sm text-muted-foreground">
            Adicione usuários cadastrados no Amazônia Pop para validar ingressos dos seus eventos.
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2">
          <UserPlus className="h-4 w-4" /> Adicionar Validador
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : rows.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
          Nenhum validador cadastrado ainda. Comece adicionando alguém da sua equipe.
        </div>
      ) : (
        <div className="overflow-x-auto bg-card border border-border rounded-xl">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Validador</TableHead>
                <TableHead>Evento</TableHead>
                <TableHead>Período</TableHead>
                <TableHead className="text-right">Validações</TableHead>
                <TableHead>Último acesso</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        {r.validator_avatar_url && <AvatarImage src={r.validator_avatar_url} />}
                        <AvatarFallback>{r.validator_name?.[0] || "?"}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-sm">{r.validator_name}</div>
                        <div className="text-xs text-muted-foreground">{r.validator_email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{r.events?.title || "—"}</TableCell>
                  <TableCell className="text-xs">
                    {new Date(r.starts_at).toLocaleDateString("pt-BR")}
                    {r.ends_at ? ` → ${new Date(r.ends_at).toLocaleDateString("pt-BR")}` : ""}
                  </TableCell>
                  <TableCell className="text-right font-medium">{r.validations_count}</TableCell>
                  <TableCell className="text-xs">{r.last_access_at ? new Date(r.last_access_at).toLocaleString("pt-BR") : "—"}</TableCell>
                  <TableCell>
                    {r.status === "active" ? (
                      <Badge className="bg-green-500/15 text-green-600 border-green-500/30" variant="outline">🟢 Ativo</Badge>
                    ) : (
                      <Badge className="bg-red-500/15 text-red-600 border-red-500/30" variant="outline">🔴 Inativo</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      {r.status === "active" ? (
                        <Button variant="ghost" size="icon" title="Suspender" onClick={() => setStatus(r.id, "suspended")}>
                          <Pause className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="icon" title="Reativar" onClick={() => setStatus(r.id, "active")}>
                          <Play className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" title="Remover" onClick={() => remove(r.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AddValidatorDialog
        open={open}
        onOpenChange={setOpen}
        organizerId={organizerId}
        organizerUserId={organizerUserId}
        onAdded={load}
      />
    </div>
  );
};

export default OrganizerValidatorsPanel;
