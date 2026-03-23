import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Heart } from "lucide-react";
import { getMembershipBadge } from "@/lib/membership";
import type { Tables } from "@/integrations/supabase/types";
import artistIlustrador from "@/assets/artist-ilustrador.jpg";
import artistCosplayer from "@/assets/artist-cosplayer.jpg";
import artistQuadrinista from "@/assets/artist-quadrinista.jpg";
import artistDancarina from "@/assets/artist-dancarina.jpg";

type Artist = Tables<"artists">;

const segmentLabels: Record<string, string> = {
  cosplayer: "Cosplayer",
  cosmaker: "Cosmaker",
  kpop: "K-Pop",
  ilustrador: "Ilustrador",
  quadrinista: "Quadrinista",
  colecionador: "Colecionador",
  desenvolvedor_jogos: "Desenvolvedor de Jogos",
  fan_cultura_pop: "Fã de Cultura Pop",
  youtuber: "YouTuber",
  influenciador_digital: "Influenciador Digital",
};

const segmentBadgeColors: Record<string, string> = {
  cosplayer: "bg-[hsl(var(--badge-cosplay))]",
  cosmaker: "bg-[hsl(var(--badge-cosplay))]",
  kpop: "bg-[hsl(var(--badge-dancarina))]",
  ilustrador: "bg-[hsl(var(--badge-ilustrador))]",
  quadrinista: "bg-[hsl(var(--badge-ilustrador))]",
  colecionador: "bg-[hsl(var(--badge-eventos))]",
  desenvolvedor_jogos: "bg-[hsl(var(--badge-eventos))]",
  fan_cultura_pop: "bg-[hsl(var(--badge-cosplay))]",
  youtuber: "bg-[hsl(var(--badge-dancarina))]",
  influenciador_digital: "bg-[hsl(var(--badge-dancarina))]",
};

const fallbackArtists = [
  { name: "Ikarow", role: "Ilustrador", badge: "ilustrador", img: artistIlustrador, slug: "ikarow" },
  { name: "Aurora Mitsukai", role: "Cosplayer", badge: "cosplayer", img: artistCosplayer, slug: "aurora-mitsukai" },
  { name: "Alexandre Nascimento", role: "Quadrinista", badge: "ilustrador", img: artistQuadrinista, slug: "alexandre-nascimento" },
  { name: "Hana Lee", role: "Dançarina Kpop", badge: "kpop", img: artistDancarina, slug: "hana-lee" },
];

const ArtistsSection = () => {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArtists = async () => {
      const { data } = await supabase
        .from("artists")
        .select("*")
        .eq("approved", true)
        .order("created_at", { ascending: false })
        .limit(4);
      setArtists(data || []);
      setLoading(false);
    };
    fetchArtists();
  }, []);

  const getSlug = (name: string) =>
    name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  // Completar com fictícios se menos de 4 reais
  const displayArtists: Array<{ type: "real"; data: Artist } | { type: "fallback"; data: typeof fallbackArtists[number] }> = [];

  if (!loading) {
    for (const a of artists.slice(0, 4)) {
      displayArtists.push({ type: "real", data: a });
    }
    if (displayArtists.length < 4) {
      const usedNames = new Set(artists.map(a => a.name.toLowerCase()));
      for (const fb of fallbackArtists) {
        if (displayArtists.length >= 4) break;
        if (!usedNames.has(fb.name.toLowerCase())) {
          displayArtists.push({ type: "fallback", data: fb });
        }
      }
    }
  }

  return (
    <section className="px-6 md:px-12 py-16 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl md:text-3xl font-bold">Artistas em Destaque</h2>
        <Link to="/artistas" className="text-primary text-sm font-semibold hover:underline">Ver todos →</Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {displayArtists.map((item, i) => {
            if (item.type === "fallback") {
              const artist = item.data;
              return (
                <Link
                  key={artist.slug}
                  to={`/artistas/${artist.slug}`}
                  className={`card-hover group animate-fade-up-delay-${Math.min(i + 1, 3)} block`}
                >
                  <div className="relative aspect-square rounded-xl overflow-hidden mb-3">
                    <img src={artist.img} alt={artist.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    <span className={`absolute bottom-3 left-3 ${segmentBadgeColors[artist.badge] || "bg-primary"} text-primary-foreground text-xs font-semibold px-3 py-1 rounded-md`}>
                      {segmentLabels[artist.badge] || artist.role}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm md:text-base">{artist.name}</h3>
                  <p className="text-muted-foreground text-xs">{artist.role}</p>
                </Link>
              );
            }
            const artist = item.data;
            return (
              <Link
                key={artist.id}
                to={`/artistas/${getSlug(artist.name)}`}
                className={`card-hover group animate-fade-up-delay-${Math.min(i + 1, 3)} block`}
              >
                <div className="relative aspect-square rounded-xl overflow-hidden mb-3">
                  {artist.profile_image_url ? (
                    <img src={artist.profile_image_url} alt={artist.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full bg-secondary flex items-center justify-center">
                      <span className="text-3xl font-bold text-muted-foreground/40">{artist.name[0]}</span>
                    </div>
                  )}
                  <span className={`absolute bottom-3 left-3 ${segmentBadgeColors[artist.segment] || "bg-primary"} text-primary-foreground text-xs font-semibold px-3 py-1 rounded-md`}>
                    {segmentLabels[artist.segment] || artist.segment}
                  </span>
                </div>
                <h3 className="font-bold text-sm md:text-base">{artist.name}</h3>
                <p className="text-muted-foreground text-xs">{segmentLabels[artist.segment]}</p>
                {getMembershipBadge((artist as any).membership_type) && (
                  <p className="text-xs font-semibold mt-0.5">{getMembershipBadge((artist as any).membership_type)}</p>
                )}
                {artist.fan_count > 0 && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Heart className="h-3 w-3 fill-primary text-primary" /> possui {artist.fan_count} {artist.fan_count === 1 ? "fan" : "fans"}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default ArtistsSection;
