import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Forward } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  messageId: string;
  content: string | null;
  attachmentUrl: string | null;
  attachmentType: string | null;
  currentUserId: string;
}

const ForwardDialog = ({ open, onOpenChange, messageId, content, attachmentUrl, attachmentType, currentUserId }: Props) => {
  const { toast } = useToast();
  const [convs, setConvs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      const { data: memberships } = await (supabase as any)
        .from("conversation_members").select("conversation_id").eq("user_id", currentUserId);
      const ids = (memberships || []).map((m: any) => m.conversation_id);
      if (ids.length === 0) { setConvs([]); setLoading(false); return; }
      const { data } = await (supabase as any).from("conversations").select("*").in("id", ids)
        .order("last_message_at", { ascending: false, nullsFirst: false }).limit(50);
      setConvs(data || []);
      setLoading(false);
    })();
  }, [open, currentUserId]);

  const forwardTo = async (convId: string) => {
    setSending(convId);
    const { error } = await (supabase as any).from("messages").insert({
      conversation_id: convId, sender_id: currentUserId,
      content: content || null, attachment_url: attachmentUrl, attachment_type: attachmentType,
      forwarded_from_id: messageId,
    });
    setSending(null);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Encaminhado" });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Forward className="h-5 w-5" />Encaminhar para…</DialogTitle></DialogHeader>
        {loading ? <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div> : (
          <div className="max-h-80 overflow-y-auto space-y-1">
            {convs.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhuma conversa.</p>}
            {convs.map((c) => (
              <Button key={c.id} variant="ghost" className="w-full justify-start" disabled={!!sending} onClick={() => forwardTo(c.id)}>
                {sending === c.id && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {c.is_group ? (c.title || "Grupo") : (c.last_preview || "Conversa")}
              </Button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ForwardDialog;
