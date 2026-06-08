import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Camera,
  Loader2,
  Keyboard,
  StopCircle,
} from "lucide-react";

type Result =
  | { kind: "valid"; ticket: any }
  | { kind: "used"; ticket: any }
  | { kind: "cancelled"; ticket: any }
  | { kind: "notfound" }
  | null;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const AdminTicketValidationPanel = () => {
  const [mode, setMode] = useState<"manual" | "scan">("manual");
  const [code, setCode] = useState("");
  const [result, setResult] = useState<Result>(null);
  const [busy, setBusy] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = "qr-scanner-container";

  const validate = async (token: string) => {
    const value = (token || "").trim();
    if (!value) return;
    setBusy(true);
    setResult(null);
    try {
      const isUuid = UUID_RE.test(value);
      const { data: t } = isUuid
        ? await supabase.from("tickets" as any).select("*, events:event_id(title,event_date,location)").eq("qr_token", value).maybeSingle()
        : await supabase.from("tickets" as any).select("*, events:event_id(title,event_date,location)").eq("code", value.toUpperCase()).maybeSingle();

      if (!t) {
        setResult({ kind: "notfound" });
        return;
      }
      const status = (t as any).status;
      if (status === "used") {
        setResult({ kind: "used", ticket: t });
        return;
      }
      if (status === "cancelled") {
        setResult({ kind: "cancelled", ticket: t });
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      const { data: updated, error: upErr } = await supabase
        .from("tickets" as any)
        .update({
          status: "used",
          used_at: new Date().toISOString(),
          used_by: session?.user.id,
        } as any)
        .eq("id", (t as any).id)
        .select("*, events:event_id(title,event_date,location)")
        .single();
      if (upErr) throw upErr;
      setResult({ kind: "valid", ticket: updated });
    } finally {
      setBusy(false);
    }
  };

  const startScan = async () => {
    setMode("scan");
    setResult(null);
    setTimeout(async () => {
      try {
        const s = new Html5Qrcode(containerId);
        scannerRef.current = s;
        await s.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: 240 },
          async (decoded) => {
            try { await s.stop(); } catch {}
            scannerRef.current = null;
            validate(decoded);
          },
          () => {}
        );
      } catch {
        // permission denied or no camera — fall back
        setMode("manual");
      }
    }, 50);
  };

  const stopScan = async () => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop();
        scannerRef.current = null;
      }
    } catch {}
    setMode("manual");
  };

  useEffect(() => () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
    }
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Validar Ingressos</h1>
        <p className="text-muted-foreground">Leia o QR Code do participante ou digite o código (ex: AP-000001).</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button variant={mode === "manual" ? "default" : "outline"} onClick={stopScan} className="gap-2">
          <Keyboard className="h-4 w-4" /> Digitar código
        </Button>
        <Button variant={mode === "scan" ? "default" : "outline"} onClick={startScan} className="gap-2">
          <Camera className="h-4 w-4" /> Ler QR Code
        </Button>
      </div>

      {mode === "manual" ? (
        <div className="bg-card border border-border rounded-xl p-6 max-w-md space-y-4">
          <div className="space-y-2">
            <Label>Código do ingresso</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="AP-000001"
              onKeyDown={(e) => { if (e.key === "Enter") validate(code); }}
            />
          </div>
          <Button onClick={() => validate(code)} disabled={busy || !code.trim()} className="gap-2">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Validar
          </Button>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl p-4 max-w-md">
          <div id={containerId} className="w-full" />
          <Button variant="outline" onClick={stopScan} className="mt-4 gap-2">
            <StopCircle className="h-4 w-4" /> Parar câmera
          </Button>
        </div>
      )}

      {result && (
        <div className="max-w-md">
          {result.kind === "valid" && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-5">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-bold mb-3">
                <CheckCircle className="h-5 w-5" /> Ingresso válido
              </div>
              <p className="text-sm"><span className="text-muted-foreground">Participante:</span> <strong>{result.ticket.holder_name}</strong></p>
              <p className="text-sm"><span className="text-muted-foreground">Evento:</span> {result.ticket.events?.title || "—"}</p>
              <p className="text-sm"><span className="text-muted-foreground">Emissão:</span> {new Date(result.ticket.issued_at).toLocaleString("pt-BR")}</p>
              <p className="text-sm"><span className="text-muted-foreground">Código:</span> <strong>{result.ticket.code}</strong></p>
              <p className="text-xs text-muted-foreground mt-3">Status atualizado para "Utilizado".</p>
            </div>
          )}
          {result.kind === "used" && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-5">
              <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400 font-bold mb-3">
                <AlertCircle className="h-5 w-5" /> Ingresso já utilizado
              </div>
              <p className="text-sm"><span className="text-muted-foreground">Participante:</span> {result.ticket.holder_name}</p>
              <p className="text-sm"><span className="text-muted-foreground">Utilizado em:</span> {result.ticket.used_at ? new Date(result.ticket.used_at).toLocaleString("pt-BR") : "—"}</p>
              <p className="text-sm"><span className="text-muted-foreground">Código:</span> {result.ticket.code}</p>
            </div>
          )}
          {result.kind === "cancelled" && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-5">
              <div className="flex items-center gap-2 text-destructive font-bold mb-3">
                <XCircle className="h-5 w-5" /> Ingresso cancelado
              </div>
              <p className="text-sm">Código: {result.ticket.code}</p>
            </div>
          )}
          {result.kind === "notfound" && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-5">
              <div className="flex items-center gap-2 text-destructive font-bold">
                <XCircle className="h-5 w-5" /> Ingresso não encontrado
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminTicketValidationPanel;
