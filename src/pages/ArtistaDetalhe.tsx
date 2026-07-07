import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ArrowLeft, Instagram, Loader2, MapPin } from "lucide-react";
import ShareButtons from "@/components/ShareButtons";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { getMembershipBadge } from "@/lib/membership";
import ProfileHeaderCard from "@/components/social/ProfileHeaderCard";
import UserRecentPosts from "@/components/social/UserRecentPosts";

import artistIlustrador from "@/assets/artist-ilustrador.jpg";
import artistCosplayer from "@/assets/artist-cosplayer.jpg";
import artistQuadrinista from "@/assets/artist-quadrinista.jpg";
import artistDancarina from "@/assets/artist-dancarina.jpg";
import artistDigital from "@/assets/artist-digital.jpg";
import artistCollector from "@/assets/artist-collector.jpg";
import artistStreamer from "@/assets/artist-streamer.jpg";
import ikarowPortfolio1 from "@/assets/ikarow-portfolio-1.jpg";
import ikarowPortfolio2 from "@/assets/ikarow-portfolio-2.jpg";
import ikarowPortfolio3 from "@/assets/ikarow-portfolio-3.jpg";

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

const getYouTubeEmbedUrl = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    let videoId: string | null = null;
    if (parsed.hostname.includes("youtube.com")) {
      videoId = parsed.searchParams.get("v");
    } else if (parsed.hostname.includes("youtu.be")) {
      videoId = parsed.pathname.slice(1);
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  } catch {
    return null;
  }
};

const artistsData: Record<string, {
  img: string;
  name: string;
  role: string;
  badge: string;
  bio: string;
  social: string;
  fullBio: string;
  portfolio: string[];
}> = {
  ikarow: {
    img: artistIlustrador,
    name: "Ikarow",
    role: "Ilustrador",
    badge: "Ilustrador",
    social: "@ikarow.art",
    bio: "Artista visual especializado em ilustrações digitais com temática amazônica e fantasia.",
    fullBio: `Ikarow é um dos principais ilustradores digitais da cena criativa do Norte do Brasil. Natural de Belém, começou a desenhar aos 12 anos inspirado por mangás e pela rica biodiversidade da Amazônia.

Seu estilo único combina a estética anime com elementos da fauna, flora e mitologia amazônica, criando um universo visual que já conquistou seguidores em todo o Brasil e no exterior.

Seus trabalhos já foram destaque no Artist Alley da CCXP, na Anime Friends e em diversas convenções regionais. Em 2024, foi convidado para criar a arte oficial do festival Amazônia Pop, consolidando sua posição como referência na arte digital paraense.

Além de ilustrador, Ikarow ministra workshops de arte digital e compartilha tutoriais em suas redes sociais, ajudando a inspirar uma nova geração de artistas na região Norte.

Suas principais influências incluem Hayao Miyazaki, Akira Toriyama e a própria paisagem amazônica que o cerca. "A floresta é meu maior ateliê", costuma dizer.`,
    portfolio: [ikarowPortfolio1, ikarowPortfolio2, ikarowPortfolio3],
  },
  "aurora-mitsukai": {
    img: artistCosplayer,
    name: "Aurora Mitsukai",
    role: "Cosplayer Profissional",
    badge: "Cosplayer",
    social: "@aurora.mitsukai",
    bio: "Uma das cosplayers mais reconhecidas da região Norte.",
    fullBio: "Aurora Mitsukai é especialista em armaduras de EVA e próteses artísticas. Já representou o Pará em competições nacionais de cosplay e ministra workshops de confecção. Sua dedicação aos detalhes e à fidelidade dos personagens a tornou referência na comunidade cosplay da Amazônia.",
    portfolio: [],
  },
  "alexandre-nascimento": {
    img: artistQuadrinista,
    name: "Alexandre Nascimento",
    role: "Quadrinista",
    badge: "Quadrinista",
    social: "@alexnascimento.hq",
    bio: "Criador do mangá autoral 'Guardiões da Floresta'.",
    fullBio: "Alexandre é um dos principais nomes dos quadrinhos independentes do Norte. Sua obra mistura mitologia amazônica com narrativas de mangá shonen, conquistando leitores em todo o Brasil.",
    portfolio: [],
  },
  "hana-lee": {
    img: artistDancarina,
    name: "Hana Lee",
    role: "Dançarina K-Pop",
    badge: "Dançarina Kpop",
    social: "@hana.lee.dance",
    bio: "Líder do grupo de cover dance 'Sakura Dance Crew'.",
    fullBio: "Hana organiza encontros e apresentações de K-Pop em Belém. O grupo já acumula mais de 500 mil visualizações em vídeos de cover dance nas redes sociais.",
    portfolio: [],
  },
  "rafael-tupa": {
    img: artistDigital,
    name: "Rafael Tupã",
    role: "Artista Digital",
    badge: "Arte Digital",
    social: "@rafatupa.art",
    bio: "Especialista em arte digital e concept art para jogos independentes.",
    fullBio: "Rafael trabalha com estúdios de games do Brasil e do exterior, criando personagens e cenários inspirados na Amazônia. Sua arte já foi utilizada em diversos jogos indie premiados.",
    portfolio: [],
  },
  "pedro-otaku": {
    img: artistCollector,
    name: "Pedro Otaku",
    role: "Colecionador & Reviewer",
    badge: "Colecionador",
    social: "@pedro.otaku",
    bio: "Maior colecionador de figures e mangás do Pará.",
    fullBio: "Pedro mantém um canal no YouTube onde faz reviews de action figures, unboxings e visitas a lojas geek de todo o Brasil. Sua coleção conta com mais de 2.000 itens.",
    portfolio: [],
  },
  "gabi-neon": {
    img: artistStreamer,
    name: "Gabi Neon",
    role: "Streamer & Gamer",
    badge: "Streamer",
    social: "@gabineon.live",
    bio: "Streamer de Ananindeua com comunidade crescente na Twitch.",
    fullBio: "Especializada em jogos de RPG e FPS, Gabi também organiza campeonatos online para a comunidade gamer da região Norte. Seu canal já ultrapassa 80 mil seguidores.",
    portfolio: [],
  },
};

const getSlug = (name: string) =>
  name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const ArtistaDetalhe = () => {
  const { slug } = useParams();
  const staticArtist = slug ? artistsData[slug] : undefined;

  const [dbArtist, setDbArtist] = useState<Tables<"artists"> | null>(null);
  const [loading, setLoading] = useState(!staticArtist);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  useEffect(() => {
    if (staticArtist || !slug) return;
    // Try to find by slug generated from name
    (supabase as any)
      .from("artists_public")
      .select("id, name, segment, bio, city, instagram, profile_image_url, portfolio_images, youtube_url, membership_type, fan_count, followers_count, posts_count, approved, created_at, user_id")
      .eq("approved", true)
      .then(({ data }) => {
        const match = (data as any[])?.find((a: any) => getSlug(a.name) === slug);
        setDbArtist((match as any) || null);
        setLoading(false);
      });
  }, [slug, staticArtist]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex justify-center items-center py-40">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  // Render static artist
  if (staticArtist) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 pb-16 px-6 max-w-5xl mx-auto">
          <Link to="/artistas" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mb-8">
            <ArrowLeft className="h-4 w-4" /> Voltar aos artistas
          </Link>
          <div className="flex flex-col md:flex-row gap-8 mb-12 animate-fade-up">
            <div className="w-48 h-48 md:w-56 md:h-56 rounded-2xl overflow-hidden shrink-0">
              <img src={staticArtist.img} alt={staticArtist.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1">
              <span className="text-xs font-semibold px-3 py-1 rounded-md bg-primary/10 text-primary mb-3 inline-block">{staticArtist.badge}</span>
              <h1 className="text-3xl md:text-4xl font-bold mb-1">{staticArtist.name}</h1>
              <p className="text-primary font-medium mb-3">{staticArtist.role}</p>
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
                <Instagram className="h-4 w-4" /> {staticArtist.social}
              </p>
              <p className="text-muted-foreground leading-relaxed">{staticArtist.bio}</p>
              <ShareButtons label="Compartilhar link do perfil" hint="Compartilhe seu perfil e ganhe mais fans!" />
            </div>
          </div>
          <section className="mb-12 animate-fade-up">
            <h2 className="text-xl font-bold mb-4">Sobre</h2>
            <div className="prose prose-invert max-w-none text-foreground/85 leading-relaxed whitespace-pre-wrap">{staticArtist.fullBio}</div>
          </section>
          {staticArtist.portfolio.length > 0 && (
            <section className="animate-fade-up">
              <h2 className="text-xl font-bold mb-6">Portfolio</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {staticArtist.portfolio.map((img, i) => (
                  <div key={i} className="aspect-square rounded-xl overflow-hidden group">
                    <img src={img} alt={`${staticArtist.name} portfolio ${i + 1}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
        <Footer />
      </div>
    );
  }

  // Render DB artist
  if (!dbArtist) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 pb-16 px-6 max-w-3xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">Artista não encontrado</h1>
          <Link to="/artistas" className="text-primary hover:underline">← Voltar aos artistas</Link>
        </div>
        <Footer />
      </div>
    );
  }

  const portfolio = dbArtist.portfolio_images?.filter(Boolean) || [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 px-4 sm:px-6 max-w-3xl mx-auto">
        <Link to="/artistas" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mb-6">
          <ArrowLeft className="h-4 w-4" /> Voltar aos artistas
        </Link>

        <ProfileHeaderCard
          userId={(dbArtist as any).user_id}
          displayName={dbArtist.name}
          fallbackUsername={null}
          avatarUrl={dbArtist.profile_image_url}
          followersCount={(dbArtist as any).followers_count || 0}
          postsCount={(dbArtist as any).posts_count || 0}
          artistId={dbArtist.id}
          fanCount={(dbArtist as any).fan_count || 0}
          followTarget={{ type: "artist", id: dbArtist.id, count: (dbArtist as any).followers_count || 0 }}
        />

        <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span className="text-xs font-semibold px-3 py-1 rounded-md bg-primary/10 text-primary">
            {segmentLabels[dbArtist.segment] || dbArtist.segment}
          </span>
          {getMembershipBadge((dbArtist as any).membership_type) && (
            <span className="font-semibold text-foreground">{getMembershipBadge((dbArtist as any).membership_type)}</span>
          )}
          {dbArtist.city && (
            <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {dbArtist.city}</span>
          )}
          {dbArtist.instagram && (
            <span className="inline-flex items-center gap-1"><Instagram className="h-3.5 w-3.5" /> {dbArtist.instagram}</span>
          )}
        </div>

        <div className="mt-4">
          <ShareButtons label="Compartilhar link do perfil" hint="Compartilhe seu perfil e ganhe mais fans!" />
        </div>

        {dbArtist.bio && (
          <section className="mb-12 animate-fade-up">
            <h2 className="text-xl font-bold mb-4">Sobre</h2>
            <div className="prose prose-invert max-w-none text-foreground/85 leading-relaxed whitespace-pre-wrap">{dbArtist.bio}</div>
          </section>
        )}

        {(dbArtist as any).youtube_url && (() => {
          const embedUrl = getYouTubeEmbedUrl((dbArtist as any).youtube_url);
          return embedUrl ? (
            <section className="mb-12 animate-fade-up">
              <h2 className="text-xl font-bold mb-6">Vídeo de Apresentação</h2>
              <div className="aspect-video rounded-xl overflow-hidden bg-secondary">
                <iframe
                  src={embedUrl}
                  title={`Vídeo de ${dbArtist.name}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>
            </section>
          ) : null;
        })()}

        {portfolio.length > 0 && (
          <section className="animate-fade-up">
            <h2 className="text-xl font-bold mb-6">Portfolio</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {portfolio.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setLightboxImg(img)}
                  className="aspect-square rounded-xl overflow-hidden group"
                >
                  <img src={img} alt={`${dbArtist.name} portfolio ${i + 1}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                </button>
              ))}
            </div>
          </section>
        )}

        <UserRecentPosts userId={(dbArtist as any).user_id} />
      </div>

      {/* Lightbox */}
      {lightboxImg && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-pointer" onClick={() => setLightboxImg(null)}>
          <img src={lightboxImg} alt="Visualização" className="max-w-full max-h-[90vh] object-contain rounded-lg" onClick={e => e.stopPropagation()} />
        </div>
      )}

      <Footer />
    </div>
  );
};

export default ArtistaDetalhe;
