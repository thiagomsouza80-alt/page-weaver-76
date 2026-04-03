import { useState, useEffect } from "react";
import { CalendarCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface EuVouButtonProps {
  eventId: string;
  size?: "sm" | "default";
}

const EuVouButton = ({ eventId, size = "default" }: EuVouButtonProps) => {
  const [going, setGoing] = useState(false);
  const [count, setCount] = useState(0);
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
    // Fetch count
    supabase
      .from("event_attendees")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId)
      .then(({ count: c }) => {
        setCount(c ?? 0);
      });
  }, [eventId]);

  useEffect(() => {
    if (userId) {
      supabase
        .from("event_attendees")
        .select("id")
        .eq("user_id", userId)
        .eq("event_id", eventId)
        .maybeSingle()
        .then(({ data }) => {
          setGoing(!!data);
        });
    } else {
      setGoing(false);
    }
  }, [eventId, userId]);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;

    if (!userId) {
      toast.info("Faça o cadastro/login para confirmar presença", {
        action: {
          label: "Login",
          onClick: () => (window.location.href = "/login"),
        },
      });
      return;
    }

    setLoading(true);
    setAnimating(true);
    setTimeout(() => setAnimating(false), 600);

    if (going) {
      setGoing(false);
      setCount((c) => Math.max(c - 1, 0));

      const { error } = await supabase
        .from("event_attendees")
        .delete()
        .eq("user_id", userId)
        .eq("event_id", eventId);

      if (error) {
        toast.error("Erro ao cancelar presença. Tente novamente.");
        setGoing(true);
        setCount((c) => c + 1);
      }
    } else {
      setGoing(true);
      setCount((c) => c + 1);

      const { error } = await supabase
        .from("event_attendees")
        .insert({ user_id: userId, event_id: eventId });

      if (error) {
        toast.error("Erro ao confirmar presença. Tente novamente.");
        setGoing(false);
        setCount((c) => c - 1);
      }
    }

    setLoading(false);
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={cn(
        "inline-flex items-center gap-2 rounded-full font-semibold transition-all duration-300 active:scale-[0.96]",
        size === "sm" ? "px-3 py-1.5 text-xs" : "px-5 py-2.5 text-sm",
        going
          ? "bg-primary/15 text-primary hover:bg-destructive/10 hover:text-destructive"
          : "bg-secondary hover:bg-primary/10 text-foreground hover:text-primary"
      )}
    >
      <CalendarCheck
        className={cn(
          "transition-all duration-300",
          size === "sm" ? "h-3.5 w-3.5" : "h-4.5 w-4.5",
          going && "fill-primary text-primary",
          animating && "scale-125"
        )}
      />
      <span>{going ? "Eu vou!" : "Eu vou"}</span>
      <span className="text-xs text-muted-foreground font-normal ml-1">
        {count}
      </span>
    </button>
  );
};

export default EuVouButton;
