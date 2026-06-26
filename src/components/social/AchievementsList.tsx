import type { UserAchievementRow } from "@/hooks/useUserProgression";
import { Trophy } from "lucide-react";

const rarityColor: Record<string, string> = {
  common: "#94a3b8",
  rare: "#3b82f6",
  epic: "#a855f7",
  legendary: "#f59e0b",
};

export default function AchievementsList({ items }: { items: UserAchievementRow[] }) {
  if (!items?.length) {
    return (
      <div className="text-center text-sm text-muted-foreground py-6">
        <Trophy className="h-6 w-6 mx-auto mb-2 opacity-40" />
        Sem conquistas ainda. Participe da comunidade para desbloquear medalhas!
      </div>
    );
  }
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
      {items.map((ua) => {
        const a = ua.achievement;
        const color = rarityColor[a.rarity] || "#94a3b8";
        return (
          <div
            key={ua.id}
            className="text-center p-3 rounded-xl border bg-secondary/30"
            style={{ borderColor: `${color}55` }}
            title={a.description || a.name}
          >
            <div
              className="w-10 h-10 mx-auto rounded-full flex items-center justify-center mb-2"
              style={{ background: `${color}22`, color }}
            >
              <Trophy className="h-5 w-5" />
            </div>
            <p className="text-[11px] font-bold leading-tight">{a.name}</p>
            <p className="text-[10px] uppercase mt-0.5" style={{ color }}>
              {a.rarity}
            </p>
          </div>
        );
      })}
    </div>
  );
}
