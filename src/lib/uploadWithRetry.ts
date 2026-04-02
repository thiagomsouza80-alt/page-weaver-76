import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/imageCompression";

/**
 * Upload a file to Supabase Storage with automatic retry on failure.
 * Compresses the image before uploading.
 */
export async function uploadWithRetry(
  file: File,
  bucket: string,
  folder: string,
  maxRetries = 3
): Promise<string> {
  const compressed = await compressImage(file);
  const ext = compressed.name.split(".").pop();
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const { error } = await supabase.storage.from(bucket).upload(path, compressed);

    if (!error) {
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      return data.publicUrl;
    }

    lastError = error;
    console.warn(`Upload attempt ${attempt}/${maxRetries} failed:`, error.message);

    if (attempt < maxRetries) {
      // Wait before retrying: 1s, 2s, 4s (exponential backoff)
      await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
    }
  }

  throw new Error(
    `Falha no envio da imagem após ${maxRetries} tentativas. Verifique sua conexão com a internet e tente novamente.`
  );
}
