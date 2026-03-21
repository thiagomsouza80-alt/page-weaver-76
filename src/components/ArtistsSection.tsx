import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Artist = Tables<"artists">;

const segmentLabels: Record<string, string> = {
  cosplayer: "Cosplayer",
  cosmaker: "Cosmaker",
  kpop: "K-Pop",
  ilustrador: "Ilustrador",
  empreendedor: "Empreendedor",
};

const segmentBadgeColors: Record<string, string> = {
  cosplayer: "bg-[hsl(var(--badge-cosplay))]",
  cosmaker: "bg-[hsl(var(--badge-cosplay))]",
  kpop: "bg-[hsl(var(--badge-dancarina))]",
  ilustrador: "bg-[hsl(var(--badge-ilustrador))]",
  empreendedor: "bg-[hsl(var(--badge-eventos))]",
};

const ArtistsSection = () => {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("artists")
        .select("*")
        .eq("approved", true)
        .order("created_at", { ascending: false })
        .limit(4);
      setArtists(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const getSlug = (name: string) =>
    name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

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
      ) : artists.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">Nenhum artista em destaque no momento.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {artists.map((artist, i) => (
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
            </Link>
          ))}
        </div>
      )}
    </section>
  );
};

export default ArtistsSection;
