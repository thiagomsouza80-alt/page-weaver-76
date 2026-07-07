import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Send, MessageCircle, ArrowLeft, Paperclip, Mic, Square, Smile,
  Plus, Users, Reply, Forward as ForwardIcon, Trash2, X, Image as ImageIcon,
} from "lucide-react";
import { usePresenceHeartbeat, usePresenceOf, formatLastSeen } from "@/hooks/usePresence";
import { uploadMessengerAttachment } from "@/lib/messengerUpload";
import NewChatDialog from "@/components/messenger/NewChatDialog";
import ForwardDialog from "@/components/messenger/ForwardDialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";

type Conversation = {
  id: string; user_a: string | null; user_b: string | null; is_group: boolean;
  title: string | null; avatar_url: string | null; created_by: string | null;
  last_message_at: string | null; last_preview: string | null;
};
type Message = {
  id: string; conversation_id: string; sender_id: string;
  content: string | null; created_at: string;
  attachment_url: string | null; attachment_type: string | null; attachment_meta: any;
  reply_to_id: string | null; forwarded_from_id: string | null; deleted: boolean; edited_at: string | null;
};
type Reaction = { id: string; message_id: string; user_id: string; emoji: string };
type PeerInfo = { name: string; avatar: string | null };

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏", "🔥", "🎉"];
const QUICK_STICKERS = ["🎭", "🎨", "🎬", "🎤", "🎧", "🌴", "🌊", "☀️", "🇧🇷", "💚"];

const Mensagens = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reactions, setReactions] = useState<Record<string, Reaction[]>>({});
  const [peers, setPeers] = useState<Record<string, PeerInfo>>({});
  const [members, setMembers] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [forwardMsg, setForwardMsg] = useState<Message | null>(null);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [typing, setTyping] = useState<string[]>([]); // user ids typing
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingBroadcastRef = useRef<((v: boolean) => void) | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  usePresenceHeartbeat(userId);

  // Auth
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }
      setUserId(session.user.id);
      setLoading(false);
    })();
  }, [navigate]);

  // Load conversations via conversation_members
  const loadConvs = async (uid: string) => {
    const { data: memberships } = await (supabase as any)
      .from("conversation_members").select("conversation_id").eq("user_id", uid);
    const ids = (memberships || []).map((m: any) => m.conversation_id);
    if (ids.length === 0) { setConvs([]); return; }
    const { data } = await (supabase as any).from("conversations").select("*").in("id", ids)
      .order("last_message_at", { ascending: false, nullsFirst: false }).limit(100);
    const list: Conversation[] = data || [];
    setConvs(list);

    // Load peers for DMs + all group members (for headers)
    const dmPeerIds = list.filter((c) => !c.is_group).map((c) => (c.user_a === uid ? c.user_b : c.user_a)).filter(Boolean) as string[];
    if (dmPeerIds.length) {
      const uniq = Array.from(new Set(dmPeerIds));
      const [{ data: profs }, { data: artists }, { data: ents }, { data: orgs }] = await Promise.all([
        (supabase as any).from("user_profiles").select("user_id,display_name,username,avatar_url").in("user_id", uniq),
        (supabase as any).from("artists_public").select("user_id,name,profile_image_url").in("user_id", uniq),
        (supabase as any).from("entrepreneurs_public").select("user_id,name,logo_url").in("user_id", uniq),
        (supabase as any).from("organizers").select("user_id,organization_name,name,logo_url").in("user_id", uniq),
      ]);
      const map: Record<string, PeerInfo> = { ...peers };
      (profs || []).forEach((p: any) => { map[p.user_id] = { name: p.display_name || p.username || "Usuário", avatar: p.avatar_url || null }; });
      (orgs || []).forEach((o: any) => { const cur = map[o.user_id] || { name: "", avatar: null }; map[o.user_id] = { name: o.organization_name || o.name || cur.name, avatar: cur.avatar || o.logo_url || null }; });
      (artists || []).forEach((a: any) => { const cur = map[a.user_id] || { name: "", avatar: null }; map[a.user_id] = { name: cur.name || a.name, avatar: cur.avatar || a.profile_image_url || null }; });
      (ents || []).forEach((e: any) => { const cur = map[e.user_id] || { name: "", avatar: null }; map[e.user_id] = { name: cur.name || e.name, avatar: cur.avatar || e.logo_url || null }; });
      setPeers(map);
    }
  };
  useEffect(() => { if (userId) loadConvs(userId); }, [userId]);

  // Realtime: conversation updates + new memberships
  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`conv-list-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => loadConvs(userId))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "conversation_members", filter: `user_id=eq.${userId}` }, () => loadConvs(userId))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId]);

  // Query param navigation (?to=user or ?conv=id)
  useEffect(() => {
    if (!userId) return;
    const conv = params.get("conv");
    if (conv) { setActiveId(conv); setParams({}, { replace: true }); return; }
    const to = params.get("to");
    if (!to || to === userId) return;
    (async () => {
      const [a, b] = [userId, to].sort();
      const { data: existing } = await (supabase as any)
        .from("conversations").select("id").eq("user_a", a).eq("user_b", b).eq("is_group", false).maybeSingle();
      let id = existing?.id;
      if (!id) {
        const { data } = await (supabase as any).from("conversations").insert({
          user_a: a, user_b: b, is_group: false, created_by: userId,
        }).select("id").single();
        id = data?.id;
      }
      if (id) setActiveId(id);
      setParams({}, { replace: true });
      loadConvs(userId);
    })();
  }, [userId, params]);

  // Load members + messages for active conv, subscribe realtime
  useEffect(() => {
    if (!activeId || !userId) { setMessages([]); setMembers([]); setReactions({}); return; }
    let cancelled = false;
    (async () => {
      const [{ data: msgs }, { data: mems }] = await Promise.all([
        (supabase as any).from("messages").select("*").eq("conversation_id", activeId).order("created_at", { ascending: true }).limit(500),
        (supabase as any).from("conversation_members").select("user_id").eq("conversation_id", activeId),
      ]);
      if (cancelled) return;
      setMessages(msgs || []);
      const memIds: string[] = (mems || []).map((m: any) => m.user_id);
      setMembers(memIds);

      // Load member peers we don't have yet
      const missing = memIds.filter((id) => id !== userId && !peers[id]);
      if (missing.length) {
        const [{ data: profs }, { data: artists }, { data: ents }, { data: orgs }] = await Promise.all([
          (supabase as any).from("user_profiles").select("user_id,display_name,username,avatar_url").in("user_id", missing),
          (supabase as any).from("artists_public").select("user_id,name,profile_image_url").in("user_id", missing),
          (supabase as any).from("entrepreneurs_public").select("user_id,name,logo_url").in("user_id", missing),
          (supabase as any).from("organizers").select("user_id,organization_name,name,logo_url").in("user_id", missing),
        ]);
        const map: Record<string, PeerInfo> = { ...peers };
        (profs || []).forEach((p: any) => { map[p.user_id] = { name: p.display_name || p.username || "Usuário", avatar: p.avatar_url || null }; });
        (orgs || []).forEach((o: any) => { const cur = map[o.user_id] || { name: "", avatar: null }; map[o.user_id] = { name: o.organization_name || o.name || cur.name, avatar: cur.avatar || o.logo_url || null }; });
        (artists || []).forEach((a: any) => { const cur = map[a.user_id] || { name: "", avatar: null }; map[a.user_id] = { name: cur.name || a.name, avatar: cur.avatar || a.profile_image_url || null }; });
        (ents || []).forEach((e: any) => { const cur = map[e.user_id] || { name: "", avatar: null }; map[e.user_id] = { name: cur.name || e.name, avatar: cur.avatar || e.logo_url || null }; });
        setPeers(map);
      }

      // Reactions for these messages
      const msgIds = (msgs || []).map((m: any) => m.id);
      if (msgIds.length) {
        const { data: rx } = await (supabase as any).from("message_reactions").select("*").in("message_id", msgIds);
        const rmap: Record<string, Reaction[]> = {};
        (rx || []).forEach((r: any) => { (rmap[r.message_id] = rmap[r.message_id] || []).push(r); });
        setReactions(rmap);
      }

      // Mark as read
      await (supabase as any).from("conversation_members")
        .update({ last_read_at: new Date().toISOString() })
        .eq("conversation_id", activeId).eq("user_id", userId);

      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }), 60);
    })();

    // Realtime for this conversation
    const ch = supabase.channel(`conv-${activeId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${activeId}` }, (payload) => {
        setMessages((cur) => cur.some((m) => m.id === (payload.new as any).id) ? cur : [...cur, payload.new as Message]);
        setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }), 60);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${activeId}` }, (payload) => {
        setMessages((cur) => cur.map((m) => m.id === (payload.new as any).id ? payload.new as Message : m));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "messages", filter: `conversation_id=eq.${activeId}` }, (payload) => {
        setMessages((cur) => cur.filter((m) => m.id !== (payload.old as any).id));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reactions" }, (payload) => {
        const row: any = payload.new || payload.old;
        setReactions((cur) => {
          const list = cur[row.message_id] || [];
          if (payload.eventType === "INSERT") return { ...cur, [row.message_id]: [...list, row] };
          if (payload.eventType === "DELETE") return { ...cur, [row.message_id]: list.filter((r) => r.id !== row.id) };
          return cur;
        });
      })
      .on("broadcast", { event: "typing" }, (payload) => {
        const uid = payload.payload?.user_id;
        const isTyping = payload.payload?.typing;
        if (!uid || uid === userId) return;
        setTyping((cur) => {
          if (isTyping) return cur.includes(uid) ? cur : [...cur, uid];
          return cur.filter((u) => u !== uid);
        });
      })
      .subscribe();

    typingBroadcastRef.current = (v: boolean) => {
      ch.send({ type: "broadcast", event: "typing", payload: { user_id: userId, typing: v } });
    };

    return () => { cancelled = true; typingBroadcastRef.current = null; supabase.removeChannel(ch); };
  }, [activeId, userId]);

  // Typing broadcast on text change
  useEffect(() => {
    if (!typingBroadcastRef.current) return;
    if (text.length > 0) {
      typingBroadcastRef.current(true);
      if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = window.setTimeout(() => typingBroadcastRef.current?.(false), 2500);
    } else {
      typingBroadcastRef.current(false);
    }
  }, [text]);

  const activeConv = convs.find((c) => c.id === activeId);
  const dmPeerId = activeConv && !activeConv.is_group ? (activeConv.user_a === userId ? activeConv.user_b : activeConv.user_a) : null;
  const peerUsersForPresence = useMemo(() => (activeConv?.is_group ? members.filter((m) => m !== userId) : (dmPeerId ? [dmPeerId] : [])), [activeConv, members, dmPeerId, userId]);
  const presence = usePresenceOf(peerUsersForPresence);

  const send = async (overrideContent?: string) => {
    const content = (overrideContent ?? text).trim();
    if (!content || !activeId || !userId) return;
    setSending(true);
    const { error } = await (supabase as any).from("messages").insert({
      conversation_id: activeId, sender_id: userId, content: content.slice(0, 2000),
      reply_to_id: replyTo?.id || null,
    });
    setSending(false);
    if (error) { toast({ title: "Erro ao enviar", description: error.message, variant: "destructive" }); return; }
    if (!overrideContent) setText("");
    setReplyTo(null);
    typingBroadcastRef.current?.(false);
  };

  const sendAttachment = async (file: File) => {
    if (!activeId || !userId) return;
    setUploading(true);
    try {
      const up = await uploadMessengerAttachment(userId, file);
      const { error } = await (supabase as any).from("messages").insert({
        conversation_id: activeId, sender_id: userId,
        attachment_url: up.url, attachment_type: up.type, attachment_meta: up.meta,
        reply_to_id: replyTo?.id || null,
      });
      if (error) throw error;
      setReplyTo(null);
    } catch (e: any) {
      toast({ title: "Falha no envio", description: e.message || "Tente novamente", variant: "destructive" });
    } finally { setUploading(false); }
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) sendAttachment(f);
    e.target.value = "";
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const f = new File([blob], `audio-${Date.now()}.webm`, { type: "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        sendAttachment(f);
      };
      mediaRecorderRef.current = rec;
      rec.start();
      setRecording(true);
    } catch (e: any) {
      toast({ title: "Microfone indisponível", description: e.message, variant: "destructive" });
    }
  };
  const stopRecording = () => { mediaRecorderRef.current?.stop(); setRecording(false); };

  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!userId) return;
    const existing = (reactions[messageId] || []).find((r) => r.user_id === userId && r.emoji === emoji);
    if (existing) {
      await (supabase as any).from("message_reactions").delete().eq("id", existing.id);
    } else {
      await (supabase as any).from("message_reactions").insert({ message_id: messageId, user_id: userId, emoji });
    }
  };

  const deleteMessage = async (m: Message) => {
    if (m.sender_id !== userId) return;
    if (!confirm("Apagar mensagem?")) return;
    await (supabase as any).from("messages").update({ deleted: true, content: null, attachment_url: null }).eq("id", m.id);
  };

  const convTitle = (c: Conversation) => {
    if (c.is_group) return c.title || "Grupo";
    const pid = c.user_a === userId ? c.user_b : c.user_a;
    return pid ? (peers[pid]?.name || "Conversa") : "Conversa";
  };
  const convAvatar = (c: Conversation) => {
    if (c.is_group) return c.avatar_url;
    const pid = c.user_a === userId ? c.user_b : c.user_a;
    return pid ? peers[pid]?.avatar : null;
  };

  const headerStatus = () => {
    if (!activeConv) return "";
    if (activeConv.is_group) {
      const onlineCount = peerUsersForPresence.filter((u) => presence[u]?.is_online).length;
      return `${members.length} membros • ${onlineCount} online`;
    }
    if (!dmPeerId) return "";
    const p = presence[dmPeerId];
    if (p?.is_online) return "online";
    if (p?.last_seen_at) return `visto ${formatLastSeen(p.last_seen_at)}`;
    return "";
  };

  const typingLabel = () => {
    if (typing.length === 0) return "";
    if (typing.length === 1) return `${peers[typing[0]]?.name || "Alguém"} está digitando…`;
    return `${typing.length} pessoas digitando…`;
  };

  const renderReplyPreview = (msg: Message) => {
    if (!msg.reply_to_id) return null;
    const src = messages.find((x) => x.id === msg.reply_to_id);
    if (!src) return null;
    return (
      <div className="mb-1 border-l-2 border-primary/50 pl-2 text-xs opacity-80 truncate">
        <span className="font-semibold">{src.sender_id === userId ? "Você" : (peers[src.sender_id]?.name || "…")}</span>: {src.content?.slice(0, 60) || (src.attachment_type ? `[${src.attachment_type}]` : "")}
      </div>
    );
  };

  const renderAttachment = (m: Message) => {
    if (!m.attachment_url) return null;
    if (m.attachment_type === "image") return <img src={m.attachment_url} className="rounded-lg max-h-80 object-cover" />;
    if (m.attachment_type === "video") return <video src={m.attachment_url} controls className="rounded-lg max-h-80" />;
    if (m.attachment_type === "audio") return <audio src={m.attachment_url} controls className="w-full" />;
    return <a href={m.attachment_url} target="_blank" rel="noreferrer" className="underline text-sm break-all">{m.attachment_meta?.name || "Arquivo"}</a>;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-6 max-w-5xl">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold flex items-center gap-2"><MessageCircle className="h-6 w-6 text-primary" /> Mensagens</h1>
          <Button size="sm" onClick={() => setNewChatOpen(true)} className="gap-1"><Plus className="h-4 w-4" />Nova</Button>
        </div>

        {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
          <div className="grid md:grid-cols-[300px_1fr] gap-4 bg-card border border-border rounded-xl overflow-hidden min-h-[65vh]">
            {/* Lista */}
            <aside className={`border-r border-border overflow-y-auto max-h-[65vh] ${activeId ? "hidden md:block" : ""}`}>
              {convs.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">Nenhuma conversa. Clique em "Nova" para começar.</p>
              ) : convs.map((c) => {
                const av = convAvatar(c);
                return (
                  <button key={c.id} onClick={() => setActiveId(c.id)} className={`w-full text-left px-3 py-3 border-b border-border hover:bg-secondary/50 ${activeId === c.id ? "bg-secondary" : ""}`}>
                    <div className="flex items-center gap-2">
                      {av ? <img src={av} className="w-10 h-10 rounded-full object-cover" /> : (
                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                          {c.is_group ? <Users className="h-5 w-5 text-muted-foreground" /> : <MessageCircle className="h-5 w-5 text-muted-foreground" />}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{convTitle(c)}</p>
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
                    {convAvatar(activeConv) ? <img src={convAvatar(activeConv)!} className="w-9 h-9 rounded-full object-cover" /> : (
                      <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
                        {activeConv.is_group ? <Users className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{convTitle(activeConv)}</p>
                      <p className="text-xs text-muted-foreground truncate">{typing.length ? typingLabel() : headerStatus()}</p>
                    </div>
                  </header>

                  <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[55vh]">
                    {messages.map((m) => {
                      const mine = m.sender_id === userId;
                      const rx = reactions[m.id] || [];
                      const grouped: Record<string, number> = {};
                      rx.forEach((r) => { grouped[r.emoji] = (grouped[r.emoji] || 0) + 1; });
                      return (
                        <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"} group`}>
                          {!mine && activeConv.is_group && (
                            peers[m.sender_id]?.avatar
                              ? <img src={peers[m.sender_id].avatar!} className="w-7 h-7 rounded-full object-cover mr-2 self-end" />
                              : <div className="w-7 h-7 rounded-full bg-secondary mr-2 self-end" />
                          )}
                          <div className={`max-w-[75%] flex flex-col ${mine ? "items-end" : "items-start"}`}>
                            {!mine && activeConv.is_group && (
                              <span className="text-[10px] text-muted-foreground mb-0.5 ml-1">{peers[m.sender_id]?.name || "Membro"}</span>
                            )}
                            <div className={`rounded-2xl px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-secondary"} ${m.deleted ? "italic opacity-60" : ""}`}>
                              {m.forwarded_from_id && <p className="text-[10px] opacity-70 mb-0.5">↪ Encaminhada</p>}
                              {renderReplyPreview(m)}
                              {m.deleted ? <p>Mensagem apagada</p> : (
                                <>
                                  {renderAttachment(m)}
                                  {m.content && <p className="whitespace-pre-wrap break-words mt-1 first:mt-0">{m.content}</p>}
                                </>
                              )}
                              <p className="text-[10px] mt-1 opacity-70">{new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
                            </div>
                            {Object.keys(grouped).length > 0 && (
                              <div className="flex gap-1 mt-1 flex-wrap">
                                {Object.entries(grouped).map(([e, n]) => (
                                  <button key={e} onClick={() => toggleReaction(m.id, e)} className="text-xs bg-card border border-border rounded-full px-2 py-0.5 hover:bg-secondary">
                                    {e} {n > 1 && n}
                                  </button>
                                ))}
                              </div>
                            )}
                            {!m.deleted && (
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 mt-1">
                                <Popover>
                                  <PopoverTrigger asChild><button className="text-xs text-muted-foreground hover:text-foreground"><Smile className="h-3.5 w-3.5" /></button></PopoverTrigger>
                                  <PopoverContent className="w-auto p-2 flex gap-1">
                                    {EMOJIS.map((e) => (
                                      <button key={e} onClick={() => toggleReaction(m.id, e)} className="text-lg hover:scale-125 transition-transform">{e}</button>
                                    ))}
                                  </PopoverContent>
                                </Popover>
                                <button onClick={() => setReplyTo(m)} className="text-xs text-muted-foreground hover:text-foreground"><Reply className="h-3.5 w-3.5" /></button>
                                <button onClick={() => setForwardMsg(m)} className="text-xs text-muted-foreground hover:text-foreground"><ForwardIcon className="h-3.5 w-3.5" /></button>
                                {mine && <button onClick={() => deleteMessage(m)} className="text-xs text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {replyTo && (
                    <div className="px-3 py-1 border-t border-border flex items-center gap-2 bg-secondary/50">
                      <Reply className="h-3 w-3 text-primary" />
                      <span className="text-xs flex-1 truncate">Respondendo: {replyTo.content?.slice(0, 60) || `[${replyTo.attachment_type}]`}</span>
                      <button onClick={() => setReplyTo(null)}><X className="h-3 w-3" /></button>
                    </div>
                  )}

                  <div className="p-2 border-t border-border flex gap-2 items-center">
                    <input ref={fileInputRef} type="file" hidden accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.zip" onChange={onFile} />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" disabled={uploading}>
                          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem onClick={() => fileInputRef.current?.click()}><ImageIcon className="h-4 w-4 mr-2" />Foto / Vídeo / Arquivo</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Popover>
                      <PopoverTrigger asChild><Button size="icon" variant="ghost"><Smile className="h-4 w-4" /></Button></PopoverTrigger>
                      <PopoverContent className="w-auto p-2">
                        <div className="grid grid-cols-8 gap-1 max-w-[240px]">
                          {[...EMOJIS, ...QUICK_STICKERS].map((e) => (
                            <button key={e} onClick={() => send(e)} className="text-xl hover:scale-125 transition-transform">{e}</button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                    <Input value={text} onChange={(e) => setText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                      placeholder="Escreva uma mensagem" maxLength={2000} />
                    {text.trim() ? (
                      <Button onClick={() => send()} disabled={sending} size="icon">
                        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </Button>
                    ) : (
                      <Button onClick={recording ? stopRecording : startRecording} size="icon" variant={recording ? "destructive" : "ghost"}>
                        {recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground p-6">Selecione uma conversa</div>
              )}
            </section>
          </div>
        )}

        {userId && (
          <NewChatDialog open={newChatOpen} onOpenChange={setNewChatOpen} currentUserId={userId}
            onCreated={(id) => { setActiveId(id); if (userId) loadConvs(userId); }} />
        )}
        {userId && forwardMsg && (
          <ForwardDialog open={!!forwardMsg} onOpenChange={(v) => !v && setForwardMsg(null)}
            messageId={forwardMsg.id} content={forwardMsg.content} attachmentUrl={forwardMsg.attachment_url}
            attachmentType={forwardMsg.attachment_type} currentUserId={userId} />
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Mensagens;
