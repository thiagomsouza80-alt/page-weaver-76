import { useUserProgression } from "@/hooks/useUserProgression";
import XpProgressBar from "./XpProgressBar";
import RankBadge from "./RankBadge";
import ClassBadge from "./ClassBadge";
import AchievementsList from "./AchievementsList";
import { Trophy, Heart, Users, Calendar } from "lucide-react";


export default function ProgressionCard({ userId }: { userId: string }) {
  const { progression, klass, rank, achievements, loading } = useUserProgression(userId);

  if (loading || !progression) {
    return (
      <div className="bg-card rounded-xl border border-border/50 p-6 animate-pulse">
        <div className="h-4 w-32 bg-secondary rounded mb-3" />
        <div className="h-2 w-full bg-secondary rounded" />
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border/50 p-6 space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Minha Progressão
          </h3>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <ClassBadge klass={klass} size="md" />
            <RankBadge rank={rank} size="md" />
          </div>
        </div>
      </div>

      <XpProgressBar xp={progression.xp} level={progression.level} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <Stat icon={Heart} label="Curtidas" value={progression.likes_received} />
        <Stat icon={Users} label="Seguidores" value={progression.followers_count} />
        <Stat icon={Calendar} label="Eventos" value={progression.events_attended} />
        <Stat icon={Trophy} label="Medalhas" value={achievements.length} />
      </div>

      <div className="pt-4 border-t border-border/50">
        <ClassPicker userId={userId} currentClassId={progression.class_id} />
      </div>

      <div className="pt-4 border-t border-border/50">
        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Trophy className="h-4 w-4" />
          Conquistas
        </h4>
        <AchievementsList items={achievements} />
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="rounded-lg bg-secondary/40 p-3">
      <Icon className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
      <p className="text-lg font-bold tabular-nums">{value.toLocaleString("pt-BR")}</p>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
    </div>
  );
}
