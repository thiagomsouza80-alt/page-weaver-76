import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Search, Users, Store, Handshake } from "lucide-react";
import { Input } from "@/components/ui/input";

type Row = {
  id: string;
  name: string;
  type: "Artista" | "Empreendedor" | "Apoiador";
  extra?: string;
};

const typeStyles: Record<Row["type"], string> = {
  Artista: "bg-primary/10 text-primary",
  Empreendedor: "bg-accent/20 text-accent-foreground",
  Apoiador: "bg-secondary text-secondary-foreground",
};

const typeIcons: Record<Row["type"], any> = {
  Artista: Users,
  Empreendedor: Store,
  Apoiador: Handshake,
};

const AdminDatabasePanel = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | Row["type"]>("all");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [a, e, s] = await Promise.all([
        supabase.from("artists").select("id, artistic_name, segment").order("artistic_name"),
        supabase.from("entrepreneurs").select("id, business_name, segment").order("business_name"),
        supabase.from("sponsors").select("id, name").order("name"),
      ]);
      const all: Row[] = [
        ...((a.data || []) as any[]).map((x) => ({ id: x.id, name: x.artistic_name || "—", type: "Artista" as const, extra: x.segment })),
        ...((e.data || []) as any[]).map((x) => ({ id: x.id, name: x.business_name || "—", type: "Empreendedor" as const, extra: x.segment })),
        ...((s.data || []) as any[]).map((x) => ({ id: x.id, name: x.name || "—", type: "Apoiador" as const })),
      ];
      all.sort((x, y) => x.name.localeCompare(y.name, "pt-BR", { sensitivity: "base" }));
      setRows(all);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filter !== "all" && r.type !== filter) return false;
      if (query && !r.name.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [rows, query, filter]);

  const counts = useMemo(() => ({
    all: rows.length,
    Artista: rows.filter((r) => r.type === "Artista").length,
    Empreendedor: rows.filter((r) => r.type === "Empreendedor").length,
    Apoiador: rows.filter((r) => r.type === "Apoiador").length,
  }), [rows]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Banco de Dados</h1>
        <p className="text-muted-foreground">Lista completa de cadastros em ordem alfabética.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", "Artista", "Empreendedor", "Apoiador"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            {f === "all" ? "Todos" : f + "s"} ({counts[f]})
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nome..." className="pl-9" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-secondary/50">
              <tr className="text-left text-sm">
                <th className="px-4 py-3 font-semibold">#</th>
                <th className="px-4 py-3 font-semibold">Nome</th>
                <th className="px-4 py-3 font-semibold">Tipo</th>
                <th className="px-4 py-3 font-semibold">Segmento</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => {
                const Icon = typeIcons[r.type];
                return (
                  <tr key={`${r.type}-${r.id}`} className="border-t border-border hover:bg-secondary/30">
                    <td className="px-4 py-3 text-sm text-muted-foreground">{i + 1}</td>
                    <td className="px-4 py-3 text-sm font-medium">{r.name}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${typeStyles[r.type]}`}>
                        <Icon className="h-3 w-3" />
                        {r.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{r.extra || "—"}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground text-sm">Nenhum registro encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminDatabasePanel;
