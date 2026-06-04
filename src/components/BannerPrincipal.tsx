import { useEffect, useState, useRef } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Banner {
  id: string;
  title: string | null;
  subtitle: string | null;
  image_url: string | null;
  video_url: string | null;
  link_url: string | null;
  button_text: string | null;
}

const BannerPrincipal = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loaded, setLoaded] = useState(false);
  const autoplay = useRef(Autoplay({ delay: 6000, stopOnInteraction: false, stopOnMouseEnter: true }));
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "start" }, [autoplay.current]);
  const [selected, setSelected] = useState(0);
  const viewed = useRef<Set<string>>(new Set());

  useEffect(() => {
    supabase
      .from("homepage_banners")
      .select("id,title,subtitle,image_url,video_url,link_url,button_text")
      .order("display_order", { ascending: true })
      .then(({ data }) => {
        setBanners((data as Banner[]) || []);
        setLoaded(true);
      });
  }, []);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelected(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    onSelect();
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  // Track views once per banner per session
  useEffect(() => {
    const b = banners[selected];
    if (!b || viewed.current.has(b.id)) return;
    viewed.current.add(b.id);
    supabase.rpc("banner_increment_view" as any, { _id: b.id });
  }, [selected, banners]);

  const handleClick = (b: Banner, e?: React.MouseEvent) => {
    if (!b.link_url) {
      e?.preventDefault();
      return;
    }
    supabase.rpc("banner_increment_click" as any, { _id: b.id });
  };

  if (!loaded || banners.length === 0) {
    return <div className="pt-16" />;
  }

  return (
    <section className="relative pt-16 bg-background">
      <div className="relative overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {banners.map((b) => {
            const content = (
              <div className="relative w-full aspect-[16/7] md:aspect-[21/8] bg-secondary overflow-hidden">
                {b.video_url ? (
                  <video
                    src={b.video_url}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : b.image_url ? (
                  <img
                    src={b.image_url}
                    alt={b.title || ""}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : null}
                {(b.title || b.subtitle) && (
                  <div className="absolute inset-0 bg-gradient-to-r from-background/85 via-background/50 to-transparent" />
                )}
                {(b.title || b.subtitle) && (
                  <div className="absolute inset-0 flex items-center">
                    <div className="px-6 md:px-16 max-w-2xl space-y-4 animate-fade-in">
                      {b.title && (
                        <h2 className="text-3xl md:text-5xl font-bold text-foreground drop-shadow-lg">
                          {b.title}
                        </h2>
                      )}
                      {b.subtitle && (
                        <p className="text-base md:text-lg text-foreground/85 drop-shadow">
                          {b.subtitle}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
            return (
              <div key={b.id} className="min-w-0 flex-[0_0_100%]">
                {b.link_url ? (
                  <a
                    href={b.link_url}
                    target={b.link_url.startsWith("http") ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    onClick={(e) => handleClick(b, e)}
                    className="block"
                  >
                    {content}
                  </a>
                ) : (
                  <div onClick={() => handleClick(b)}>{content}</div>
                )}
              </div>
            );
          })}
        </div>

        {banners.length > 1 && (
          <>
            <button
              aria-label="Anterior"
              onClick={() => emblaApi?.scrollPrev()}
              className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-background/60 backdrop-blur border border-border items-center justify-center text-foreground hover:bg-background/80 transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              aria-label="Próximo"
              onClick={() => emblaApi?.scrollNext()}
              className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-background/60 backdrop-blur border border-border items-center justify-center text-foreground hover:bg-background/80 transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-10">
              {banners.map((_, i) => (
                <button
                  key={i}
                  aria-label={`Ir para banner ${i + 1}`}
                  onClick={() => emblaApi?.scrollTo(i)}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === selected ? "w-8 bg-primary" : "w-2 bg-foreground/40 hover:bg-foreground/60"
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default BannerPrincipal;
