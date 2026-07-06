import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, MessageCircle, ArrowLeft } from "lucide-react";

type Conversation = {
  id: string;
  user_a: string;
  user_b: string;
  product_id: string | null;
  last_message_at: string | null;
  last_preview: string | null;
};

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

const Mensagens = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [peers, setPeers] = useState<Record<string, { name: string; avatar: string | null }>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  // Init
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }
      setUserId(session.user.id);
      setLoading(false);
    })();
  }, [navigate]);

  // Load conversations
  const loadConvs = async (uid: string) => {
    const { data } = await (supabase as any)
      .from("conversations").select("*")
      .or(`user_a.eq.${uid},user_b.eq.${uid}`)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(100);
    const list: Conversation[] = data || [];
    setConvs(list);
    const peerIds = Array.from(new Set(list.map((c) => c.user_a === uid ? c.user_b : c.user_a)));
    if (peerIds.length) {
      const [{ data: artists }, { data: ents }, { data: orgs }, { data: profs }] = await Promise.all([
        (supabase as any).from("artists_public").select("user_id,name,profile_image_url").in("user_id", peerIds),
        (supabase as any).from("entrepreneurs_public").select("user_id,name,logo_url").in("user_id", peerIds),
        (supabase as any).from("organizers").select("user_id,organization_name,name,logo_url").in("user_id", peerIds),
        (supabase as any).from("user_profiles").select("user_id,display_name,username,avatar_url").in("user_id", peerIds),
      ]);
      const map: Record<string, { name: string; avatar: string | null }> = {};
      (profs || []).forEach((p: any) => { map[p.user_id] = { name: p.display_name || p.username || "Usuário", avatar: p.avatar_url || null }; });
      (orgs || []).forEach((o: any) => {
        const cur = map[o.user_id] || { name: "Organizador", avatar: null };
        map[o.user_id] = { name: o.organization_name || o.name || cur.name, avatar: cur.avatar || o.logo_url || null };
      });
      (artists || []).forEach((a: any) => {
        const cur = map[a.user_id] || { name: a.name, avatar: null };
        map[a.user_id] = { name: cur.name || a.name, avatar: cur.avatar || a.profile_image_url || null };
      });
      (ents || []).forEach((e: any) => {
        const cur = map[e.user_id] || { name: e.name, avatar: null };
        map[e.user_id] = { name: cur.name || e.name, avatar: cur.avatar || e.logo_url || null };
      });
      setPeers(map);
    }
  };

  useEffect(() => { if (userId) loadConvs(userId); }, [userId]);

  // Auto-start conversation from ?to=&product=
  useEffect(() => {
    if (!userId) return;
    const to = params.get("to");
    const product = params.get("product");
    if (!to || to === userId) return;
    (async () => {
      const [a, b] = [userId, to].sort();
      const { data: existing } = await (supabase as any)
        .from("conversations").select("*")
        .eq("user_a", a).eq("user_b", b)
        .maybeSingle();
      let conv = existing;
      if (!conv) {
        const { data, error } = await (supabase as any).from("conversations").insert({
          user_a: a, user_b: b, product_id: product || null,
        }).select().single();
        if (error) { toast({ title: "Não foi possível iniciar conversa", description: error.message, variant: "destructive" }); return; }
        conv = data;
      }
      setActiveId(conv.id);
      setParams({}, { replace: true });
      loadConvs(userId);
    })();
  }, [userId, verified, params]);

  // Load messages for active
  useEffect(() => {
    if (!activeId) return;
    (async () => {
      const { data } = await (supabase as any).from("messages").select("*").eq("conversation_id", activeId).order("created_at", { ascending: true }).limit(500);
      setMessages(data || []);
      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }), 50);
    })();
    const ch = supabase
      .channel(`msgs-${activeId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${activeId}` }, (payload) => {
        setMessages((cur) => [...cur, payload.new as Message]);
        setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }), 50);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activeId]);

  const send = async () => {
    if (!text.trim() || !activeId || !userId) return;
    setSending(true);
    const content = text.trim().slice(0, 2000);
    const { error } = await (supabase as any).from("messages").insert({
      conversation_id: activeId, sender_id: userId, content,
    });
    setSending(false);
    if (error) { toast({ title: "Erro ao enviar", description: error.message, variant: "destructive" }); return; }
    setText("");
  };

  const activeConv = convs.find((c) => c.id === activeId);
  const peerOf = (c: Conversation) => (c.user_a === userId ? c.user_b : c.user_a);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-6 max-w-5xl">
        <h1 className="text-2xl font-bold mb-4 flex items-center gap-2"><MessageCircle className="h-6 w-6 text-primary" /> Mensagens</h1>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : verified !== true ? (
          <div className="bg-card border border-border rounded-xl p-6 text-center space-y-3">
            <ShieldAlert className="h-10 w-10 mx-auto text-amber-500" />
            <h2 className="font-semibold">Verificação necessária</h2>
            <p className="text-sm text-muted-foreground">Para usar o Messenger envie sua selfie + documento na aba de verificação do seu perfil.</p>
            <Link to="/meu-perfil"><Button>Ir para Meu Perfil</Button></Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-[280px_1fr] gap-4 bg-card border border-border rounded-xl overflow-hidden min-h-[60vh]">
            {/* Conv list */}
            <aside className={`border-r border-border ${activeId ? "hidden md:block" : ""}`}>
              {convs.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">Nenhuma conversa ainda.</p>
              ) : convs.map((c) => {
                const p = peers[peerOf(c)];
                return (
                  <button key={c.id} onClick={() => setActiveId(c.id)} className={`w-full text-left px-3 py-3 border-b border-border hover:bg-secondary/50 ${activeId === c.id ? "bg-secondary" : ""}`}>
                    <div className="flex items-center gap-2">
                      {p?.avatar ? <img src={p.avatar} className="w-8 h-8 rounded-full object-cover" /> : <div className="w-8 h-8 rounded-full bg-secondary" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p?.name || "Usuário"}</p>
                        <p className="text-xs text-muted-foreground truncate">{c.last_preview || "—"}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </aside>

            {/* Thread */}
            <section className={`flex flex-col ${!activeId ? "hidden md:flex" : ""}`}>
              {activeConv ? (
                <>
                  <header className="flex items-center gap-2 px-3 py-2 border-b border-border">
                    <Button size="icon" variant="ghost" className="md:hidden" onClick={() => setActiveId(null)}><ArrowLeft className="h-4 w-4" /></Button>
                    <p className="font-semibold text-sm">{peers[peerOf(activeConv)]?.name || "Conversa"}</p>
                  </header>
                  <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[60vh]">
                    {messages.map((m) => {
                      const mine = m.sender_id === userId;
                      return (
                        <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
                            <p className="whitespace-pre-wrap break-words">{m.content}</p>
                            <p className={`text-[10px] mt-1 opacity-70`}>{new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="p-2 border-t border-border flex gap-2">
                    <Input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Escreva uma mensagem" maxLength={2000} />
                    <Button onClick={send} disabled={sending || !text.trim()} className="gap-1">
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground p-6">Selecione uma conversa</div>
              )}
            </section>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Mensagens;
