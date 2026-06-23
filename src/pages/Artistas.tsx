import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Loader2, Instagram, Heart } from "lucide-react";
import { getMembershipBadge } from "@/lib/membership";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  { name: "Ikarow", role: "Ilustrador", badge: "ilustrador", img: artistIlustrador, slug: "ikarow", bio: "Ilustrador digital especializado em arte fantasia e cultura pop amazônica.", instagram: "@ikarow.art" },
  { name: "Aurora Mitsukai", role: "Cosplayer", badge: "cosplayer", img: artistCosplayer, slug: "aurora-mitsukai", bio: "Cosplayer premiada com mais de 10 anos de experiência em competições nacionais.", instagram: "@aurora.mitsukai" },
  { name: "Alexandre Nascimento", role: "Quadrinista", badge: "ilustrador", img: artistQuadrinista, slug: "alexandre-nascimento", bio: "Quadrinista e roteirista com obras publicadas sobre lendas amazônicas.", instagram: "@alex.nasc.hq" },
  { name: "Hana Lee", role: "Dançarina Kpop", badge: "kpop", img: artistDancarina, slug: "hana-lee", bio: "Dançarina e coreógrafa de K-Pop, líder do grupo Hallyu Belém.", instagram: "@hana.kpop" },
];

const Artistas = () => {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSegment, setSelectedSegment] = useState<string>("all");

  useEffect(() => {
    const fetchArtists = async () => {
      const { data } = await (supabase as any)
        .from("artists_public")
        .select("id, name, segment, bio, city, instagram, profile_image_url, portfolio_images, youtube_url, membership_type, fan_count, followers_count, posts_count, approved, created_at, user_id")
        .eq("approved", true)
        .order("created_at", { ascending: false });
      setArtists((data as any) || []);
      setLoading(false);
    };
    fetchArtists();
  }, []);

  const getSlug = (name: string) =>
    name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const usedNames = new Set(artists.map(a => a.name.toLowerCase()));
  const remainingFallbacks = fallbackArtists.filter(fb => !usedNames.has(fb.name.toLowerCase()));

  const filteredArtists = selectedSegment === "all"
    ? artists
    : artists.filter(a => a.segment === selectedSegment);

  const filteredFallbacks = selectedSegment === "all"
    ? remainingFallbacks
    : remainingFallbacks.filter(fb => fb.badge === selectedSegment);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="pt-28 pb-20 px-6 md:px-12 max-w-7xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold mb-2 animate-fade-up">Artistas</h1>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-10">
          <p className="text-muted-foreground animate-fade-up-delay-1">
            Conheça os talentos da cena pop, geek e criativa da Amazônia.
          </p>
          <Select value={selectedSegment} onValueChange={setSelectedSegment}>
            <SelectTrigger className="w-full sm:w-[220px] animate-fade-up-delay-1">
              <SelectValue placeholder="Filtrar por segmento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os segmentos</SelectItem>
              {Object.entries(segmentLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredArtists.length === 0 && filteredFallbacks.length === 0 ? (
          <p className="text-muted-foreground text-center py-20">Nenhum artista encontrado para este segmento.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredArtists.map((artist) => (
              <Link
                key={artist.id}
                to={`/artistas/${getSlug(artist.name)}`}
                className="bg-card rounded-xl overflow-hidden card-hover group animate-fade-up block"
              >
                <div className="relative aspect-square overflow-hidden">
                  {artist.profile_image_url ? (
                    <img src={artist.profile_image_url} alt={artist.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full bg-secondary flex items-center justify-center">
                      <span className="text-4xl font-bold text-muted-foreground/40">{artist.name[0]}</span>
                    </div>
                  )}
                  <span className={`absolute bottom-3 left-3 ${segmentBadgeColors[artist.segment] || "bg-primary"} text-primary-foreground text-xs font-semibold px-3 py-1 rounded-md`}>
                    {segmentLabels[artist.segment] || artist.segment}
                  </span>
                </div>
                <div className="p-5 space-y-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg">{artist.name}</h3>
                    </div>
                    <p className="text-primary text-sm font-medium">{segmentLabels[artist.segment]}</p>
                    {getMembershipBadge((artist as any).membership_type) && (
                      <p className="text-sm font-semibold">{getMembershipBadge((artist as any).membership_type)}</p>
                    )}
                    {artist.fan_count > 0 && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Heart className="h-3 w-3 fill-primary text-primary" /> possui {artist.fan_count} {artist.fan_count === 1 ? "fan" : "fans"}
                      </p>
                    )}
                  </div>
                  {artist.bio && (
                    <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3">{artist.bio}</p>
                  )}
                  {artist.instagram && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Instagram className="h-3 w-3" /> {artist.instagram}
                    </p>
                  )}
                </div>
              </Link>
            ))}

            {filteredFallbacks.map((artist) => (
              <Link
                key={artist.slug}
                to={`/artistas/${artist.slug}`}
                className="bg-card rounded-xl overflow-hidden card-hover group animate-fade-up block"
              >
                <div className="relative aspect-square overflow-hidden">
                  <img src={artist.img} alt={artist.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <span className={`absolute bottom-3 left-3 ${segmentBadgeColors[artist.badge] || "bg-primary"} text-primary-foreground text-xs font-semibold px-3 py-1 rounded-md`}>
                    {segmentLabels[artist.badge] || artist.role}
                  </span>
                </div>
                <div className="p-5 space-y-3">
                  <div>
                    <h3 className="font-bold text-lg">{artist.name}</h3>
                    <p className="text-primary text-sm font-medium">{artist.role}</p>
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3">{artist.bio}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Instagram className="h-3 w-3" /> {artist.instagram}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
      <Footer />
    </div>
  );
};

export default Artistas;
