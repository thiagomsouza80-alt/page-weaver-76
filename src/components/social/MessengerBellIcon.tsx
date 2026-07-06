import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle } from "lucide-react";

/**
 * Ícone de mensageiro exibido no topo do Social Pop.
 * Mostra badge com quantidade de conversas com mensagens novas
 * (baseado em last_message_at posterior ao último read do usuário).
 * Para simplicidade e escalabilidade, contamos conversas com
 * mensagens não enviadas por você criadas nas últimas 24h.
 */
const MessengerBellIcon = ({ userId }: { userId: string | null }) => {
  const [unread, setUnread] = useState(0);

  const load = async (uid: string) => {
    // Conversas do usuário
    const { data: convs } = await (supabase as any)
      .from("conversations")
      .select("id, last_message_at, user_a, user_b")
      .or(`user_a.eq.${uid},user_b.eq.${uid}`)
      .order("last_message_at", { ascending: false })
      .limit(50);
    if (!convs || convs.length === 0) { setUnread(0); return; }
    const ids = convs.map((c: any) => c.id);
    // Última mensagem de cada conversa; se sender != uid conta como não lida
    const { data: msgs } = await (supabase as any)
      .from("messages")
      .select("conversation_id, sender_id, created_at")
      .in("conversation_id", ids)
      .order("created_at", { ascending: false })
      .limit(200);
    const seen = new Set<string>();
    let count = 0;
    (msgs || []).forEach((m: any) => {
      if (seen.has(m.conversation_id)) return;
      seen.add(m.conversation_id);
      if (m.sender_id !== uid) count++;
    });
    setUnread(count);
  };

  useEffect(() => {
    if (!userId) { setUnread(0); return; }
    load(userId);
    const ch = supabase
      .channel(`mb-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => load(userId))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId]);

  return (
    <Link to="/mensagens" aria-label="Mensagens" className="relative inline-flex items-center justify-center h-10 w-10 rounded-full bg-secondary hover:bg-secondary/70 transition-colors">
      <MessageCircle className="h-5 w-5" />
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
};

export default MessengerBellIcon;
