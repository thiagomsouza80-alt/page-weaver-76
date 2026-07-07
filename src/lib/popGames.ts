import { supabase } from "@/integrations/supabase/client";

export function slugify(input: string): string {
  return (input || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 60);
}

export async function uploadGameAsset(userId: string, file: File, kind = "img"): Promise<string> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${userId}/${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("game-assets").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("game-assets").getPublicUrl(path);
  return data.publicUrl;
}

export const GAME_CATEGORIES = [
  { value: "tcg", label: "Cartas colecionáveis (TCG/CCG)" },
  { value: "rpg", label: "RPG" },
  { value: "puzzle", label: "Puzzle / Casual" },
  { value: "strategy", label: "Estratégia" },
  { value: "arcade", label: "Arcade" },
  { value: "board", label: "Tabuleiro" },
  { value: "other", label: "Outro" },
];
