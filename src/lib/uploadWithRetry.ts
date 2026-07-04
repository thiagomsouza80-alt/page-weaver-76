import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/imageCompression";

/**
 * Upload a file to Supabase Storage with automatic retry on failure.
 * Compresses the image before uploading. Provides user-friendly error messages.
 */
export async function uploadWithRetry(
  file: File,
  bucket: string,
  folder: string,
  maxRetries = 3
): Promise<string> {
  const originalName = file.name;
  const originalSizeMB = (file.size / (1024 * 1024)).toFixed(1);

  const compressed = await compressImage(file);
  const compressedSizeMB = (compressed.size / (1024 * 1024)).toFixed(1);
  const ext = compressed.name.split(".").pop();
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;

  // No hard size limit — compression already reduces most images; storage handles the rest.
  void originalName; void originalSizeMB; void compressedSizeMB;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const { error } = await supabase.storage.from(bucket).upload(path, compressed);

    if (!error) {
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      return data.publicUrl;
    }

    lastError = error;
    console.warn(`Upload "${originalName}" attempt ${attempt}/${maxRetries} failed:`, error.message);

    if (attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
    }
  }

  throw new Error(
    `Falha ao enviar a imagem "${originalName}" (${compressedSizeMB}MB) após ${maxRetries} tentativas. Tente escolher uma imagem menor ou verifique sua conexão com a internet.`
  );
}
