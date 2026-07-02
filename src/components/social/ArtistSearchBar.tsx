import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Loader2 } from "lucide-react";

type Artist = { id: string; name: string; profile_image_url: string | null; segment: string | null };

const toSlug = (name: string) =>
  name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default function ArtistSearchBar() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current);
    if (q.trim().length < 2) { setResults([]); return; }
    timer.current = window.setTimeout(async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from("artists_public")
        .select("id, name, profile_image_url, segment")
        .eq("approved", true)
        .ilike("name", `%${q.trim()}%`)
        .limit(8);
      setResults(((data as any) || []) as Artist[]);
      setLoading(false);
    }, 300);
  }, [q]);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Buscar artistas..."
          className="pl-9"
        />
        {loading && <Loader2 className="h-4 w-4 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />}
      </div>
      {open && q.trim().length >= 2 && (
        <div className="absolute z-40 mt-1 left-0 right-0 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
          {results.length === 0 && !loading ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum artista encontrado.</p>
          ) : (
            results.map((a) => (
              <Link key={a.id} to={`/artistas/${a.slug}`} className="flex items-center gap-3 px-3 py-2 hover:bg-secondary/60 transition">
                <Avatar className="h-8 w-8">
                  {a.profile_image_url && <AvatarImage src={a.profile_image_url} />}
                  <AvatarFallback>{a.name?.[0] || "?"}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{a.name}</div>
                  {a.segment && <div className="text-[10px] text-muted-foreground truncate">{a.segment}</div>}
                </div>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
