import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, Loader2, UserPlus, ArrowLeft } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  organizerId: string;
  organizerUserId: string;
  onAdded?: () => void;
}

type FoundUser = {
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  avatar_url: string | null;
  account_types: string[];
};

const PAGE_SIZE = 10;

const roleLabel = (t: string) => {
  switch (t) {
    case "artist": return "Artista";
    case "entrepreneur": return "Empreendedor";
    case "organizer": return "Organizador";
    case "user": return "Usuário";
    default: return t;
  }
};

const AddValidatorDialog = ({ open, onOpenChange, organizerId, organizerUserId, onAdded }: Props) => {
  const { toast } = useToast();
  const [step, setStep] = useState<"search" | "configure">("search");
  const [q, setQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<FoundUser[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [selected, setSelected] = useState<FoundUser | null>(null);
  const debounceRef = useRef<number | null>(null);

  const [events, setEvents] = useState<{ id: string; title: string; event_date: string }[]>([]);
  const [eventId, setEventId] = useState<string>("");
  const [startsAt, setStartsAt] = useState<string>(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [endsAt, setEndsAt] = useState<string>("");
  const [permScan, setPermScan] = useState(true);
  const [permSearch, setPermSearch] = useState(true);
  const [permStats, setPermStats] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep("search");
    setQ(""); setResults([]); setSelected(null); setOffset(0); setHasMore(false);
    (async () => {
      const { data } = await supabase
        .from("events")
        .select("id, title, event_date")
        .eq("organizer_id", organizerId)
        .order("event_date", { ascending: false });
      setEvents((data as any[]) || []);
    })();
  }, [open, organizerId]);

  const runSearch = async (term: string, off = 0, append = false) => {
    if (term.trim().length < 2) {
      setResults([]); setHasMore(false); setOffset(0);
      return;
    }
    setSearching(true);
    const { data, error } = await supabase.rpc("search_users_for_validator_v2" as any, {
      _q: term.trim(),
      _limit: PAGE_SIZE,
      _offset: off,
    });
    setSearching(false);
    if (error) {
      toast({ title: "Erro na busca", description: error.message, variant: "destructive" });
      return;
    }
    const rows = ((data as any[]) || []) as FoundUser[];
    setResults((prev) => (append ? [...prev, ...rows] : rows));
    setHasMore(rows.length === PAGE_SIZE);
    setOffset(off + rows.length);
  };

  // Busca em tempo real com debounce
  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => { runSearch(q, 0, false); }, 300);
    return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, open]);

  const handleSelect = (u: FoundUser) => {
    setSelected(u);
    setStep("configure");
    if (events.length === 1) setEventId(events[0].id);
  };

  const handleAdd = async () => {
    if (!selected || !eventId) {
      toast({ title: "Selecione um evento", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("event_validators" as any).insert({
      event_id: eventId,
      organizer_id: organizerId,
      user_id: selected.user_id,
      validator_name: selected.name,
      validator_email: selected.email,
      validator_avatar_url: selected.avatar_url,
      permissions: { scan_qr: permScan, search_code: permSearch, view_stats: permStats },
      starts_at: new Date(startsAt).toISOString(),
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      status: "active",
      added_by: organizerUserId,
    } as any);
    setSaving(false);

    if (error) {
      toast({
        title: "Não foi possível adicionar",
        description: error.message.includes("duplicate") ? "Este usuário já é validador deste evento." : error.message,
        variant: "destructive",
      });
      return;
    }

    const ev = events.find((e) => e.id === eventId);

    // Log do convite
    try {
      await supabase.from("validator_invitation_logs" as any).insert({
        event_id: eventId,
        organizer_id: organizerId,
        target_user_id: selected.user_id,
        target_name: selected.name,
        target_email: selected.email,
        action: "invited",
        actor_user_id: organizerUserId,
        metadata: { event_title: ev?.title, account_types: selected.account_types },
      } as any);
    } catch {}

    // Notificação interna (best-effort)
    try {
      await supabase.from("social_notifications" as any).insert({
        user_id: selected.user_id,
        type: "validator_added",
        actor_user_id: organizerUserId,
        actor_name: "Equipe do Evento",
        preview: `Você foi adicionado à equipe de validação do evento "${ev?.title || ""}". Faça login para acessar.`,
      } as any);
    } catch {}

    toast({ title: "Validador adicionado!", description: `${selected.name} foi designado para validar este evento.` });
    onAdded?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{step === "search" ? "Adicionar Validador" : "Configurar Permissões"}</DialogTitle>
          <DialogDescription>
            {step === "search"
              ? "Busque qualquer usuário cadastrado por nome, e-mail ou telefone."
              : "Defina o evento e o período em que este usuário poderá validar ingressos."}
          </DialogDescription>
        </DialogHeader>

        {step === "search" ? (
          <div className="space-y-3">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Digite nome, e-mail ou telefone..."
                className="pl-9"
                autoFocus
              />
              {searching && (
                <Loader2 className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
            </div>
            <div className="max-h-80 overflow-y-auto space-y-2">
              {q.trim().length < 2 && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Digite pelo menos 2 caracteres para começar.
                </p>
              )}
              {q.trim().length >= 2 && results.length === 0 && !searching && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Nenhum usuário encontrado.
                </p>
              )}
              {results.map((u) => (
                <button
                  key={u.user_id}
                  onClick={() => handleSelect(u)}
                  className="w-full text-left flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-secondary/40 transition"
                >
                  <Avatar className="h-10 w-10">
                    {u.avatar_url && <AvatarImage src={u.avatar_url} />}
                    <AvatarFallback>{u.name?.[0] || "?"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{u.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {u.email || u.phone || "—"}{u.city ? ` • ${u.city}` : ""}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 justify-end max-w-[40%]">
                    {(u.account_types || []).map((t) => (
                      <Badge key={t} variant="outline" className="text-[10px] capitalize">{roleLabel(t)}</Badge>
                    ))}
                  </div>
                </button>
              ))}
              {hasMore && (
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => runSearch(q, offset, true)}
                  disabled={searching}
                >
                  {searching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Carregar mais
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {selected && (
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-secondary/30">
                <Avatar className="h-10 w-10">
                  {selected.avatar_url && <AvatarImage src={selected.avatar_url} />}
                  <AvatarFallback>{selected.name?.[0] || "?"}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{selected.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{selected.email}</div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Evento *</Label>
              <select
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Selecione um evento</option>
                {events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title} — {new Date(e.event_date).toLocaleDateString("pt-BR")}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Início *</Label>
                <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Término</Label>
                <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Permissões</Label>
              <div className="space-y-2 text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={permScan} onCheckedChange={(v) => setPermScan(!!v)} /> Ler QR Code e validar ingressos
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={permSearch} onCheckedChange={(v) => setPermSearch(!!v)} /> Buscar ingresso por código
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={permStats} onCheckedChange={(v) => setPermStats(!!v)} /> Visualizar quantidade de check-ins
                </label>
              </div>
            </div>

            <div className="flex justify-between gap-2 pt-2">
              <Button variant="ghost" onClick={() => setStep("search")} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Voltar
              </Button>
              <Button onClick={handleAdd} disabled={saving || !eventId} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                Adicionar Validador
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AddValidatorDialog;
