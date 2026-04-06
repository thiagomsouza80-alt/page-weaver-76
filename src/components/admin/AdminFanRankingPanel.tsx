import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Trophy, Heart } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ArtistRanking {
  id: string;
  name: string;
  segment: string;
  fan_count: number;
  profile_image_url: string | null;
  city: string | null;
}

const segmentLabels: Record<string, string> = {
  cosplayer: "Cosplayer",
  cosmaker: "Cosmaker",
  kpop: "K-Pop",
  ilustrador: "Ilustrador",
  quadrinista: "Quadrinista",
  colecionador: "Colecionador",
  desenvolvedor_jogos: "Dev de Jogos",
  fan_cultura_pop: "Fã Cultura Pop",
  youtuber: "YouTuber",
  influenciador_digital: "Influenciador Digital",
};

const AdminFanRankingPanel = () => {
  const [artists, setArtists] = useState<ArtistRanking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRanking = async () => {
      const { data } = await supabase
        .from("artists")
        .select("id, name, segment, fan_count, profile_image_url, city")
        .eq("approved", true)
        .order("fan_count", { ascending: false })
        .limit(50);

      setArtists(data || []);
      setLoading(false);
    };
    fetchRanking();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const getMedalColor = (index: number) => {
    if (index === 0) return "text-yellow-500";
    if (index === 1) return "text-gray-400";
    if (index === 2) return "text-amber-600";
    return "text-muted-foreground";
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Trophy className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold text-foreground">Ranking de Fãs</h2>
      </div>

      <p className="text-muted-foreground mb-6">
        Top artistas ordenados por quantidade de fãs.
      </p>

      {artists.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">Nenhum artista aprovado encontrado.</p>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-16">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Artista</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Segmento</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Cidade</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fãs</th>
              </tr>
            </thead>
            <tbody>
              {artists.map((artist, index) => (
                <tr
                  key={artist.id}
                  className={`border-b border-border last:border-0 transition-colors hover:bg-muted/30 ${
                    index < 3 ? "bg-primary/5" : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    <span className={`font-bold text-lg ${getMedalColor(index)}`}>
                      {index < 3 ? (
                        <Trophy className="h-5 w-5 inline" />
                      ) : (
                        index + 1
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={artist.profile_image_url || undefined} alt={artist.name} />
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {artist.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-foreground">{artist.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-sm text-muted-foreground">
                      {segmentLabels[artist.segment] || artist.segment}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-sm text-muted-foreground">
                      {artist.city || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex items-center gap-1 font-semibold text-primary">
                      <Heart className="h-4 w-4 fill-primary" />
                      {artist.fan_count}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminFanRankingPanel;
