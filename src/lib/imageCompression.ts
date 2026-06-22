/**
 * Compress an image file using Canvas API.
 * Returns a new File with reduced size (max 1200px wide, JPEG 0.8 quality).
 */
export async function compressImage(
  file: File,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.8
): Promise<File> {
  // Skip non-image files or SVGs
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
    return file;
  }

  // If already small enough (<300KB), skip compression
  if (file.size < 300 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    try {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        try {
          URL.revokeObjectURL(url);

          let { width, height } = img;

          // Scale down if needed
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            console.warn("Canvas context unavailable, using original file");
            resolve(file);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (!blob || blob.size >= file.size) {
                resolve(file);
                return;
              }

              const compressedFile = new File(
                [blob],
                file.name.replace(/\.\w+$/, ".jpg"),
                { type: "image/jpeg", lastModified: Date.now() }
              );

              console.log(
                `Image compressed: ${(file.size / 1024).toFixed(0)}KB → ${(compressedFile.size / 1024).toFixed(0)}KB`
              );

              resolve(compressedFile);
            },
            "image/jpeg",
            quality
          );
        } catch (canvasError) {
          console.warn("Compression failed, using original file:", canvasError);
          resolve(file);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        console.warn("Could not load image for compression, using original file");
        resolve(file); // Fallback to original instead of rejecting
      };

      img.src = url;
    } catch (err) {
      console.warn("Image compression setup failed, using original file:", err);
      resolve(file);
    }
  });
}

/**
 * Compress multiple image files in parallel.
 */
export async function compressImages(
  files: File[],
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.8
): Promise<File[]> {
  return Promise.all(files.map((f) => compressImage(f, maxWidth, maxHeight, quality)));
}

/**
 * Crop an image to a fixed aspect ratio (default 3:4), centered, and resize to target.
 * Used for News and Events covers — standardized at 1080x1440.
 */
export async function cropToAspect(
  file: File,
  targetWidth = 1080,
  targetHeight = 1440,
  quality = 0.85
): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") return file;

  return new Promise((resolve) => {
    try {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        try {
          URL.revokeObjectURL(url);
          const targetRatio = targetWidth / targetHeight;
          const srcRatio = img.width / img.height;
          let sx = 0, sy = 0, sw = img.width, sh = img.height;
          if (srcRatio > targetRatio) {
            // Source wider → crop sides
            sw = Math.round(img.height * targetRatio);
            sx = Math.round((img.width - sw) / 2);
          } else if (srcRatio < targetRatio) {
            // Source taller → crop top/bottom (centered, smart-ish)
            sh = Math.round(img.width / targetRatio);
            sy = Math.round((img.height - sh) / 2);
          }
          const canvas = document.createElement("canvas");
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const ctx = canvas.getContext("2d");
          if (!ctx) { resolve(file); return; }
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);
          canvas.toBlob(
            (blob) => {
              if (!blob) { resolve(file); return; }
              resolve(new File(
                [blob],
                file.name.replace(/\.\w+$/, ".jpg"),
                { type: "image/jpeg", lastModified: Date.now() }
              ));
            },
            "image/jpeg",
            quality
          );
        } catch {
          resolve(file);
        }
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    } catch {
      resolve(file);
    }
  });
}

