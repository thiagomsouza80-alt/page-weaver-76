import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Flag, Loader2 } from "lucide-react";

type TargetType = "post" | "comment" | "product" | "profile";

type Props = {
  targetType: TargetType;
  targetId: string;
  trigger?: React.ReactNode;
  variant?: "icon" | "button" | "menuitem";
  className?: string;
};

const REASONS = [
  "Spam ou propaganda",
  "Conteúdo ofensivo ou ódio",
  "Assédio ou bullying",
  "Conteúdo sexual ou nudez",
  "Violência ou ameaça",
  "Informação falsa",
  "Direitos autorais",
  "Outro",
];

const ReportDialog = ({ targetType, targetId, variant = "icon", className }: Props) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const openDialog = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.info("Entre para denunciar");
      navigate("/login");
      return;
    }
    setOpen(true);
  };

  const submit = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.from("social_reports" as any).insert({
      reporter_user_id: session!.user.id,
      target_type: targetType,
      target_id: targetId,
      reason,
      details: details || null,
    } as any);
    setLoading(false);
    if (error) { toast.error("Erro ao denunciar"); return; }
    toast.success("Denúncia enviada. Obrigado!");
    setOpen(false);
    setDetails("");
    setReason(REASONS[0]);
  };

  return (
    <>
      {variant === "icon" ? (
        <button onClick={openDialog} className={`text-muted-foreground hover:text-destructive transition-colors ${className ?? ""}`} title="Denunciar">
          <Flag className="h-4 w-4" />
        </button>
      ) : variant === "menuitem" ? (
        <button onClick={openDialog} className={`flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive ${className ?? ""}`}>
          <Flag className="h-3.5 w-3.5" /> Denunciar
        </button>
      ) : (
        <Button variant="outline" size="sm" onClick={openDialog} className={`gap-2 ${className ?? ""}`}>
          <Flag className="h-4 w-4" /> Denunciar
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Denunciar</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm">Motivo</Label>
              <RadioGroup value={reason} onValueChange={setReason} className="mt-2 space-y-1">
                {REASONS.map(r => (
                  <div key={r} className="flex items-center gap-2">
                    <RadioGroupItem value={r} id={r} />
                    <Label htmlFor={r} className="font-normal text-sm cursor-pointer">{r}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            <div>
              <Label className="text-sm">Detalhes (opcional)</Label>
              <Textarea value={details} onChange={e => setDetails(e.target.value)} maxLength={500} rows={3} placeholder="Conte mais sobre o problema..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={submit} disabled={loading} variant="hero">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Enviar denúncia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ReportDialog;
