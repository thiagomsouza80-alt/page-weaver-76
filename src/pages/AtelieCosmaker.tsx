import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { MapPin, Clock, Phone, Instagram, Scissors, Shield, Sparkles, Brush } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import heroImg from "@/assets/biz-atelie-hero.jpg";
import thumbImg from "@/assets/biz-atelie.jpg";

const services = [
  { icon: Shield, name: "Armaduras em EVA", desc: "Peças completas de armadura feitas sob medida em EVA de alta densidade, com acabamento profissional e pintura realista." },
  { icon: Scissors, name: "Cosplay Completo", desc: "Confecção total do traje: tecido, armadura, acessórios e perucas estilizadas. Do concept à peça final." },
  { icon: Sparkles, name: "Próteses & SFX", desc: "Próteses de silicone e látex para efeitos especiais, orelhas de elfo, chifres, cicatrizes e maquiagem artística." },
  { icon: Brush, name: "Workshops", desc: "Aulas presenciais e online de confecção de cosplay, trabalho com EVA, pintura de props e técnicas de weathering." },
];

const AtelieCosmaker = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="relative pt-20">
        <div className="relative h-64 md:h-96 overflow-hidden">
          <img src={heroImg} alt="Ateliê Cosmaker" className="w-full h-full object-cover" />
          <div className="absolute inset-0 hero-overlay" />
          <div className="absolute inset-0 flex items-end p-8 md:p-12">
            <div className="animate-fade-up">
              <span className="bg-[hsl(var(--badge-cosplay))] text-primary-foreground text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-md">Ateliê</span>
              <h1 className="text-3xl md:text-5xl font-bold mt-3 leading-tight" style={{ lineHeight: "1.1" }}>Ateliê Cosmaker</h1>
              <p className="text-foreground/70 mt-2 max-w-lg">Cosplay profissional sob medida — da fantasia à realidade</p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 md:px-12 py-12 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <div className="animate-fade-up">
              <h2 className="text-2xl font-bold mb-4">Sobre o Ateliê</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                O <strong className="text-foreground">Ateliê Cosmaker</strong> é o principal estúdio de cosplay profissional 
                da região Norte. Fundado em 2020 pela cosmaker Mariana "Mari" Santos, o ateliê nasceu da garagem de sua casa 
                e hoje ocupa um espaço de 120m² totalmente equipado no bairro Adrianópolis.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Mari começou fazendo seus próprios cosplays para convenções e, após ganhar diversos prêmios regionais e 
                nacionais, passou a receber encomendas de cosplayers de todo o Brasil. Sua especialidade são armaduras 
                complexas em EVA com acabamento cinematográfico — peças que parecem ter saído diretamente dos jogos e animes.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                O ateliê já produziu mais de 200 cosplays completos, desde personagens de Genshin Impact e Final Fantasy 
                até armaduras de Warhammer 40K e trajes de Star Wars. Além das encomendas, o Cosmaker oferece workshops 
                mensais para quem quer aprender a criar seus próprios cosplays, com turmas para iniciantes e avançados.
              </p>
            </div>

            <div className="animate-fade-up-delay-1">
              <h2 className="text-2xl font-bold mb-6">Serviços</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {services.map((s, i) => (
                  <div key={i} className="bg-card rounded-xl p-5 card-hover group">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                      <s.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-bold text-sm mb-1">{s.name}</h3>
                    <p className="text-muted-foreground text-xs leading-relaxed">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6 animate-fade-up-delay-2">
            <div className="bg-card rounded-xl overflow-hidden">
              <img src={thumbImg} alt="Interior do ateliê" className="w-full aspect-video object-cover" />
              <div className="p-5 space-y-4">
                <h3 className="font-bold text-base">Informações</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <p className="text-sm text-muted-foreground">Rua Belo Horizonte, 54 — Adrianópolis, Manaus/AM</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <p className="text-sm text-muted-foreground">Seg a Sex: 9h – 18h<br />Sáb: 9h – 13h (com agendamento)</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Phone className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <p className="text-sm text-muted-foreground">(92) 99876-5432</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Instagram className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <p className="text-sm text-muted-foreground">@atelie.cosmaker</p>
                  </div>
                </div>
              </div>
            </div>

            <Link to="/contato">
              <Button variant="hero" size="lg" className="w-full">Solicitar Orçamento</Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default AtelieCosmaker;
