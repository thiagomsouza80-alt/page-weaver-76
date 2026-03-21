import { Link } from "react-router-dom";
import artistIlustrador from "@/assets/artist-ilustrador.jpg";
import artistCosplayer from "@/assets/artist-cosplayer.jpg";
import artistQuadrinista from "@/assets/artist-quadrinista.jpg";
import artistDancarina from "@/assets/artist-dancarina.jpg";

const badgeColors: Record<string, string> = {
  Ilustrador: "bg-[hsl(var(--badge-ilustrador))]",
  Cosplayer: "bg-[hsl(var(--badge-cosplay))]",
  Quadrinista: "bg-[hsl(var(--badge-cosplay))]",
  "Dançarina Kpop": "bg-[hsl(var(--badge-dancarina))]",
};

const artists = [
  { img: artistIlustrador, name: "Ikarow", role: "Ilustrador", badge: "Ilustrador" },
  { img: artistCosplayer, name: "Aurora Mitsukai", role: "Cosplayer", badge: "Cosplayer" },
  { img: artistQuadrinista, name: "Alexandre Nascimento", role: "Quadrinista", badge: "Quadrinista" },
  { img: artistDancarina, name: "Hana Lee", role: "Dançarina Kpop", badge: "Dançarina Kpop" },
];

const ArtistsSection = () => {
  return (
    <section className="px-6 md:px-12 py-16 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl md:text-3xl font-bold">Artistas em Destaque</h2>
        <Link to="/artistas" className="text-primary text-sm font-semibold hover:underline">Ver todos →</Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {artists.map((artist, i) => (
          <div key={i} className={`card-hover cursor-pointer group animate-fade-up-delay-${Math.min(i + 1, 3)}`}>
            <div className="relative aspect-square rounded-xl overflow-hidden mb-3">
              <img src={artist.img} alt={artist.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
              <span className={`absolute bottom-3 left-3 ${badgeColors[artist.badge]} text-primary-foreground text-xs font-semibold px-3 py-1 rounded-md`}>
                {artist.badge}
              </span>
            </div>
            <h3 className="font-bold text-sm md:text-base">{artist.name}</h3>
            <p className="text-muted-foreground text-xs">{artist.role}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ArtistsSection;
