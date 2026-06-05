import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Search, Users, Store, Handshake, Download, ChevronDown, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type RowType = "Artista" | "Empreendedor" | "Apoiador";

type Row = {
  id: string;
  name: string;
  email: string;
  phone: string;
  category: string;
  type: RowType;
};

const typeStyles: Record<RowType, string> = {
  Artista: "bg-primary/10 text-primary",
  Empreendedor: "bg-accent/20 text-accent-foreground",
  Apoiador: "bg-secondary text-secondary-foreground",
};

const typeIcons: Record<RowType, any> = {
  Artista: Users,
  Empreendedor: Store,
  Apoiador: Handshake,
};

const waLink = (phone: string) => {
  const digits = (phone || "").replace(/\D/g, "");
  if (!digits) return null;
  const full = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${full}`;
};

const AdminDatabasePanel = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | RowType>("all");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [a, e, s] = await Promise.all([
        supabase.from("artists").select("id, name, email, phone, segment").order("name"),
        supabase.from("entrepreneurs").select("id, name, email, phone, badge").order("name"),
        supabase.from("sponsors").select("id, name").order("name"),
      ]);
      const all: Row[] = [
        ...((a.data || []) as any[]).map((x) => ({ id: x.id, name: x.name || "—", email: x.email || "", phone: x.phone || "", category: x.segment || "Sem categoria", type: "Artista" as const })),
        ...((e.data || []) as any[]).map((x) => ({ id: x.id, name: x.name || "—", email: x.email || "", phone: x.phone || "", category: x.badge || "Sem categoria", type: "Empreendedor" as const })),
        ...((s.data || []) as any[]).map((x) => ({ id: x.id, name: x.name || "—", email: "", phone: "", category: "Apoiador", type: "Apoiador" as const })),
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
      if (query) {
        const q = query.toLowerCase();
        if (
          !r.name.toLowerCase().includes(q) &&
          !r.email.toLowerCase().includes(q) &&
          !r.phone.includes(q) &&
          !r.category.toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [rows, query, filter]);

  const grouped = useMemo(() => {
    const map = new Map<string, { type: RowType; category: string; items: Row[] }>();
    for (const r of filtered) {
      const key = `${r.type}::${r.category}`;
      if (!map.has(key)) map.set(key, { type: r.type, category: r.category, items: [] });
      map.get(key)!.items.push(r);
    }
    return Array.from(map.values()).sort((a, b) => {
      const order = { Artista: 0, Empreendedor: 1, Apoiador: 2 } as const;
      if (order[a.type] !== order[b.type]) return order[a.type] - order[b.type];
      return a.category.localeCompare(b.category, "pt-BR", { sensitivity: "base" });
    });
  }, [filtered]);

  const counts = useMemo(() => ({
    all: rows.length,
    Artista: rows.filter((r) => r.type === "Artista").length,
    Empreendedor: rows.filter((r) => r.type === "Empreendedor").length,
    Apoiador: rows.filter((r) => r.type === "Apoiador").length,
  }), [rows]);

  const exportCsv = () => {
    const header = ["Nome", "Tipo", "Categoria", "E-mail", "WhatsApp"];
    const lines = [header.join(",")].concat(
      filtered.map((r) => [r.name, r.type, r.category, r.email, r.phone].map((v) => `"${(v || "").replace(/"/g, '""')}"`).join(","))
    );
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `banco-de-dados-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggle = (key: string) => setCollapsed((c) => ({ ...c, [key]: !c[key] }));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold mb-2">Banco de Dados</h1>
          <p className="text-muted-foreground">Cadastros agrupados pela categoria escolhida no cadastro.</p>
        </div>
        <Button onClick={exportCsv} variant="outline" className="gap-2">
          <Download className="h-4 w-4" /> Exportar CSV
        </Button>
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
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nome, categoria, e-mail ou telefone..." className="pl-9" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : grouped.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Nenhum registro encontrado.</div>
      ) : (
        <div className="space-y-4">
          {grouped.map((g) => {
            const key = `${g.type}::${g.category}`;
            const isCollapsed = collapsed[key];
            const Icon = typeIcons[g.type];
            return (
              <div key={key} className="bg-card border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => toggle(key)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-secondary/50 hover:bg-secondary/70 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${typeStyles[g.type]}`}>
                      <Icon className="h-3 w-3" />
                      {g.type}
                    </span>
                    <span className="font-semibold">{g.category}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{g.items.length} {g.items.length === 1 ? "cadastro" : "cadastros"}</span>
                </button>
                {!isCollapsed && (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-background">
                        <tr className="text-left text-sm">
                          <th className="px-4 py-2 font-semibold w-12">#</th>
                          <th className="px-4 py-2 font-semibold">Nome</th>
                          <th className="px-4 py-2 font-semibold">E-mail</th>
                          <th className="px-4 py-2 font-semibold">WhatsApp</th>
                        </tr>
                      </thead>
                      <tbody>
                        {g.items.map((r, i) => {
                          const wa = waLink(r.phone);
                          return (
                            <tr key={`${r.type}-${r.id}`} className="border-t border-border hover:bg-secondary/30">
                              <td className="px-4 py-2 text-sm text-muted-foreground">{i + 1}</td>
                              <td className="px-4 py-2 text-sm font-medium">{r.name}</td>
                              <td className="px-4 py-2 text-sm text-muted-foreground">
                                {r.email ? <a href={`mailto:${r.email}`} className="hover:text-primary hover:underline">{r.email}</a> : "—"}
                              </td>
                              <td className="px-4 py-2 text-sm text-muted-foreground">
                                {wa ? <a href={wa} target="_blank" rel="noopener noreferrer" className="hover:text-primary hover:underline">{r.phone}</a> : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminDatabasePanel;
