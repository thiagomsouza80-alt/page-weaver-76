import type { ClassRow } from "@/hooks/useUserProgression";
import { Sparkles } from "lucide-react";

export default function ClassBadge({ klass, size = "sm" }: { klass: ClassRow | null; size?: "sm" | "md" }) {
  if (!klass) return null;
  const sz = size === "md" ? "text-sm px-3 py-1.5" : "text-[11px] px-2 py-0.5";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold ${sz}`}
      style={{ background: `${klass.color}22`, color: klass.color || "#7c3aed" }}
      title={klass.description || klass.name}
    >
      <Sparkles className="h-3 w-3" />
      {klass.name}
    </span>
  );
}
