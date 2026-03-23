import { useState, useEffect } from "react";
import { Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface FanButtonProps {
  artistId: string;
  initialCount: number;
}

const FanButton = ({ artistId, initialCount }: FanButtonProps) => {
  const { toast } = useToast();
  const [isFan, setIsFan] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [animating, setAnimating] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id || null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Check if user already fanned (using localStorage as fallback)
    try {
      const fanned = JSON.parse(localStorage.getItem("amazonia_pop_fans") || "[]");
      setIsFan(fanned.includes(artistId));
    } catch {
      setIsFan(false);
    }
  }, [artistId]);

  const handleToggleFan = async () => {
    if (isFan) return;

    if (!userId) {
      toast({
        title: "Faça login para ser fã!",
        description: "Você precisa estar cadastrado e logado para curtir um artista.",
        variant: "destructive",
      });
      return;
    }

    setAnimating(true);
    setTimeout(() => setAnimating(false), 600);

    setCount((c) => c + 1);
    setIsFan(true);
    const fanned = JSON.parse(localStorage.getItem("amazonia_pop_fans") || "[]");
    localStorage.setItem("amazonia_pop_fans", JSON.stringify([...fanned, artistId]));

    const { data, error } = await supabase.rpc("increment_fan_count", {
      _artist_id: artistId,
    });

    if (error) {
      setCount((c) => c - 1);
      setIsFan(false);
      localStorage.setItem("amazonia_pop_fans", JSON.stringify(fanned.filter((id: string) => id !== artistId)));
    } else if (typeof data === "number") {
      setCount(data);
    }
  };

  return (
    <button
      onClick={handleToggleFan}
      disabled={isFan}
      className={cn(
        "inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300",
        "active:scale-[0.96]",
        isFan
          ? "bg-primary/15 text-primary cursor-default"
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
