import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Layers, Ticket, Gift, Plus, Trash2, Pencil, Loader2, Copy, Calendar, Accessibility, UserRound, HeartHandshake, Ban,
} from "lucide-react";
import { centsToBRL } from "@/lib/money";

type Batch = {
  id: string; event_id: string; name: string; quantity: number | null;
  price_cents: number; starts_at: string | null; ends_at: string | null;
  sort_order: number; is_active: boolean;
};

type Category = {
  id: string; event_id: string; batch_id: string | null;
  kind: "full" | "half" | "solidarity" | "pcd" | "elderly" | "courtesy";
  name: string; description: string | null;
  price_cents: number; is_free: boolean; quantity: number | null;
  per_user_limit: number; sale_starts_at: string | null; sale_ends_at: string | null;
  is_active: boolean; requires_document: boolean; requires_donation: boolean;
  donation_description: string | null; sort_order: number;
};

type CourtesyCode = {
  id: string; code: string; max_uses: number; used_count: number;
  expires_at: string | null; is_active: boolean; assigned_user_id: string | null;
  category_id: string; created_at: string;
};

const KIND_META: Record<Category["kind"], { label: string; icon: any; defaultName: string; tip?: string }> = {
  full: { label: "Inteira", icon: Ticket, defaultName: "Ingresso Inteira" },
  half: { label: "Meia-Entrada", icon: Ticket, defaultName: "Meia-Entrada", tip: "Exige documento na entrada" },
  solidarity: { label: "Solidário", icon: HeartHandshake, defaultName: "Ingresso Solidário", tip: "Exige doação na entrada" },
  pcd: { label: "PCD", icon: Accessibility, defaultName: "Ingresso PCD", tip: "Exige documento na entrada" },
  elderly: { label: "Idoso", icon: UserRound, defaultName: "Ingresso Idoso", tip: "Exige documento na entrada" },
  courtesy: { label: "Cortesia", icon: Gift, defaultName: "Cortesia", tip: "Sempre gratuito, sem taxa" },
};

const toLocalInput = (iso: string | null) =>
  iso ? new Date(iso).toISOString().slice(0, 16) : "";

const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);

const batchStatus = (b: Batch): { label: string; color: string } => {
  const now = Date.now();
  if (!b.is_active) return { label: "Inativo", color: "bg-muted text-muted-foreground" };
  if (b.starts_at && new Date(b.starts_at).getTime() > now)
    return { label: "Agendado", color: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30" };
  if (b.ends_at && new Date(b.ends_at).getTime() < now)
    return { label: "Encerrado", color: "bg-red-500/15 text-red-600 border-red-500/30" };
  return { label: "Ativo", color: "bg-green-500/15 text-green-600 border-green-500/30" };
};

interface Props {
  eventId: string;
  useBatches: boolean;
  onUseBatchesChange: (v: boolean) => void;
}

const EventTicketingManager = ({ eventId, useBatches, onUseBatchesChange }: Props) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [courtesy, setCourtesy] = useState<CourtesyCode[]>([]);

  const [batchOpen, setBatchOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);

  const [catOpen, setCatOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);

  const [courtesyOpen, setCourtesyOpen] = useState(false);
  const [courtesyCategory, setCourtesyCategory] = useState<Category | null>(null);
  const [generateCount, setGenerateCount] = useState(10);
  const [generateExpires, setGenerateExpires] = useState("");
  const [generating, setGenerating] = useState(false);

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignQuery, setAssignQuery] = useState("");
  const [assignResults, setAssignResults] = useState<any[]>([]);
  const [assignSearching, setAssignSearching] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: bs }, { data: cs }, { data: cc }] = await Promise.all([
      supabase.from("event_ticket_batches" as any).select("*").eq("event_id", eventId).order("sort_order"),
      supabase.from("event_ticket_categories" as any).select("*").eq("event_id", eventId).order("sort_order"),
      supabase.from("event_courtesy_codes" as any).select("*").eq("event_id", eventId).order("created_at", { ascending: false }),
    ]);
    setBatches((bs as any) || []);
    setCategories((cs as any) || []);
    setCourtesy((cc as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [eventId]);

  const toggleUseBatches = async (v: boolean) => {
    const { error } = await supabase.from("events").update({ use_batches: v } as any).eq("id", eventId);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    onUseBatchesChange(v);
  };

  // ============== BATCH CRUD ==============
  const openNewBatch = () => {
    setEditingBatch({
      id: "", event_id: eventId,
      name: `${batches.length + 1}º Lote`,
      quantity: 100, price_cents: 0,
      starts_at: null, ends_at: null,
      sort_order: batches.length, is_active: true,
    });
    setBatchOpen(true);
  };

  const saveBatch = async () => {
    if (!editingBatch) return;
    const payload: any = {
      event_id: eventId,
      name: editingBatch.name.trim(),
      quantity: editingBatch.quantity,
      price_cents: editingBatch.price_cents || 0,
      starts_at: editingBatch.starts_at,
      ends_at: editingBatch.ends_at,
      sort_order: editingBatch.sort_order,
      is_active: editingBatch.is_active,
    };
    const q = editingBatch.id
      ? supabase.from("event_ticket_batches" as any).update(payload).eq("id", editingBatch.id)
      : supabase.from("event_ticket_batches" as any).insert(payload);
    const { error } = await q;
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Lote salvo" });
    setBatchOpen(false); setEditingBatch(null); load();
  };

  const deleteBatch = async (id: string) => {
    if (!confirm("Excluir este lote? Modalidades vinculadas ficarão sem lote.")) return;
    const { error } = await supabase.from("event_ticket_batches" as any).delete().eq("id", id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Lote excluído" }); load();
  };

  // ============== CATEGORY CRUD ==============
  const openNewCategory = (kind: Category["kind"]) => {
    const meta = KIND_META[kind];
    const isFreeKind = kind === "courtesy";
    setEditingCat({
      id: "", event_id: eventId, batch_id: null,
      kind, name: meta.defaultName, description: null,
      price_cents: 0, is_free: isFreeKind, quantity: 50, per_user_limit: 5,
      sale_starts_at: null, sale_ends_at: null,
      is_active: true,
      requires_document: kind === "half" || kind === "pcd" || kind === "elderly",
      requires_donation: kind === "solidarity",
      donation_description: kind === "solidarity" ? "1 kg de alimento não perecível" : null,
      sort_order: categories.length,
    });
    setCatOpen(true);
  };

  const saveCategory = async () => {
    if (!editingCat) return;
    const payload: any = {
      event_id: eventId,
      batch_id: editingCat.batch_id,
      kind: editingCat.kind,
      name: editingCat.name.trim(),
      description: editingCat.description?.trim() || null,
      price_cents: editingCat.is_free ? 0 : (editingCat.price_cents || 0),
      is_free: editingCat.is_free,
      quantity: editingCat.quantity,
      per_user_limit: editingCat.per_user_limit || 1,
      sale_starts_at: editingCat.sale_starts_at,
      sale_ends_at: editingCat.sale_ends_at,
      is_active: editingCat.is_active,
      requires_document: editingCat.requires_document,
      requires_donation: editingCat.requires_donation,
      donation_description: editingCat.donation_description?.trim() || null,
      sort_order: editingCat.sort_order,
    };
    const q = editingCat.id
      ? supabase.from("event_ticket_categories" as any).update(payload).eq("id", editingCat.id)
      : supabase.from("event_ticket_categories" as any).insert(payload);
    const { error } = await q;
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Modalidade salva" });
    setCatOpen(false); setEditingCat(null); load();
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("Excluir esta modalidade?")) return;
    const { error } = await supabase.from("event_ticket_categories" as any).delete().eq("id", id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Modalidade excluída" }); load();
  };

  // ============== COURTESY ==============
  const openCourtesyDialog = (cat: Category) => {
    setCourtesyCategory(cat);
    setGenerateCount(10);
    setGenerateExpires("");
    setCourtesyOpen(true);
  };

  const generateCodes = async () => {
    if (!courtesyCategory) return;
    setGenerating(true);
    try {
      const { error } = await supabase.rpc("generate_courtesy_codes" as any, {
        _category_id: courtesyCategory.id,
        _count: generateCount,
        _expires_at: generateExpires ? new Date(generateExpires).toISOString() : null,
      });
      if (error) throw error;
      toast({ title: `${generateCount} código(s) gerado(s)` });
      load();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally { setGenerating(false); }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Código copiado" });
  };

  const openAssign = (cat: Category) => {
    setCourtesyCategory(cat);
    setAssignQuery("");
    setAssignResults([]);
    setAssignOpen(true);
  };

  const searchUsers = async (q: string) => {
    setAssignQuery(q);
    if (q.length < 2) { setAssignResults([]); return; }
    setAssignSearching(true);
    const { data } = await supabase.rpc("search_users_for_validator" as any, { _q: q });
    setAssignResults((data as any) || []);
    setAssignSearching(false);
  };

  const assignCourtesy = async (user: any) => {
    if (!courtesyCategory) return;
    setAssigning(true);
    try {
      const { error } = await supabase.rpc("assign_courtesy_ticket" as any, {
        _category_id: courtesyCategory.id,
        _target_user_id: user.user_id,
        _holder_name: user.name,
        _holder_email: user.email || "",
        _holder_phone: user.phone || "",
      });
      if (error) throw error;
      toast({ title: `Cortesia atribuída a ${user.name}` });
      setAssignOpen(false);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally { setAssigning(false); }
  };

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base flex items-center gap-2"><Ticket className="h-4 w-4 text-primary" /> Lotes e Modalidades</CardTitle>
          <div className="flex items-center gap-2">
            <Switch id="use-batches" checked={useBatches} onCheckedChange={toggleUseBatches} />
            <Label htmlFor="use-batches" className="text-sm cursor-pointer">Utilizar lotes</Label>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="categories" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="categories"><Ticket className="h-4 w-4 mr-1.5" /> Modalidades</TabsTrigger>
            <TabsTrigger value="batches" disabled={!useBatches}><Layers className="h-4 w-4 mr-1.5" /> Lotes</TabsTrigger>
            <TabsTrigger value="courtesy"><Gift className="h-4 w-4 mr-1.5" /> Cortesia</TabsTrigger>
          </TabsList>

          {/* MODALIDADES */}
          <TabsContent value="categories" className="space-y-4 mt-4">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(KIND_META) as Category["kind"][]).map((k) => {
                const meta = KIND_META[k];
                const Icon = meta.icon;
                return (
                  <Button key={k} size="sm" variant="outline" className="gap-1.5" onClick={() => openNewCategory(k)}>
                    <Plus className="h-3.5 w-3.5" /><Icon className="h-3.5 w-3.5" /> {meta.label}
                  </Button>
                );
              })}
            </div>
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma modalidade ainda. O evento usará o modo legado (botão único).
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {categories.map((c) => {
                  const meta = KIND_META[c.kind];
                  const Icon = meta.icon;
                  const linkedBatch = c.batch_id ? batches.find((b) => b.id === c.batch_id) : null;
                  return (
                    <Card key={c.id} className={c.is_active ? "" : "opacity-60"}>
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Icon className="h-4 w-4 text-primary shrink-0" />
                            <span className="font-semibold truncate">{c.name}</span>
                          </div>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => { setEditingCat(c); setCatOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => deleteCategory(c.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5 text-xs">
                          <Badge variant="outline">{meta.label}</Badge>
                          {c.is_free ? <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30" variant="outline">Gratuito</Badge> : <Badge variant="secondary">{centsToBRL(c.price_cents)}</Badge>}
                          <Badge variant="outline">Qtd: {c.quantity ?? "∞"}</Badge>
                          <Badge variant="outline">Limite/usr: {c.per_user_limit}</Badge>
                          {linkedBatch && <Badge className="bg-primary/15 text-primary border-primary/30" variant="outline">{linkedBatch.name}</Badge>}
                          {c.requires_document && <Badge className="bg-yellow-500/15 text-yellow-700 border-yellow-500/30" variant="outline">📄 Doc</Badge>}
                          {c.requires_donation && <Badge className="bg-orange-500/15 text-orange-700 border-orange-500/30" variant="outline">🎁 Doação</Badge>}
                          {!c.is_active && <Badge variant="destructive"><Ban className="h-3 w-3 mr-1" />Inativa</Badge>}
                        </div>
                        {c.description && <p className="text-xs text-muted-foreground line-clamp-2">{c.description}</p>}
                        {c.kind === "courtesy" && (
                          <div className="flex gap-2 pt-1">
                            <Button size="sm" variant="outline" className="gap-1.5 flex-1" onClick={() => openCourtesyDialog(c)}>
                              <Plus className="h-3.5 w-3.5" /> Gerar códigos
                            </Button>
                            <Button size="sm" variant="outline" className="gap-1.5 flex-1" onClick={() => openAssign(c)}>
                              <UserRound className="h-3.5 w-3.5" /> Atribuir
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* LOTES */}
          <TabsContent value="batches" className="space-y-4 mt-4">
            <Button size="sm" onClick={openNewBatch} className="gap-2"><Plus className="h-4 w-4" /> Novo lote</Button>
            {batches.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum lote criado ainda.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {batches.map((b) => {
                  const s = batchStatus(b);
                  return (
                    <Card key={b.id}>
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold">{b.name}</span>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => { setEditingBatch(b); setBatchOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => deleteBatch(b.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5 text-xs">
                          <Badge className={s.color} variant="outline">{s.label}</Badge>
                          <Badge variant="secondary">{centsToBRL(b.price_cents)}</Badge>
                          <Badge variant="outline">Qtd: {b.quantity ?? "∞"}</Badge>
                        </div>
                        {(b.starts_at || b.ends_at) && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {b.starts_at ? new Date(b.starts_at).toLocaleString("pt-BR") : "—"} → {b.ends_at ? new Date(b.ends_at).toLocaleString("pt-BR") : "—"}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* CORTESIA */}
          <TabsContent value="courtesy" className="space-y-4 mt-4">
            {courtesy.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum código gerado ainda. Crie uma modalidade <strong>Cortesia</strong> e clique em "Gerar códigos".
              </p>
            ) : (
              <div className="space-y-2">
                {courtesy.map((c) => {
                  const cat = categories.find((x) => x.id === c.category_id);
                  return (
                    <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <code className="text-sm font-mono bg-secondary px-2 py-1 rounded">{c.code}</code>
                        <div className="text-xs text-muted-foreground truncate">
                          {cat?.name || "—"} · usado {c.used_count}/{c.max_uses}
                          {c.expires_at && ` · expira ${new Date(c.expires_at).toLocaleDateString("pt-BR")}`}
                        </div>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => copyCode(c.code)}><Copy className="h-4 w-4" /></Button>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* DIALOG: Batch */}
      <Dialog open={batchOpen} onOpenChange={(v) => { if (!v) { setBatchOpen(false); setEditingBatch(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBatch?.id ? "Editar lote" : "Novo lote"}</DialogTitle>
          </DialogHeader>
          {editingBatch && (
            <div className="space-y-3">
              <div><Label>Nome *</Label><Input value={editingBatch.name} onChange={(e) => setEditingBatch({ ...editingBatch, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Quantidade</Label><Input type="number" min={0} value={editingBatch.quantity ?? ""} onChange={(e) => setEditingBatch({ ...editingBatch, quantity: e.target.value ? parseInt(e.target.value) : null })} placeholder="Ilimitado" /></div>
                <div><Label>Preço (R$)</Label><Input type="number" min={0} step="0.01" value={(editingBatch.price_cents / 100).toString()} onChange={(e) => setEditingBatch({ ...editingBatch, price_cents: Math.round((parseFloat(e.target.value) || 0) * 100) })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Início</Label><Input type="datetime-local" value={toLocalInput(editingBatch.starts_at)} onChange={(e) => setEditingBatch({ ...editingBatch, starts_at: fromLocalInput(e.target.value) })} /></div>
                <div><Label>Fim</Label><Input type="datetime-local" value={toLocalInput(editingBatch.ends_at)} onChange={(e) => setEditingBatch({ ...editingBatch, ends_at: fromLocalInput(e.target.value) })} /></div>
              </div>
              <div className="flex items-center gap-2"><Switch checked={editingBatch.is_active} onCheckedChange={(v) => setEditingBatch({ ...editingBatch, is_active: v })} /><Label>Ativo</Label></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setBatchOpen(false); setEditingBatch(null); }}>Cancelar</Button>
            <Button onClick={saveBatch}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Category */}
      <Dialog open={catOpen} onOpenChange={(v) => { if (!v) { setCatOpen(false); setEditingCat(null); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCat?.id ? "Editar modalidade" : `Nova modalidade — ${editingCat ? KIND_META[editingCat.kind].label : ""}`}</DialogTitle>
            {editingCat && KIND_META[editingCat.kind].tip && (
              <DialogDescription>{KIND_META[editingCat.kind].tip}</DialogDescription>
            )}
          </DialogHeader>
          {editingCat && (
            <div className="space-y-3">
              <div><Label>Nome *</Label><Input value={editingCat.name} onChange={(e) => setEditingCat({ ...editingCat, name: e.target.value })} /></div>
              <div><Label>Descrição</Label><Textarea rows={2} value={editingCat.description || ""} onChange={(e) => setEditingCat({ ...editingCat, description: e.target.value })} /></div>

              {editingCat.kind !== "courtesy" && (
                <div className="flex items-center gap-2 p-3 rounded-lg border">
                  <Switch checked={editingCat.is_free} onCheckedChange={(v) => setEditingCat({ ...editingCat, is_free: v })} />
                  <Label className="flex-1">Modalidade gratuita</Label>
                </div>
              )}

              {!editingCat.is_free && editingCat.kind !== "courtesy" && (
                <div><Label>Preço (R$)</Label><Input type="number" min={0} step="0.01" value={(editingCat.price_cents / 100).toString()} onChange={(e) => setEditingCat({ ...editingCat, price_cents: Math.round((parseFloat(e.target.value) || 0) * 100) })} /></div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div><Label>Quantidade</Label><Input type="number" min={0} value={editingCat.quantity ?? ""} onChange={(e) => setEditingCat({ ...editingCat, quantity: e.target.value ? parseInt(e.target.value) : null })} placeholder="Ilimitado" /></div>
                <div><Label>Limite por usuário</Label><Input type="number" min={1} value={editingCat.per_user_limit} onChange={(e) => setEditingCat({ ...editingCat, per_user_limit: parseInt(e.target.value) || 1 })} /></div>
              </div>

              {useBatches && (
                <div>
                  <Label>Vincular a lote (opcional)</Label>
                  <Select value={editingCat.batch_id || "none"} onValueChange={(v) => setEditingCat({ ...editingCat, batch_id: v === "none" ? null : v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem lote</SelectItem>
                      {batches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div><Label>Venda inicia</Label><Input type="datetime-local" value={toLocalInput(editingCat.sale_starts_at)} onChange={(e) => setEditingCat({ ...editingCat, sale_starts_at: fromLocalInput(e.target.value) })} /></div>
                <div><Label>Venda encerra</Label><Input type="datetime-local" value={toLocalInput(editingCat.sale_ends_at)} onChange={(e) => setEditingCat({ ...editingCat, sale_ends_at: fromLocalInput(e.target.value) })} /></div>
              </div>

              <div className="space-y-2 p-3 rounded-lg border">
                <div className="flex items-center gap-2">
                  <Checkbox checked={editingCat.requires_document} onCheckedChange={(v) => setEditingCat({ ...editingCat, requires_document: !!v })} id="req-doc" />
                  <Label htmlFor="req-doc" className="text-sm">Exige documento comprobatório na entrada</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={editingCat.requires_donation} onCheckedChange={(v) => setEditingCat({ ...editingCat, requires_donation: !!v })} id="req-don" />
                  <Label htmlFor="req-don" className="text-sm">Exige doação na entrada</Label>
                </div>
                {editingCat.requires_donation && (
                  <Input placeholder="Ex.: 1 kg de alimento não perecível" value={editingCat.donation_description || ""} onChange={(e) => setEditingCat({ ...editingCat, donation_description: e.target.value })} />
                )}
              </div>

              <div className="flex items-center gap-2"><Switch checked={editingCat.is_active} onCheckedChange={(v) => setEditingCat({ ...editingCat, is_active: v })} /><Label>Modalidade ativa</Label></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCatOpen(false); setEditingCat(null); }}>Cancelar</Button>
            <Button onClick={saveCategory}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Generate courtesy */}
      <Dialog open={courtesyOpen} onOpenChange={setCourtesyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerar códigos — {courtesyCategory?.name}</DialogTitle>
            <DialogDescription>Cada código pode ser usado 1 vez no checkout.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Quantidade (1 a 500)</Label><Input type="number" min={1} max={500} value={generateCount} onChange={(e) => setGenerateCount(Math.max(1, Math.min(500, parseInt(e.target.value) || 1)))} /></div>
            <div><Label>Validade (opcional)</Label><Input type="datetime-local" value={generateExpires} onChange={(e) => setGenerateExpires(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCourtesyOpen(false)}>Cancelar</Button>
            <Button onClick={generateCodes} disabled={generating} className="gap-2">
              {generating && <Loader2 className="h-4 w-4 animate-spin" />} Gerar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Assign courtesy direct */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atribuir cortesia — {courtesyCategory?.name}</DialogTitle>
            <DialogDescription>Busque o usuário e o ingresso aparecerá em "Meus Ingressos" dele.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Buscar por nome, e-mail ou telefone…" value={assignQuery} onChange={(e) => searchUsers(e.target.value)} />
            {assignSearching && <Loader2 className="h-4 w-4 animate-spin mx-auto" />}
            <div className="max-h-72 overflow-y-auto space-y-1">
              {assignResults.map((u) => (
                <button
                  key={u.user_id}
                  onClick={() => assignCourtesy(u)}
                  disabled={assigning}
                  className="w-full text-left p-3 rounded-lg border hover:bg-secondary/50 transition-colors disabled:opacity-50"
                >
                  <div className="font-medium text-sm">{u.name}</div>
                  <div className="text-xs text-muted-foreground">{u.email} · {u.phone || "—"} · {u.account_type}</div>
                </button>
              ))}
              {!assignSearching && assignQuery.length >= 2 && assignResults.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum usuário encontrado.</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default EventTicketingManager;
