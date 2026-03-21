import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import artistIlustrador from "@/assets/artist-ilustrador.jpg";
import artistCosplayer from "@/assets/artist-cosplayer.jpg";
import artistQuadrinista from "@/assets/artist-quadrinista.jpg";
import artistDancarina from "@/assets/artist-dancarina.jpg";
import artistDigital from "@/assets/artist-digital.jpg";
import artistCollector from "@/assets/artist-collector.jpg";
import artistStreamer from "@/assets/artist-streamer.jpg";

const badgeColors: Record<string, string> = {
  Ilustrador: "bg-[hsl(var(--badge-ilustrador))]",
  Cosplayer: "bg-[hsl(var(--badge-cosplay))]",
  Quadrinista: "bg-[hsl(var(--badge-cosplay))]",
  "Dançarina Kpop": "bg-[hsl(var(--badge-dancarina))]",
  "Arte Digital": "bg-[hsl(var(--badge-quadrinhos))]",
  Colecionador: "bg-[hsl(var(--badge-eventos))]",
  Streamer: "bg-[hsl(var(--badge-dancarina))]",
};

const allArtists = [
  {
    img: artistIlustrador, name: "Ikarow", role: "Ilustrador", badge: "Ilustrador", slug: "ikarow",
    bio: "Artista visual especializado em ilustrações digitais com temática amazônica e fantasia. Seus trabalhos já foram destaque em convenções nacionais e internacionais. Conhecido por misturar elementos da fauna e flora amazônica com estética anime.",
    social: "@ikarow.art",
  },
  {
    img: artistCosplayer, name: "Aurora Mitsukai", role: "Cosplayer Profissional", badge: "Cosplayer", slug: "aurora-mitsukai",
    bio: "Uma das cosplayers mais reconhecidas da região Norte, Aurora é especialista em armaduras de EVA e próteses artísticas. Já representou o Amazonas em competições nacionais de cosplay e ministra workshops de confecção.",
    social: "@aurora.mitsukai",
  },
  {
    img: artistQuadrinista, name: "Alexandre Nascimento", role: "Quadrinista", badge: "Quadrinista", slug: "alexandre-nascimento",
    bio: "Criador do mangá autoral 'Guardiões da Floresta', Alexandre é um dos principais nomes dos quadrinhos independentes do Norte. Sua obra mistura mitologia amazônica com narrativas de mangá shonen.",
    social: "@alexnascimento.hq",
  },
  {
    img: artistDancarina, name: "Hana Lee", role: "Dançarina K-Pop", badge: "Dançarina Kpop", slug: "hana-lee",
    bio: "Líder do grupo de cover dance 'Sakura Dance Crew', Hana organiza encontros e apresentações de K-Pop em Belém. O grupo já acumula mais de 500 mil visualizações em vídeos de cover dance.",
    social: "@hana.lee.dance",
  },
  {
    img: artistDigital, name: "Rafael Tupã", role: "Artista Digital", badge: "Arte Digital", slug: "rafael-tupa",
    bio: "Especialista em arte digital e concept art para jogos independentes. Rafael trabalha com estúdios de games do Brasil e do exterior, criando personagens e cenários inspirados na Amazônia.",
    social: "@rafatupa.art",
  },
  {
    img: artistCollector, name: "Pedro Otaku", role: "Colecionador & Reviewer", badge: "Colecionador", slug: "pedro-otaku",
    bio: "Maior colecionador de figures e mangás do Amazonas, Pedro mantém um canal no YouTube onde faz reviews de action figures, unboxings e visitas a lojas geek de todo o Brasil.",
    social: "@pedro.otaku",
  },
  {
    img: artistStreamer, name: "Gabi Neon", role: "Streamer & Gamer", badge: "Streamer", slug: "gabi-neon",
    bio: "Streamer de Ananindeua com comunidade crescente na Twitch. Especializada em jogos de RPG e FPS, Gabi também organiza campeonatos online para a comunidade gamer da região Norte.",
    social: "@gabineon.live",
  },
];

const Artistas = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="pt-28 pb-20 px-6 md:px-12 max-w-7xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold mb-2 animate-fade-up">Artistas</h1>
        <p className="text-muted-foreground mb-10 animate-fade-up-delay-1">
          Conheça os talentos da cena pop, geek e criativa da Amazônia.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {allArtists.map((artist, i) => (
            <Link key={i} to={`/artistas/${artist.slug}`} className="bg-card rounded-xl overflow-hidden card-hover group animate-fade-up block">
              <div className="relative aspect-square overflow-hidden">
                <img src={artist.img} alt={artist.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <span className={`absolute bottom-3 left-3 ${badgeColors[artist.badge]} text-primary-foreground text-xs font-semibold px-3 py-1 rounded-md`}>
                  {artist.badge}
                </span>
              </div>
              <div className="p-5 space-y-3">
                <div>
                  <h3 className="font-bold text-lg">{artist.name}</h3>
                  <p className="text-primary text-sm font-medium">{artist.role}</p>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3">{artist.bio}</p>
                <p className="text-xs text-muted-foreground">{artist.social}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default Artistas;
