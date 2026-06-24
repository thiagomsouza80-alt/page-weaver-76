import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle, ShieldCheck } from "lucide-react";

type Row = {
  id: string;
  user_id: string;
  status: string;
  full_name: string | null;
  document_number: string | null;
  selfie_url: string | null;
  document_url: string | null;
  rejection_reason: string | null;
  created_at: string;
};

const useSignedUrl = (path: string | null) => {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!path) { setUrl(null); return; }
    (supabase.storage.from("messenger-verifications").createSignedUrl(path, 3600) as any).then(({ data }: any) => setUrl(data?.signedUrl || null));
  }, [path]);
  return url;
};

const VerifRow = ({ row, onAction }: { row: Row; onAction: () => void }) => {
  const { toast } = useToast();
  const selfie = useSignedUrl(row.selfie_url);
  const doc = useSignedUrl(row.document_url);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const decide = async (status: "approved" | "rejected") => {
    if (status === "rejected" && !reason.trim()) {
      toast({ title: "Informe o motivo da rejeição", variant: "destructive" });
      return;
    }
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await (supabase as any).from("messenger_verifications").update({
      status,
      rejection_reason: status === "rejected" ? reason.trim() : null,
      reviewed_by: user?.id,
      reviewed_at: new Date().toISOString(),
    }).eq("id", row.id);
    setBusy(false);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: status === "approved" ? "Aprovado" : "Rejeitado" });
    onAction();
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="font-semibold">{row.full_name || "(sem nome)"}</p>
          <p className="text-xs text-muted-foreground">Doc: {row.document_number || "—"} · Enviado em {new Date(row.created_at).toLocaleString("pt-BR")}</p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full ${row.status === "pending" ? "bg-amber-500/15 text-amber-600" : row.status === "approved" ? "bg-green-500/15 text-green-600" : "bg-destructive/15 text-destructive"}`}>{row.status}</span>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Selfie</p>
          {selfie ? <a href={selfie} target="_blank" rel="noreferrer"><img src={selfie} alt="selfie" className="w-full max-h-64 object-contain rounded border border-border" /></a> : <div className="h-32 bg-secondary rounded" />}
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Documento</p>
          {doc ? <a href={doc} target="_blank" rel="noreferrer"><img src={doc} alt="documento" className="w-full max-h-64 object-contain rounded border border-border" /></a> : <div className="h-32 bg-secondary rounded" />}
        </div>
      </div>
      {row.status === "pending" && (
        <div className="space-y-2 pt-2 border-t border-border">
          <Input placeholder="Motivo (somente se rejeitar)" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => decide("approved")} disabled={busy} className="gap-1"><CheckCircle2 className="h-4 w-4" />Aprovar</Button>
            <Button size="sm" variant="outline" className="text-destructive gap-1" onClick={() => decide("rejected")} disabled={busy}><XCircle className="h-4 w-4" />Rejeitar</Button>
          </div>
        </div>
      )}
      {row.status === "rejected" && row.rejection_reason && (
        <p className="text-xs text-muted-foreground">Motivo: {row.rejection_reason}</p>
      )}
    </div>
  );
};

const AdminMessengerVerificationsPanel = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");

  const load = async () => {
    setLoading(true);
    let q = (supabase as any).from("messenger_verifications").select("*").order("created_at", { ascending: false }).limit(200);
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    setRows(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [filter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="h-6 w-6 text-primary" /> Verificações do Messenger</h1>
        <div className="ml-auto flex gap-1">
          {(["pending", "approved", "rejected", "all"] as const).map((s) => (
            <Button key={s} size="sm" variant={filter === s ? "default" : "outline"} onClick={() => setFilter(s)}>{s}</Button>
          ))}
        </div>
      </div>
      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma verificação {filter !== "all" ? filter : ""}.</p>
      ) : (
        <div className="grid gap-3">
          {rows.map((r) => <VerifRow key={r.id} row={r} onAction={load} />)}
        </div>
      )}
    </div>
  );
};

export default AdminMessengerVerificationsPanel;
