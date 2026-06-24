import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck, Clock, XCircle, Upload, IdCard, Camera } from "lucide-react";
import { compressImage } from "@/lib/imageCompression";

type Verif = {
  id: string;
  status: "pending" | "approved" | "rejected";
  selfie_url: string | null;
  document_url: string | null;
  full_name: string | null;
  document_number: string | null;
  rejection_reason: string | null;
  created_at: string;
};

const MessengerVerificationCard = ({ userId }: { userId: string }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verif, setVerif] = useState<Verif | null>(null);
  const [fullName, setFullName] = useState("");
  const [docNumber, setDocNumber] = useState("");
  const [selfie, setSelfie] = useState<File | null>(null);
  const [doc, setDoc] = useState<File | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("messenger_verifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setVerif(data || null);
    setLoading(false);
  };

  useEffect(() => { if (userId) load(); }, [userId]);

  const uploadFile = async (file: File, kind: "selfie" | "document") => {
    const compressed = await compressImage(file).catch(() => file);
    const path = `${userId}/${kind}-${Date.now()}.jpg`;
    const { error } = await supabase.storage.from("messenger-verifications").upload(path, compressed, { upsert: true, contentType: "image/jpeg" });
    if (error) throw error;
    return path;
  };

  const submit = async () => {
    if (!fullName.trim() || !docNumber.trim() || !selfie || !doc) {
      toast({ title: "Preencha todos os campos", description: "Nome, documento, selfie e foto do documento.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const selfiePath = await uploadFile(selfie, "selfie");
      const docPath = await uploadFile(doc, "document");
      const { error } = await (supabase as any).from("messenger_verifications").insert({
        user_id: userId,
        full_name: fullName.trim(),
        document_number: docNumber.trim(),
        selfie_url: selfiePath,
        document_url: docPath,
        status: "pending",
      });
      if (error) throw error;
      toast({ title: "Verificação enviada", description: "Você receberá uma notificação após a análise." });
      setSelfie(null); setDoc(null); setFullName(""); setDocNumber("");
      load();
    } catch (e: any) {
      toast({ title: "Erro ao enviar", description: e?.message || "Tente novamente", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando verificação…</div>;
  }

  const statusBlock = (() => {
    if (!verif) return null;
    if (verif.status === "approved") {
      return <div className="flex items-center gap-2 text-green-600 text-sm"><ShieldCheck className="h-4 w-4" /> Verificado para o Messenger</div>;
    }
    if (verif.status === "pending") {
      return <div className="flex items-center gap-2 text-amber-600 text-sm"><Clock className="h-4 w-4" /> Em análise</div>;
    }
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-destructive text-sm"><XCircle className="h-4 w-4" /> Rejeitado</div>
        {verif.rejection_reason && <p className="text-xs text-muted-foreground">Motivo: {verif.rejection_reason}</p>}
      </div>
    );
  })();

  const canSubmit = !verif || verif.status === "rejected";

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Verificação do Messenger</h3>
        {statusBlock}
      </div>
      <p className="text-xs text-muted-foreground">Necessário para conversar com vendedores e usuários do marketplace. Enviaremos sua selfie e documento para análise; os arquivos ficam em armazenamento privado.</p>

      {canSubmit && (
        <div className="space-y-3 pt-2 border-t border-border">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Nome completo</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Como no documento" maxLength={120} />
            </div>
            <div>
              <Label className="text-xs">Nº do documento</Label>
              <Input value={docNumber} onChange={(e) => setDocNumber(e.target.value)} placeholder="RG ou CPF" maxLength={40} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="border border-dashed border-border rounded-lg p-3 flex flex-col items-center gap-1 cursor-pointer text-xs text-muted-foreground hover:border-primary">
              <Camera className="h-5 w-5" />
              <span>{selfie ? selfie.name.slice(0, 24) : "Selfie segurando o documento"}</span>
              <input type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => setSelfie(e.target.files?.[0] || null)} />
            </label>
            <label className="border border-dashed border-border rounded-lg p-3 flex flex-col items-center gap-1 cursor-pointer text-xs text-muted-foreground hover:border-primary">
              <IdCard className="h-5 w-5" />
              <span>{doc ? doc.name.slice(0, 24) : "Foto do documento"}</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setDoc(e.target.files?.[0] || null)} />
            </label>
          </div>
          <Button onClick={submit} disabled={saving} className="w-full gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Enviar para análise
          </Button>
        </div>
      )}
    </div>
  );
};

export default MessengerVerificationCard;
