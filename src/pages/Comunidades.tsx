import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, Loader2, Search } from "lucide-react";

type Community = {
  id: string; name: string; slug: string; description: string | null;
  category: string | null; cover_url: string | null; members_count: number;
  posts_count: number; owner_user_id: string;
};

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
   .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);

export default function Comunidades() {
  const { toast } = useToast();
  const [items, setItems] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [me, setMe] = useState<string | null>(null);
  const [canCreate, setCanCreate] = useState(false);
  const [openCreate, setOpenCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", category: "", cover_url: "" });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("communities" as any)
      .select("*")
      .eq("is_public", true)
      .order("members_count", { ascending: false })
      .limit(60);
    setItems(((data as any) || []) as Community[]);
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      setMe(u.user?.id ?? null);
      if (u.user?.id) {
        const { data: a } = await supabase.from("artists").select("id").eq("user_id", u.user.id).limit(1);
        setCanCreate((a?.length ?? 0) > 0);
      }
      load();
    })();
  }, []);

  const create = async () => {
    if (!me) return;
    if (form.name.trim().length < 3) {
      toast({ title: "Nome muito curto", variant: "destructive" }); return;
    }
    setSaving(true);
    const slug = slugify(form.name) + "-" + Math.random().toString(36).slice(2, 6);
    const { error } = await supabase.from("communities" as any).insert({
      owner_user_id: me,
      name: form.name.trim(),
      slug,
      description: form.description.trim() || null,
      category: form.category.trim() || null,
      cover_url: form.cover_url.trim() || null,
    } as any);
    setSaving(false);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Comunidade criada!" });
    setOpenCreate(false);
    setForm({ name: "", description: "", category: "", cover_url: "" });
    load();
  };

  const filtered = items.filter((c) =>
    !q || c.name.toLowerCase().includes(q.toLowerCase()) ||
    (c.category || "").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 pt-24 pb-16">
        <header className="mb-6 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2"><Users className="h-7 w-7 text-primary" /> Comunidades</h1>
            <p className="text-sm text-muted-foreground mt-1">Encontre pessoas que curtem o mesmo que você.</p>
          </div>
          {canCreate && (
            <Button onClick={() => setOpenCreate(true)} className="gap-2"><Plus className="h-4 w-4" /> Criar comunidade</Button>
          )}
        </header>

        <div className="relative mb-6">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome ou categoria..." className="pl-9" />
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-16">
            {items.length === 0 ? "Ainda não há comunidades. Seja o primeiro artista a criar uma!" : "Nenhuma comunidade encontrada."}
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => (
              <Link key={c.id} to={`/comunidades/${c.slug}`} className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/50 transition">
                <div className="h-32 bg-secondary relative">
                  {c.cover_url ? (
                    <img src={c.cover_url} alt={c.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/30 to-fuchsia-500/30 flex items-center justify-center">
                      <Users className="h-10 w-10 text-white/80" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold line-clamp-1">{c.name}</h3>
                  {c.category && <p className="text-xs text-primary mb-1">{c.category}</p>}
                  {c.description && <p className="text-xs text-muted-foreground line-clamp-2">{c.description}</p>}
                  <div className="mt-2 text-xs text-muted-foreground flex gap-3">
                    <span>{c.members_count} membros</span>
                    <span>{c.posts_count} posts</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar comunidade</DialogTitle>
            <DialogDescription>Só artistas cadastrados podem criar comunidades. Você é o dono e vira o primeiro membro.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={80} /></div>
            <div><Label>Categoria</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Ex.: K-Pop, Cosplay, Games" maxLength={40} /></div>
            <div><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={400} rows={3} /></div>
            <div><Label>URL da imagem de capa (opcional)</Label><Input value={form.cover_url} onChange={(e) => setForm({ ...form, cover_url: e.target.value })} placeholder="https://..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>Cancelar</Button>
            <Button onClick={create} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
