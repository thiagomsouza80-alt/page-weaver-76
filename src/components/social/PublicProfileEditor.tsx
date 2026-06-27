import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, ExternalLink, UserCircle2, Globe, Eye, EyeOff } from "lucide-react";
import { Link } from "react-router-dom";

interface Row {
  user_id: string;
  username: string | null;
  display_name: string | null;
  headline: string | null;
  bio: string | null;
  cover_url: string | null;
  links: Record<string, string>;
  visibility: "public" | "private";
  show_xp: boolean;
  show_achievements: boolean;
  show_email: boolean;
  show_phone: boolean;
  show_birth_date: boolean;
}

const linkFields: { key: string; label: string; placeholder: string }[] = [
  { key: "instagram", label: "Instagram", placeholder: "@seuusuario" },
  { key: "tiktok", label: "TikTok", placeholder: "@seuusuario" },
  { key: "youtube", label: "YouTube", placeholder: "@canal ou URL" },
  { key: "twitter", label: "Twitter/X", placeholder: "@usuario" },
  { key: "twitch", label: "Twitch", placeholder: "usuario" },
  { key: "spotify", label: "Spotify", placeholder: "URL do artista/playlist" },
  { key: "website", label: "Site", placeholder: "https://..." },
];

export default function PublicProfileEditor({ userId }: { userId: string }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [row, setRow] = useState<Row | null>(null);

  const load = async () => {
    setLoading(true);
    let { data } = await supabase
      .from("user_profiles" as any)
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (!data) {
      await supabase.from("user_profiles" as any).insert({ user_id: userId } as any);
      const res = await supabase
        .from("user_profiles" as any)
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      data = res.data;
    }
    setRow(data as any);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [userId]);

  const save = async () => {
    if (!row) return;
    setSaving(true);
    const username = (row.username || "").trim();
    if (username && !/^[a-zA-Z0-9_.]{3,30}$/.test(username)) {
      toast({
        title: "Nome de usuário inválido",
        description: "Use 3 a 30 caracteres: letras, números, ponto ou _.",
        variant: "destructive",
      });
      setSaving(false);
      return;
    }
    const { error } = await supabase
      .from("user_profiles" as any)
      .update({
        username: username || null,
        display_name: row.display_name,
        headline: row.headline,
        bio: row.bio,
        cover_url: row.cover_url,
        links: row.links || {},
        visibility: row.visibility,
        show_xp: row.show_xp,
        show_achievements: row.show_achievements,
        show_email: row.show_email,
        show_phone: row.show_phone,
        show_birth_date: row.show_birth_date,
      } as any)
      .eq("user_id", userId);
    setSaving(false);
    if (error) {
      const msg = error.code === "23505" ? "Esse nome de usuário já está em uso." : error.message;
      toast({ title: "Erro ao salvar", description: msg, variant: "destructive" });
      return;
    }
    toast({ title: "Perfil público atualizado" });
    load();
  };

  if (loading || !row) {
    return (
      <div className="bg-card rounded-xl border border-border/50 p-6">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  const set = <K extends keyof Row>(k: K, v: Row[K]) => setRow({ ...row, [k]: v });
  const setLink = (k: string, v: string) => setRow({ ...row, links: { ...(row.links || {}), [k]: v } });

  return (
    <div className="bg-card rounded-xl border border-border/50 p-6 space-y-5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <UserCircle2 className="h-5 w-5 text-primary" />
            Perfil Público
          </h3>
          <p className="text-xs text-muted-foreground">
            Sua página em <code>/u/{row.username || "usuario"}</code>
          </p>
        </div>
        {row.username && (
          <Link to={`/u/${row.username}`} target="_blank">
            <Button variant="outline" size="sm" className="gap-1">
              <ExternalLink className="h-3.5 w-3.5" /> Ver
            </Button>
          </Link>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Nome de usuário</Label>
          <Input
            value={row.username || ""}
            onChange={e => set("username", e.target.value.replace(/\s/g, ""))}
            placeholder="seu_usuario"
          />
        </div>
        <div>
          <Label className="text-xs">Nome de exibição</Label>
          <Input value={row.display_name || ""} onChange={e => set("display_name", e.target.value)} />
        </div>
      </div>

      <div>
        <Label className="text-xs">Frase de destaque</Label>
        <Input
          value={row.headline || ""}
          onChange={e => set("headline", e.target.value)}
          placeholder="Cosplayer • Belém-PA"
          maxLength={120}
        />
      </div>

      <div>
        <Label className="text-xs">Bio</Label>
        <Textarea
          value={row.bio || ""}
          onChange={e => set("bio", e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Conte um pouco sobre você..."
        />
      </div>

      <div>
        <Label className="text-xs">URL da imagem de capa</Label>
        <Input
          value={row.cover_url || ""}
          onChange={e => set("cover_url", e.target.value)}
          placeholder="https://..."
        />
      </div>

      <div>
        <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
          <Globe className="h-4 w-4" /> Redes sociais
        </h4>
        <div className="grid sm:grid-cols-2 gap-3">
          {linkFields.map(f => (
            <div key={f.key}>
              <Label className="text-xs">{f.label}</Label>
              <Input
                value={(row.links || {})[f.key] || ""}
                onChange={e => setLink(f.key, e.target.value)}
                placeholder={f.placeholder}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-border/40 pt-4 space-y-3">
        <h4 className="text-sm font-semibold flex items-center gap-1">
          {row.visibility === "public" ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          Privacidade
        </h4>
        {[
          {
            key: "visibility" as const,
            label: "Perfil público",
            desc: "Qualquer pessoa pode acessar sua página.",
            checked: row.visibility === "public",
            onChange: (v: boolean) => set("visibility", v ? "public" : "private"),
          },
          { key: "show_xp" as const, label: "Mostrar XP e nível", checked: row.show_xp, onChange: (v: boolean) => set("show_xp", v) },
          { key: "show_achievements" as const, label: "Mostrar conquistas", checked: row.show_achievements, onChange: (v: boolean) => set("show_achievements", v) },
          { key: "show_email" as const, label: "Mostrar e-mail", checked: row.show_email, onChange: (v: boolean) => set("show_email", v) },
          { key: "show_phone" as const, label: "Mostrar telefone", checked: row.show_phone, onChange: (v: boolean) => set("show_phone", v) },
          { key: "show_birth_date" as const, label: "Mostrar data de nascimento", checked: row.show_birth_date, onChange: (v: boolean) => set("show_birth_date", v) },
        ].map(item => (
          <div key={item.key} className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm">{item.label}</p>
              {("desc" in item) && (item as any).desc && (
                <p className="text-xs text-muted-foreground">{(item as any).desc}</p>
              )}
            </div>
            <Switch checked={item.checked} onCheckedChange={item.onChange} />
          </div>
        ))}
      </div>

      <Button onClick={save} disabled={saving} className="w-full gap-2">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Salvar perfil público
      </Button>
    </div>
  );
}
