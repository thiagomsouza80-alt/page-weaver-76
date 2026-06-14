import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, FileText } from "lucide-react";

interface LogRow {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  user_id: string | null;
  amount_cents: number | null;
  metadata: any;
  created_at: string;
}

const AdminLogsPanel = () => {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("financial_audit_logs" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      setLogs((data as any) || []);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold flex items-center gap-2 mb-6">
        <FileText className="h-5 w-5 text-primary" />
        Logs do Sistema
      </h2>

      {logs.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">Nenhum log registrado ainda.</p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50">
                  <tr className="text-left">
                    <th className="px-3 py-2">Data</th>
                    <th className="px-3 py-2">Ação</th>
                    <th className="px-3 py-2">Entidade</th>
                    <th className="px-3 py-2">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l) => (
                    <tr key={l.id} className="border-t border-border/40">
                      <td className="px-3 py-2 whitespace-nowrap text-xs">{new Date(l.created_at).toLocaleString("pt-BR")}</td>
                      <td className="px-3 py-2 font-medium">{l.action}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{l.entity_type || "—"}</td>
                      <td className="px-3 py-2 text-right">{l.amount_cents != null ? `R$ ${(l.amount_cents / 100).toFixed(2)}` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {logs.map((l) => (
              <div key={l.id} className="bg-card rounded-xl border border-border p-3 text-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{l.action}</span>
                  <span className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString("pt-BR")}</span>
                </div>
                <p className="text-xs text-muted-foreground">{l.entity_type || "—"}</p>
                {l.amount_cents != null && (
                  <p className="text-xs mt-1">Valor: <strong>R$ {(l.amount_cents / 100).toFixed(2)}</strong></p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default AdminLogsPanel;
