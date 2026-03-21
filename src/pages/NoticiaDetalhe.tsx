import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Loader2, ArrowLeft, CalendarDays } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type News = Tables<"news">;

const NoticiaDetalhe = () => {
  const { slug } = useParams();
  const [item, setItem] = useState<News | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("news").select("*").eq("slug", slug).single();
      setItem(data);
      setLoading(false);
    };
    fetch();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 pb-16 px-6 max-w-3xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">Notícia não encontrada</h1>
          <Link to="/noticias" className="text-primary hover:underline">← Voltar às notícias</Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <article className="pt-24 pb-16 px-6 max-w-3xl mx-auto">
        <Link to="/noticias" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mb-6">
          <ArrowLeft className="h-4 w-4" /> Voltar às notícias
        </Link>

        {item.image_url && (
          <div className="aspect-video rounded-xl overflow-hidden mb-8">
            <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
          </div>
        )}

        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs font-semibold px-3 py-1 rounded-md bg-primary/10 text-primary">{item.category}</span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            {new Date(item.created_at).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}
          </span>
        </div>

        <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">{item.title}</h1>
        <p className="text-lg text-muted-foreground mb-8">{item.summary}</p>

        <div className="prose prose-invert max-w-none text-foreground/85 leading-relaxed whitespace-pre-wrap">
          {item.content}
        </div>
      </article>
      <Footer />
    </div>
  );
};

export default NoticiaDetalhe;
