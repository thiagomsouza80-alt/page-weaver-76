import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Phone, Instagram } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import ProfileHeaderCard from "@/components/social/ProfileHeaderCard";
import UserRecentPosts from "@/components/social/UserRecentPosts";

type Entrepreneur = {
  id: string;
  name: string;
  slug: string;
  badge: string;
  description: string;
  image_url: string | null;
  hero_image_url: string | null;
  full_description: string | null;
  address: string | null;
  phone: string | null;
  instagram: string | null;
  portfolio_images: string[] | null;
};

const badgeColors: Record<string, string> = {
  "Loja Geek": "bg-[hsl(var(--badge-quadrinhos))]",
  Gastronomia: "bg-[hsl(var(--badge-eventos))]",
  "Ateliê": "bg-[hsl(var(--badge-cosplay))]",
};

const EmpreendedorDetalhe = () => {
  const { slug } = useParams<{ slug: string }>();
  const [item, setItem] = useState<Entrepreneur | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    (supabase as any)
      .from("entrepreneurs_public")
      .select("id, name, slug, badge, description, full_description, image_url, hero_image_url, instagram, address, portfolio_images, posts_count, followers_count, published, created_at, user_id")
      .eq("slug", slug)
      .eq("published", true)
      .maybeSingle()
      .then(({ data }) => {
        setItem(data as unknown as Entrepreneur | null);
        setLoading(false);
      });
  }, [slug]);

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

  if (!item) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-40 gap-4">
          <h1 className="text-2xl font-bold">Empreendedor não encontrado</h1>
          <Link to="/">
            <Button variant="hero">Voltar ao início</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const heroImg = item.hero_image_url || item.image_url;
  const thumbImg = item.image_url || item.hero_image_url;
  const hasContactInfo = item.address || item.phone || item.instagram;
  const portfolio = item.portfolio_images?.filter(Boolean) || [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-24 pb-16 px-4 sm:px-6 max-w-3xl mx-auto">
        <ProfileHeaderCard
          userId={(item as any).user_id}
          displayName={item.name}
          avatarUrl={item.image_url}
          coverUrl={item.hero_image_url}
          followersCount={(item as any).followers_count || 0}
          postsCount={(item as any).posts_count || 0}
          followTarget={{ type: "entrepreneur", id: item.id, count: (item as any).followers_count || 0 }}
        />

        <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span className={`${badgeColors[item.badge] || "bg-primary"} text-primary-foreground text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-md`}>
            {item.badge}
          </span>
          {item.address && (
            <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {item.address}</span>
          )}
          {item.phone && (
            <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {item.phone}</span>
          )}
          {item.instagram && (
            <span className="inline-flex items-center gap-1"><Instagram className="h-3.5 w-3.5" /> {item.instagram}</span>
          )}
        </div>

        <section className="mt-8 animate-fade-up">
          <h2 className="text-2xl font-bold mb-4">Sobre</h2>
          {item.full_description ? (
            <div className="space-y-4">
              {item.full_description.split("\n").filter(Boolean).map((p, i) => (
                <p key={i} className="text-muted-foreground leading-relaxed">{p}</p>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground leading-relaxed">{item.description}</p>
          )}
        </section>

        {portfolio.length > 0 && (
          <section className="mt-8 animate-fade-up">
            <h2 className="text-2xl font-bold mb-4">Galeria</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {portfolio.map((url, i) => (
                <button
                  key={i}
                  onClick={() => setLightboxImg(url)}
                  className="aspect-square overflow-hidden rounded-lg border border-border hover:border-primary/50 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <img src={url} alt={`${item.name} - foto ${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </section>
        )}

        <UserRecentPosts userId={(item as any).user_id} />
      </div>

      {/* Lightbox */}
      {lightboxImg && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setLightboxImg(null)}
        >
          <button
            onClick={() => setLightboxImg(null)}
            className="absolute top-4 right-4 text-white/80 hover:text-white"
          >
            <span className="sr-only">Fechar</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={lightboxImg}
            alt="Visualização"
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      <Footer />
    </div>
  );
};

export default EmpreendedorDetalhe;
