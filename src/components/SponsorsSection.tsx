import { Handshake } from "lucide-react";

const SponsorsSection = () => {
  // Placeholder logos — replace with actual sponsor images
  const sponsors = [
    { name: "Apoiador 1", logo: null },
    { name: "Apoiador 2", logo: null },
    { name: "Apoiador 3", logo: null },
    { name: "Apoiador 4", logo: null },
    { name: "Apoiador 5", logo: null },
  ];

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
        {sponsors.map((sponsor, i) => (
          <div
            key={i}
            className="w-28 h-28 md:w-36 md:h-36 rounded-xl bg-card border border-border/50 flex items-center justify-center transition-all hover:border-primary/30 hover:shadow-md"
          >
            {sponsor.logo ? (
              <img src={sponsor.logo} alt={sponsor.name} className="max-w-[80%] max-h-[80%] object-contain" />
            ) : (
              <span className="text-xs text-muted-foreground text-center px-2">{sponsor.name}</span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

export default SponsorsSection;
