import { xpRangeForLevel } from "@/hooks/useUserProgression";
import { cn } from "@/lib/utils";

interface Props {
  xp: number;
  level: number;
  className?: string;
  compact?: boolean;
}

export default function XpProgressBar({ xp, level, className, compact }: Props) {
  const { start, end, need } = xpRangeForLevel(level);
  const into = Math.max(0, xp - start);
  const pct = Math.min(100, Math.round((into / need) * 100));

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-xs font-bold text-foreground">
          Nível <span className="text-primary">{level}</span>
        </span>
        {!compact && (
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {into.toLocaleString("pt-BR")} / {need.toLocaleString("pt-BR")} XP
          </span>
        )}
      </div>
      <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      {compact && (
        <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
          {xp.toLocaleString("pt-BR")} XP
        </p>
      )}
    </div>
  );
}
