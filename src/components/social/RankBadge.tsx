import { Shield } from "lucide-react";
import type { RankRow } from "@/hooks/useUserProgression";

export default function RankBadge({ rank, size = "sm" }: { rank: RankRow | null; size?: "sm" | "md" }) {
  if (!rank) return null;
  const sz = size === "md" ? "text-sm px-3 py-1.5" : "text-[11px] px-2 py-0.5";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-bold border ${sz}`}
      style={{ borderColor: rank.color || "#94a3b8", color: rank.color || "#94a3b8" }}
      title={`Rank: ${rank.name}`}
    >
      <Shield className="h-3 w-3" />
      {rank.name}
    </span>
  );
}
