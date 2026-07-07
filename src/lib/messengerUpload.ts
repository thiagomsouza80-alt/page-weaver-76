import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/imageCompression";

export type AttachmentKind = "image" | "video" | "audio" | "file";

export const detectKind = (file: File): AttachmentKind => {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "file";
};

/** Envia um arquivo para o bucket social-media em `${userId}/messenger/...` e devolve URL pública. */
export const uploadMessengerAttachment = async (
  userId: string,
  file: File
): Promise<{ url: string; type: AttachmentKind; meta: Record<string, any> }> => {
  const kind = detectKind(file);
  let toUpload: Blob = file;
  if (kind === "image") {
    try { toUpload = await compressImage(file, { maxSize: 1600, quality: 0.85 }); } catch { toUpload = file; }
  }
  const ext = (file.name.split(".").pop() || "bin").toLowerCase();
  const path = `${userId}/messenger/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("social-media").upload(path, toUpload, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (error) throw error;
  const url = supabase.storage.from("social-media").getPublicUrl(path).data.publicUrl;
  return { url, type: kind, meta: { name: file.name, size: file.size, mime: file.type } };
};
