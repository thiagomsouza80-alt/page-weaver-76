import { useState, useEffect } from "react";
import { Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "amazonia_pop_fans";

const getFannedArtists = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
};

const setFannedArtists = (ids: string[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
};

interface FanButtonProps {
  artistId: string;
  initialCount: number;
}

const FanButton = ({ artistId, initialCount }: FanButtonProps) => {
  const [isFan, setIsFan] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    setIsFan(getFannedArtists().includes(artistId));
  }, [artistId]);

  const handleToggleFan = async () => {
    if (isFan) return; // Anônimo — não permite desfazer

    setAnimating(true);
    setTimeout(() => setAnimating(false), 600);

    // Optimistic update
    setCount((c) => c + 1);
    setIsFan(true);
    setFannedArtists([...getFannedArtists(), artistId]);

    const { data, error } = await supabase.rpc("increment_fan_count", {
      _artist_id: artistId,
    });

    if (error) {
      // Rollback
      setCount((c) => c - 1);
      setIsFan(false);
      setFannedArtists(getFannedArtists().filter((id) => id !== artistId));
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
