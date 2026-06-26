import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Sparkles, Shield, Trophy, Zap } from "lucide-react";

type SubTab = "xp" | "classes" | "ranks" | "achievements";

export default function AdminSocialPopPanel() {
  const [sub, setSub] = useState<SubTab>("xp");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          Social Pop — Gamificação
        </h1>
        <p className="text-sm text-muted-foreground">
          Configure XP, classes, ranks e conquistas. Mudanças entram em vigor em tempo real.
        </p>
      </div>

      <div className="flex gap-2 border-b border-border overflow-x-auto">
        {[
          { id: "xp" as const, label: "Regras de XP", icon: Zap },
          { id: "classes" as const, label: "Classes", icon: Sparkles },
          { id: "ranks" as const, label: "Ranks", icon: Shield },
          { id: "achievements" as const, label: "Conquistas", icon: Trophy },
        ].map((t) => {
          const Icon = t.icon;
          const active = sub === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setSub(t.id)}
              className={`px-4 py-2 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {sub === "xp" && <XpRulesTab />}
      {sub === "classes" && <ClassesTab />}
      {sub === "ranks" && <RanksTab />}
      {sub === "achievements" && <AchievementsTab />}
    </div>
  );
}

function XpRulesTab() {
  const { toast } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState<Record<string, any>>({});

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("xp_rules" as any).select("*").order("action");
    setRows((data as any) || []);
    setDirty({});
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  const save = async (row: any) => {
    const patch = dirty[row.id];
    if (!patch) return;
    const { error } = await supabase.from("xp_rules" as any).update(patch).eq("id", row.id);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Regra atualizada" });
    load();
  };

  if (loading) return <Loader2 className="h-6 w-6 animate-spin text-primary" />;

  return (
    <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40">
            <tr>
              <th className="text-left p-3">Ação</th>
              <th className="text-left p-3">XP</th>
              <th className="text-left p-3">Cap/dia</th>
              <th className="text-left p-3">Cooldown (s)</th>
              <th className="text-left p-3">1x por alvo</th>
              <th className="text-left p-3">Ativo</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border/50">
                <td className="p-3">
                  <p className="font-semibold">{r.label}</p>
                  <p className="text-xs text-muted-foreground">{r.action}</p>
                </td>
                <td className="p-3">
                  <Input
                    type="number"
                    defaultValue={r.xp}
                    onChange={(e) =>
                      setDirty((d) => ({ ...d, [r.id]: { ...d[r.id], xp: parseInt(e.target.value) || 0 } }))
                    }
                    className="w-20"
                  />
                </td>
                <td className="p-3">
                  <Input
                    type="number"
                    defaultValue={r.daily_cap ?? ""}
                    placeholder="∞"
                    onChange={(e) =>
                      setDirty((d) => ({
                        ...d,
                        [r.id]: {
                          ...d[r.id],
                          daily_cap: e.target.value === "" ? null : parseInt(e.target.value) || 0,
                        },
                      }))
                    }
                    className="w-20"
                  />
                </td>
                <td className="p-3">
                  <Input
                    type="number"
                    defaultValue={r.cooldown_seconds}
                    onChange={(e) =>
                      setDirty((d) => ({
                        ...d,
                        [r.id]: { ...d[r.id], cooldown_seconds: parseInt(e.target.value) || 0 },
                      }))
                    }
                    className="w-20"
                  />
                </td>
                <td className="p-3">
                  <input
                    type="checkbox"
                    defaultChecked={r.per_target_once}
                    onChange={(e) =>
                      setDirty((d) => ({ ...d, [r.id]: { ...d[r.id], per_target_once: e.target.checked } }))
                    }
                  />
                </td>
                <td className="p-3">
                  <input
                    type="checkbox"
                    defaultChecked={r.is_active}
                    onChange={(e) =>
                      setDirty((d) => ({ ...d, [r.id]: { ...d[r.id], is_active: e.target.checked } }))
                    }
                  />
                </td>
                <td className="p-3">
                  {dirty[r.id] && (
                    <Button size="sm" onClick={() => save(r)} className="gap-1">
                      <Save className="h-3.5 w-3.5" />
                      Salvar
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SimpleCrud({
  table,
  columns,
  emptyRow,
}: {
  table: string;
  columns: { key: string; label: string; type?: "text" | "number" | "color" | "checkbox" }[];
  emptyRow: Record<string, any>;
}) {
  const { toast } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Record<string, any>>(emptyRow);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from(table as any).select("*").order("sort_order", { ascending: true });
    setRows((data as any) || []);
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  const update = async (id: string, patch: any) => {
    const { error } = await supabase.from(table as any).update(patch).eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    load();
  };
  const remove = async (id: string) => {
    if (!confirm("Excluir?")) return;
    await supabase.from(table as any).delete().eq("id", id);
    load();
  };
  const create = async () => {
    const { error } = await supabase.from(table as any).insert(draft);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    setDraft(emptyRow);
    load();
  };

  if (loading) return <Loader2 className="h-6 w-6 animate-spin text-primary" />;

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl border border-border/50 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className="text-left p-3">
                  {c.label}
                </th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border/50">
                {columns.map((c) => (
                  <td key={c.key} className="p-2">
                    {c.type === "checkbox" ? (
                      <input
                        type="checkbox"
                        defaultChecked={r[c.key]}
                        onChange={(e) => update(r.id, { [c.key]: e.target.checked })}
                      />
                    ) : (
                      <Input
                        type={c.type === "number" ? "number" : c.type === "color" ? "color" : "text"}
                        defaultValue={r[c.key] ?? ""}
                        onBlur={(e) => {
                          const v =
                            c.type === "number"
                              ? parseInt(e.target.value) || 0
                              : e.target.value || null;
                          if (v !== r[c.key]) update(r.id, { [c.key]: v });
                        }}
                        className="min-w-[120px]"
                      />
                    )}
                  </td>
                ))}
                <td className="p-2">
                  <Button size="sm" variant="ghost" onClick={() => remove(r.id)}>
                    Excluir
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-card rounded-xl border border-border/50 p-4">
        <h4 className="font-semibold mb-3 text-sm">Adicionar novo</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {columns.map((c) => (
            <div key={c.key}>
              <label className="text-xs text-muted-foreground">{c.label}</label>
              {c.type === "checkbox" ? (
                <input
                  type="checkbox"
                  checked={!!draft[c.key]}
                  onChange={(e) => setDraft({ ...draft, [c.key]: e.target.checked })}
                />
              ) : (
                <Input
                  type={c.type === "number" ? "number" : c.type === "color" ? "color" : "text"}
                  value={draft[c.key] ?? ""}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      [c.key]: c.type === "number" ? parseInt(e.target.value) || 0 : e.target.value,
                    })
                  }
                />
              )}
            </div>
          ))}
        </div>
        <Button className="mt-4" onClick={create}>
          Criar
        </Button>
      </div>
    </div>
  );
}

function ClassesTab() {
  return (
    <SimpleCrud
      table="classes"
      columns={[
        { key: "code", label: "Código" },
        { key: "name", label: "Nome" },
        { key: "icon", label: "Ícone" },
        { key: "color", label: "Cor", type: "color" },
        { key: "sort_order", label: "Ordem", type: "number" },
        { key: "is_active", label: "Ativo", type: "checkbox" },
      ]}
      emptyRow={{ code: "", name: "", color: "#7c3aed", sort_order: 99, is_active: true }}
    />
  );
}

function RanksTab() {
  return (
    <SimpleCrud
      table="ranks"
      columns={[
        { key: "code", label: "Código" },
        { key: "name", label: "Nome" },
        { key: "min_xp", label: "XP Mínimo", type: "number" },
        { key: "color", label: "Cor", type: "color" },
        { key: "sort_order", label: "Ordem", type: "number" },
        { key: "is_active", label: "Ativo", type: "checkbox" },
      ]}
      emptyRow={{ code: "", name: "", min_xp: 0, color: "#94a3b8", sort_order: 99, is_active: true }}
    />
  );
}

function AchievementsTab() {
  return (
    <SimpleCrud
      table="achievements"
      columns={[
        { key: "code", label: "Código" },
        { key: "name", label: "Nome" },
        { key: "description", label: "Descrição" },
        { key: "rarity", label: "Raridade" },
        { key: "xp_bonus", label: "XP Bônus", type: "number" },
        { key: "is_active", label: "Ativo", type: "checkbox" },
      ]}
      emptyRow={{ code: "", name: "", rarity: "common", xp_bonus: 0, is_active: true }}
    />
  );
}
