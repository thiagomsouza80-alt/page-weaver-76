import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Users, MessageCircle, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { uploadMessengerAttachment } from "@/lib/messengerUpload";

type Candidate = { user_id: string; name: string; avatar_url: string | null };

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  currentUserId: string;
  onCreated: (conversationId: string) => void;
}

const NewChatDialog = ({ open, onOpenChange, currentUserId, onCreated }: Props) => {
  const { toast } = useToast();
  const [tab, setTab] = useState<"dm" | "group">("dm");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<Record<string, Candidate>>({});
  const [groupTitle, setGroupTitle] = useState("");
  const [groupPhoto, setGroupPhoto] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) { setQ(""); setResults([]); setSelected({}); setGroupTitle(""); setGroupPhoto(null); }
  }, [open]);

  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      const term = `%${q.trim().toLowerCase()}%`;
      const [{ data: profs }, { data: artists }, { data: ents }, { data: orgs }] = await Promise.all([
        (supabase as any).from("user_profiles").select("user_id,display_name,username,avatar_url")
          .or(`display_name.ilike.${term},username.ilike.${term}`).limit(15),
        (supabase as any).from("artists_public").select("user_id,name,profile_image_url").ilike("name", term).limit(15),
        (supabase as any).from("entrepreneurs_public").select("user_id,name,logo_url").ilike("name", term).limit(15),
        (supabase as any).from("organizers").select("user_id,organization_name,name,logo_url").or(`organization_name.ilike.${term},name.ilike.${term}`).limit(15),
      ]);
      const map = new Map<string, Candidate>();
      (profs || []).forEach((p: any) => { if (p.user_id !== currentUserId) map.set(p.user_id, { user_id: p.user_id, name: p.display_name || p.username, avatar_url: p.avatar_url }); });
      (artists || []).forEach((a: any) => { if (a.user_id !== currentUserId) map.set(a.user_id, { user_id: a.user_id, name: a.name, avatar_url: a.profile_image_url || map.get(a.user_id)?.avatar_url || null }); });
      (ents || []).forEach((e: any) => { if (e.user_id !== currentUserId) map.set(e.user_id, { user_id: e.user_id, name: e.name, avatar_url: e.logo_url || map.get(e.user_id)?.avatar_url || null }); });
      (orgs || []).forEach((o: any) => { if (o.user_id !== currentUserId) map.set(o.user_id, { user_id: o.user_id, name: o.organization_name || o.name, avatar_url: o.logo_url || map.get(o.user_id)?.avatar_url || null }); });
      setResults(Array.from(map.values()).slice(0, 20));
      setLoading(false);
    }, 250);
    return () => clearTimeout(t);
  }, [q, currentUserId]);

  const toggle = (c: Candidate) => {
    setSelected((s) => {
      const n = { ...s };
      if (n[c.user_id]) delete n[c.user_id]; else n[c.user_id] = c;
      return n;
    });
  };

  const startDm = async (other: Candidate) => {
    setSaving(true);
    const [a, b] = [currentUserId, other.user_id].sort();
    const { data: existing } = await (supabase as any)
      .from("conversations").select("id").eq("user_a", a).eq("user_b", b).eq("is_group", false).maybeSingle();
    let convId = existing?.id;
    if (!convId) {
      const { data, error } = await (supabase as any).from("conversations").insert({
        user_a: a, user_b: b, is_group: false, created_by: currentUserId,
      }).select("id").single();
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); setSaving(false); return; }
      convId = data.id;
    }
    setSaving(false);
    onCreated(convId);
    onOpenChange(false);
  };

  const createGroup = async () => {
    const members = Object.values(selected);
    if (!groupTitle.trim() || members.length < 2) {
      toast({ title: "Faltam dados", description: "Dê um nome e escolha ao menos 2 membros." });
      return;
    }
    setSaving(true);
    let avatar: string | null = null;
    if (groupPhoto) {
      try { const up = await uploadMessengerAttachment(currentUserId, groupPhoto); avatar = up.url; } catch {}
    }
    const { data: conv, error } = await (supabase as any).from("conversations").insert({
      is_group: true, title: groupTitle.trim().slice(0, 80), avatar_url: avatar, created_by: currentUserId,
    }).select("id").single();
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); setSaving(false); return; }
    // Trigger cria dono; adicionar demais membros
    await (supabase as any).from("conversation_members").insert(
      members.map((m) => ({ conversation_id: conv.id, user_id: m.user_id, role: "member" }))
    );
    setSaving(false);
    onCreated(conv.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Nova conversa</DialogTitle></DialogHeader>
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="dm" className="gap-1"><MessageCircle className="h-4 w-4" />Direta</TabsTrigger>
            <TabsTrigger value="group" className="gap-1"><Users className="h-4 w-4" />Grupo</TabsTrigger>
          </TabsList>

          <TabsContent value="dm" className="space-y-3 pt-3">
            <Input placeholder="Buscar pessoa" value={q} onChange={(e) => setQ(e.target.value)} />
            <div className="max-h-72 overflow-y-auto space-y-1">
              {loading && <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin" /></div>}
              {results.map((c) => (
                <button key={c.user_id} disabled={saving} onClick={() => startDm(c)}
                  className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-secondary text-left disabled:opacity-50">
                  {c.avatar_url ? <img src={c.avatar_url} className="w-8 h-8 rounded-full object-cover" /> : <div className="w-8 h-8 rounded-full bg-secondary" />}
                  <span className="text-sm">{c.name}</span>
                </button>
              ))}
              {!loading && q.length >= 2 && results.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Sem resultados.</p>}
            </div>
          </TabsContent>

          <TabsContent value="group" className="space-y-3 pt-3">
            <Input placeholder="Nome do grupo" value={groupTitle} onChange={(e) => setGroupTitle(e.target.value)} maxLength={80} />
            <label className="block text-xs text-muted-foreground">
              Foto do grupo (opcional):
              <input type="file" accept="image/*" className="block mt-1 text-sm" onChange={(e) => setGroupPhoto(e.target.files?.[0] || null)} />
            </label>
            <Input placeholder="Buscar membros" value={q} onChange={(e) => setQ(e.target.value)} />
            {Object.values(selected).length > 0 && (
              <div className="flex flex-wrap gap-1">
                {Object.values(selected).map((c) => (
                  <span key={c.user_id} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full flex items-center gap-1">
                    {c.name}
                    <button onClick={() => toggle(c)}>×</button>
                  </span>
                ))}
              </div>
            )}
            <div className="max-h-52 overflow-y-auto space-y-1">
              {loading && <div className="flex justify-center py-3"><Loader2 className="h-4 w-4 animate-spin" /></div>}
              {results.map((c) => {
                const on = !!selected[c.user_id];
                return (
                  <button key={c.user_id} onClick={() => toggle(c)}
                    className={`w-full flex items-center gap-2 p-2 rounded-lg text-left ${on ? "bg-primary/10" : "hover:bg-secondary"}`}>
                    {c.avatar_url ? <img src={c.avatar_url} className="w-8 h-8 rounded-full object-cover" /> : <div className="w-8 h-8 rounded-full bg-secondary" />}
                    <span className="text-sm flex-1">{c.name}</span>
                    {on && <Check className="h-4 w-4 text-primary" />}
                  </button>
                );
              })}
            </div>
            <Button onClick={createGroup} disabled={saving || !groupTitle.trim() || Object.values(selected).length < 2} className="w-full">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Criar grupo
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default NewChatDialog;
