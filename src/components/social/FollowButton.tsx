import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus, UserCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

type Props = {
  targetType: "artist" | "entrepreneur";
  targetId: string;
  initialCount?: number;
  className?: string;
};

const FollowButton = ({ targetType, targetId, initialCount = 0, className }: Props) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [following, setFollowing] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        const { data } = await supabase
          .from("social_follows" as any)
          .select("id")
          .eq("follower_user_id", uid)
          .eq("target_type", targetType)
          .eq("target_id", targetId)
          .maybeSingle();
        setFollowing(!!data);
      }
    });
  }, [targetType, targetId]);

  const toggle = async () => {
    if (!userId) {
      toast.info("Entre para seguir este perfil");
      navigate("/login");
      return;
    }
    setLoading(true);
    try {
      if (following) {
        await supabase.from("social_follows" as any)
          .delete()
          .eq("follower_user_id", userId)
          .eq("target_type", targetType)
          .eq("target_id", targetId);
        await supabase.rpc("social_decrement_followers" as any, { _target_type: targetType, _target_id: targetId });
        setFollowing(false);
        setCount(c => Math.max(0, c - 1));
      } else {
        await supabase.from("social_follows" as any).insert({
          follower_user_id: userId, target_type: targetType, target_id: targetId,
        } as any);
        await supabase.rpc("social_increment_followers" as any, { _target_type: targetType, _target_id: targetId });
        setFollowing(true);
        setCount(c => c + 1);
      }
    } catch (e: any) {
      toast.error("Não foi possível atualizar agora");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={toggle} disabled={loading} variant={following ? "outline" : "hero"} size="sm" className={className}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : following ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
      <span>{following ? "Seguindo" : "Seguir"}</span>
      <span className="text-xs opacity-80 ml-1">· {count}</span>
    </Button>
  );
};

export default FollowButton;
