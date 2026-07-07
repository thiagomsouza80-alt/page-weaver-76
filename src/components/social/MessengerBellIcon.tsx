import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle } from "lucide-react";

/**
 * Ícone de mensageiro. Badge = conversas com mensagens mais novas que o last_read_at do usuário.
 */
const MessengerBellIcon = ({ userId }: { userId: string | null }) => {
  const [unread, setUnread] = useState(0);

  const load = async (uid: string) => {
    const { data: memberships } = await (supabase as any)
      .from("conversation_members").select("conversation_id,last_read_at").eq("user_id", uid);
    if (!memberships || memberships.length === 0) { setUnread(0); return; }
    const ids = memberships.map((m: any) => m.conversation_id);
    const { data: convs } = await (supabase as any)
      .from("conversations").select("id,last_message_at").in("id", ids);
    let count = 0;
    (convs || []).forEach((c: any) => {
      const mem = memberships.find((m: any) => m.conversation_id === c.id);
      if (!c.last_message_at) return;
      if (!mem?.last_read_at || new Date(c.last_message_at) > new Date(mem.last_read_at)) count++;
    });
    setUnread(count);
  };

  useEffect(() => {
    if (!userId) { setUnread(0); return; }
    load(userId);
    const ch = supabase
      .channel(`mb-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => load(userId))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "conversation_members", filter: `user_id=eq.${userId}` }, () => load(userId))
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
