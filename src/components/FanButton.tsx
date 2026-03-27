import { useState, useEffect } from "react";
import { Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface FanButtonProps {
  artistId: string;
  initialCount: number;
}

const FanButton = ({ artistId, initialCount }: FanButtonProps) => {
  const [isFan, setIsFan] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [animating, setAnimating] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (userId) {
      supabase
        .from("fan_clicks")
        .select("id")
        .eq("user_id", userId)
        .eq("artist_id", artistId)
        .maybeSingle()
        .then(({ data }) => {
          setIsFan(!!data);
        });
    } else {
      setIsFan(false);
    }
  }, [artistId, userId]);

  const handleToggleFan = async () => {
    if (loading) return;

    if (!userId) {
      toast.info("Faça o cadastro/login para ser fã", {
        action: {
          label: "Login",
          onClick: () => window.location.href = "/login",
        },
      });
      return;
    }

    setLoading(true);
    setAnimating(true);
    setTimeout(() => setAnimating(false), 600);

    if (isFan) {
      // Unfan
      setIsFan(false);
      setCount((c) => Math.max(c - 1, 0));

      const { error: deleteError } = await supabase
        .from("fan_clicks")
        .delete()
        .eq("user_id", userId)
        .eq("artist_id", artistId);

      if (deleteError) {
        console.error("Erro ao remover fã:", deleteError);
        toast.error("Erro ao desmarcar fã. Tente novamente.");
        setIsFan(true);
        setCount((c) => c + 1);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.rpc("decrement_fan_count", {
        _artist_id: artistId,
      });

      if (!error && typeof data === "number") {
        setCount(data);
      }
    } else {
      // Fan
      setIsFan(true);
      setCount((c) => c + 1);

      const { error: insertError } = await supabase
        .from("fan_clicks")
        .insert({ user_id: userId, artist_id: artistId } as any);

      if (insertError) {
        setIsFan(false);
        setCount((c) => c - 1);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.rpc("increment_fan_count", {
        _artist_id: artistId,
      });

      if (!error && typeof data === "number") {
        setCount(data);
      }
    }

    setLoading(false);
  };

  return (
    <button
      onClick={handleToggleFan}
      disabled={loading}
      className={cn(
        "inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300",
        "active:scale-[0.96]",
        isFan
          ? "bg-primary/15 text-primary hover:bg-destructive/10 hover:text-destructive"
          : "bg-secondary hover:bg-primary/10 text-foreground hover:text-primary"
      )}
    >
      <Heart
        className={cn(
          "h-4.5 w-4.5 transition-all duration-300",
          isFan && "fill-primary text-primary",
          animating && "scale-125"
        )}
      />
      <span>{isFan ? "Sou fã!" : "Sou fã"}</span>
      <span className="text-xs text-muted-foreground font-normal ml-1">
        {count}
      </span>
    </button>
  );
};

export default FanButton;
