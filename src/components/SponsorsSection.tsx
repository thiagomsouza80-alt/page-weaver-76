import { Handshake } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Sponsor {
  id: string;
  name: string;
  logo_url: string;
  website_url: string | null;
  display_order: number;
}

const SponsorsSection = () => {
  const { data: sponsors = [] } = useQuery<Sponsor[]>({
    queryKey: ["sponsors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sponsors")
        .select("id, name, logo_url, website_url, display_order")
        .eq("active", true)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const hasSponsors = sponsors.length > 0;

  return (
    <section className="px-6 md:px-12 py-12 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Handshake className="h-6 w-6 text-primary" />
        <h2 className="text-2xl md:text-3xl font-bold">Apoiadores</h2>
      </div>
      <p className="text-muted-foreground mb-8 max-w-2xl">
        Empresas e parceiros que apoiam a cultura pop na Amazônia.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
        {hasSponsors ? (
          sponsors.map((sponsor) => {
            const content = (
              <div className="w-28 h-28 md:w-36 md:h-36 rounded-xl bg-card border border-border/50 flex items-center justify-center p-4 transition-all hover:border-primary/30 hover:shadow-md">
                <img
                  src={sponsor.logo_url}
                  alt={sponsor.name}
                  className="max-w-full max-h-full object-contain"
                  loading="lazy"
                />
              </div>
            );

            return sponsor.website_url ? (
              <a
                key={sponsor.id}
                href={sponsor.website_url}
                target="_blank"
                rel="noopener noreferrer"
                title={sponsor.name}
              >
                {content}
              </a>
            ) : (
              <div key={sponsor.id} title={sponsor.name}>
                {content}
              </div>
            );
          })
        ) : (
          Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="w-28 h-28 md:w-36 md:h-36 rounded-xl bg-card border border-border/50 flex items-center justify-center transition-all hover:border-primary/30 hover:shadow-md"
            >
              <span className="text-xs text-muted-foreground text-center px-2">Apoiador {i + 1}</span>
            </div>
          ))
        )}
      </div>
    </section>
  );
};

export default SponsorsSection;
