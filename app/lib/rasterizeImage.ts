/** LingBot / Reactor decodes images with PIL — SVG and mislabeled blobs fail. */

const DEFAULT_MAX_WIDTH = 1792;
const DEFAULT_MAX_HEIGHT = 1024;
const DEFAULT_QUALITY = 0.95;

function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not decode image file"));
    img.src = url;
  });
}

async function drawToJpegBlob(
  img: HTMLImageElement,
  opts?: { maxWidth?: number; maxHeight?: number; quality?: number },
): Promise<Blob> {
  const maxW = opts?.maxWidth ?? DEFAULT_MAX_WIDTH;
  const maxH = opts?.maxHeight ?? DEFAULT_MAX_HEIGHT;
  const quality = opts?.quality ?? DEFAULT_QUALITY;

  let width = img.naturalWidth || img.width;
  let height = img.naturalHeight || img.height;
  if (width <= 0 || height <= 0) {
    throw new Error("Image has invalid dimensions");
  }

  const scale = Math.min(1, maxW / width, maxH / height);
  width = Math.max(1, Math.round(width * scale));
  height = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not available");

  ctx.drawImage(img, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error("Failed to encode JPEG for Reactor upload")),
      "image/jpeg",
      quality,
    );
  });
}

/** Convert any browser-loadable image (incl. SVG) to JPEG for set_image. */
export async function toReactorImageBlob(
  source: Blob | File,
  opts?: { maxWidth?: number; maxHeight?: number; quality?: number },
): Promise<Blob> {
  const type = source.type.toLowerCase();

  if (type === "image/jpeg" || type === "image/jpg") {
    const url = URL.createObjectURL(source);
    try {
      const img = await loadImageElement(url);
      return drawToJpegBlob(img, opts);
    } catch {
      throw new Error("Invalid JPEG file — try PNG or WebP instead");
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  const url = URL.createObjectURL(source);
  try {
    const img = await loadImageElement(url);
    return drawToJpegBlob(img, opts);
  } finally {
    URL.revokeObjectURL(url);
  }
}
