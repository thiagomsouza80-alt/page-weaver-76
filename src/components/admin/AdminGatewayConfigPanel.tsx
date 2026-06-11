import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, CreditCard, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { centsToBRL, brlToCents, formatBRLInput } from "@/lib/money";
import { invalidatePlatformFeeCache } from "@/lib/platformFee";

const AdminGatewayConfigPanel = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Gateway
  const [clientId, setClientId] = useState("");
  const [environment, setEnvironment] = useState("sandbox");
  const [active, setActive] = useState(false);
  // Settings
  const [feeInput, setFeeInput] = useState("1,00");

  const load = async () => {
    setLoading(true);
    const [{ data: gw }, { data: st }] = await Promise.all([
      supabase.from("payment_gateway_config" as any).select("*").eq("id", true).maybeSingle(),
      supabase.from("platform_settings" as any).select("*").eq("id", true).maybeSingle(),
    ]);
    const g = (gw as any) || {};
    setClientId(g.client_id || "");
    setEnvironment(g.environment || "sandbox");
    setActive(!!g.active);
    setFeeInput(formatBRLInput(((st as any)?.ticket_fee_cents ?? 100)));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const feeCents = brlToCents(feeInput);
      const [r1, r2] = await Promise.all([
        supabase.from("payment_gateway_config" as any).update({ client_id: clientId, environment, active, updated_by: user?.id, updated_at: new Date().toISOString() }).eq("id", true),
        supabase.from("platform_settings" as any).update({ ticket_fee_cents: feeCents, updated_by: user?.id, updated_at: new Date().toISOString() }).eq("id", true),
      ]);
      if (r1.error) throw r1.error;
      if (r2.error) throw r2.error;
      invalidatePlatformFeeCache();
      await (supabase as any).rpc("log_financial_event", {
        _action: "platform_config_updated",
        _entity_type: "platform_settings",
        _entity_id: null,
        _metadata: { fee_cents: feeCents, gateway_active: active, environment },
      });
      toast({ title: "Configurações salvas" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="max-w-3xl space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2"><Settings className="h-5 w-5 text-primary" />Configurações Financeiras</h2>

      <section className="bg-card rounded-xl border border-border p-6 space-y-4">
        <h3 className="font-semibold flex items-center gap-2"><Settings className="h-4 w-4" />Taxa Global por Ingresso</h3>
        <p className="text-sm text-muted-foreground">Cobrada automaticamente sobre cada ingresso pago. Padrão: R$ 1,00.</p>
        <div className="space-y-1.5 max-w-xs">
          <Label>Taxa por Ingresso (R$)</Label>
          <Input value={feeInput} onChange={e => setFeeInput(e.target.value)} placeholder="1,00" />
          <p className="text-xs text-muted-foreground">Valor atual: <strong>{centsToBRL(brlToCents(feeInput))}</strong></p>
        </div>
      </section>

      <section className="bg-card rounded-xl border border-border p-6 space-y-4">
        <h3 className="font-semibold flex items-center gap-2"><CreditCard className="h-4 w-4" />Gateway de Pagamento — MisticPay</h3>
        <p className="text-sm text-muted-foreground">
          Client Secret é armazenado de forma segura como variável de ambiente (<code className="text-xs">MISTICPAY_CLIENT_SECRET</code>) e nunca exposto ao frontend.
        </p>
        <div className="space-y-1.5">
          <Label>Client ID</Label>
          <Input value={clientId} onChange={e => setClientId(e.target.value)} placeholder="seu_client_id" />
        </div>
        <div className="space-y-1.5">
          <Label>Ambiente</Label>
          <div className="flex gap-3">
            <Button type="button" variant={environment === "sandbox" ? "default" : "outline"} size="sm" onClick={() => setEnvironment("sandbox")}>Sandbox</Button>
            <Button type="button" variant={environment === "production" ? "default" : "outline"} size="sm" onClick={() => setEnvironment("production")}>Produção</Button>
          </div>
        </div>
        <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
          <Label className="cursor-pointer">Integração Ativa</Label>
          <Switch checked={active} onCheckedChange={setActive} />
        </div>
        <p className="text-xs text-muted-foreground">
          Status: <strong className={active ? "text-green-600" : "text-yellow-600"}>{active ? "Conectado" : "Desativado"}</strong>
        </p>
      </section>

      <Button onClick={save} disabled={saving} className="gap-2">
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}Salvar
      </Button>
    </div>
  );
};

export default AdminGatewayConfigPanel;
