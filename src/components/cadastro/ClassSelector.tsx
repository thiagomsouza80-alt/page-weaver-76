import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Sparkles } from "lucide-react";

export interface ClassOption {
  id: string;
  code: string;
  name: string;
  icon: string | null;
  color: string | null;
  description: string | null;
}

interface Props {
  value: string | null;
  onChange: (classId: string, klass: ClassOption) => void;
  label?: string;
  required?: boolean;
}

const emojiMap: Record<string, string> = {
  cosplayer: "🎭", dancarino: "💃", cantor: "🎤", musico: "🎸", gamer: "🎮",
  army: "💜", artista: "🎨", criador_conteudo: "🎬", youtuber: "📺",
  influenciador: "📱", streamer: "🎥", fotografo: "📸", videomaker: "🎞️",
  empreendedor: "🛍️", organizador_eventos: "🎫", fan: "⭐",
};

export default function ClassSelector({ value, onChange, label = "Escolha sua Classe", required }: Props) {
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("classes" as any)
      .select("id, code, name, icon, color, description")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => {
        setClasses((data as any) || []);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold">
          {label} {required && <span className="text-destructive">*</span>}
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {classes.map((c) => {
          const active = c.id === value;
          const emoji = emojiMap[c.code] || "✨";
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onChange(c.id, c)}
              className={`text-left rounded-xl border-2 px-3 py-2.5 transition-all ${
                active
                  ? "scale-[1.02] shadow-md border-transparent text-white"
                  : "border-border hover:border-primary/40 bg-card"
              }`}
              style={active ? { background: c.color || "#7c3aed" } : {}}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{emoji}</span>
                <span className="text-sm font-semibold truncate">{c.name}</span>
              </div>
              {c.description && (
                <p className={`text-[10px] mt-0.5 line-clamp-1 ${active ? "text-white/80" : "text-muted-foreground"}`}>
                  {c.description}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Mapeia Classe → segmento legado (artists.segment é NOT NULL com enum).
export function classToLegacySegment(klass: ClassOption | null | undefined): string {
  if (!klass) return "fan_cultura_pop";
  const map: Record<string, string> = {
    cosplayer: "cosplayer",
    army: "kpop",
    youtuber: "youtuber",
    influenciador: "influenciador_digital",
    fan: "fan_cultura_pop",
    artista: "ilustrador",
    fotografo: "ilustrador",
    videomaker: "ilustrador",
    criador_conteudo: "youtuber",
    streamer: "youtuber",
    gamer: "desenvolvedor_jogos",
    cantor: "fan_cultura_pop",
    musico: "fan_cultura_pop",
    dancarino: "fan_cultura_pop",
  };
  return map[klass.code] || "fan_cultura_pop";
}

export async function fetchClassByCode(code: string): Promise<ClassOption | null> {
  const { data } = await supabase
    .from("classes" as any)
    .select("id, code, name, icon, color, description")
    .eq("code", code)
    .maybeSingle();
  return (data as any) || null;
}
