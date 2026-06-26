import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ClassRow } from "@/hooks/useUserProgression";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Sparkles } from "lucide-react";

interface Props {
  userId: string;
  currentClassId: string | null;
  onChange?: (classId: string | null) => void;
}

export default function ClassPicker({ userId, currentClassId, onChange }: Props) {
  const { toast } = useToast();
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("classes" as any)
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => setClasses((data as any) || []));
  }, []);

  const pick = async (classId: string) => {
    setSaving(true);
    const { error } = await supabase
      .from("user_progression" as any)
      .upsert({ user_id: userId, class_id: classId }, { onConflict: "user_id" });
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar classe", description: error.message, variant: "destructive" });
      return;
    }
    onChange?.(classId);
    toast({ title: "Classe atualizada!" });
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm">Escolha sua Classe</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {classes.map((c) => {
          const active = c.id === currentClassId;
          return (
            <button
              key={c.id}
              type="button"
              disabled={saving}
              onClick={() => pick(c.id)}
              className={`text-xs font-semibold rounded-full px-3 py-1.5 transition-all border ${
                active ? "scale-105 shadow" : "opacity-80 hover:opacity-100"
              }`}
              style={{
                borderColor: c.color || "#7c3aed",
                background: active ? c.color || "#7c3aed" : "transparent",
                color: active ? "#fff" : c.color || "#7c3aed",
              }}
            >
              {c.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
