import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Phone, Instagram } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import FollowButton from "@/components/social/FollowButton";

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

      {/* Hero */}
      <section className="relative pt-20">
        <div className="relative h-64 md:h-96 overflow-hidden">
          {heroImg ? (
            <img src={heroImg} alt={item.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-muted" />
          )}
          <div className="absolute inset-0 hero-overlay" />
          <div className="absolute inset-0 flex items-end p-8 md:p-12">
            <div className="animate-fade-up">
              <span className={`${badgeColors[item.badge] || "bg-primary"} text-primary-foreground text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-md`}>
                {item.badge}
              </span>
              <h1 className="text-3xl md:text-5xl font-bold mt-3 leading-tight" style={{ lineHeight: "1.1" }}>
                {item.name}
              </h1>
              <p className="text-foreground/70 mt-2 max-w-lg">{item.description}</p>
              <div className="mt-4">
                <FollowButton targetType="entrepreneur" targetId={item.id} initialCount={(item as any).followers_count || 0} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="px-6 md:px-12 py-12 max-w-6xl mx-auto">
        <div className={`grid grid-cols-1 ${hasContactInfo ? "md:grid-cols-3" : ""} gap-8`}>
          <div className={hasContactInfo ? "md:col-span-2" : ""}>
            <div className="animate-fade-up">
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
            </div>

            {/* Portfolio Gallery */}
            {portfolio.length > 0 && (
              <div className="mt-10 animate-fade-up">
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
              </div>
            )}
          </div>

          {/* Sidebar */}
          {hasContactInfo && (
            <div className="space-y-6 animate-fade-up-delay-2">
              <div className="bg-card rounded-xl overflow-hidden">
                {thumbImg && (
                  <img src={thumbImg} alt={item.name} className="w-full aspect-video object-cover" />
                )}
                <div className="p-5 space-y-4">
                  <h3 className="font-bold text-base">Informações</h3>
                  <div className="space-y-3">
                    {item.address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <p className="text-sm text-muted-foreground">{item.address}</p>
                      </div>
                    )}
                    {item.phone && (
                      <div className="flex items-start gap-2">
                        <Phone className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <p className="text-sm text-muted-foreground">{item.phone}</p>
                      </div>
                    )}
                    {item.instagram && (
                      <div className="flex items-start gap-2">
                        <Instagram className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <p className="text-sm text-muted-foreground">{item.instagram}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      </section>

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
