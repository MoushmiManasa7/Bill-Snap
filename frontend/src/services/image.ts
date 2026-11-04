const ALLOWED = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif"]);

export function assertSupportedImage(file: File | Blob): void {
  const type = file.type || "image/jpeg";
  if (type && !ALLOWED.has(type) && !type.startsWith("image/")) {
    throw new Error("Unsupported image format. Please upload a JPG, PNG, or WEBP bill photo.");
  }
  if (file.size > 12 * 1024 * 1024) {
    throw new Error("That image is too large. Please use a photo under 12 MB.");
  }
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the image file."));
    reader.readAsDataURL(blob);
  });
}

export async function prepareImage(
  source: Blob,
  maxDim = 1024,
): Promise<{ blob: Blob; dataUrl: string; mimeType: string }> {
  assertSupportedImage(source);
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(source);
  } catch {
    throw new Error("Unsupported or damaged image. Please use a clear JPG or PNG photo of the bill.");
  }
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process this image in the browser.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) resolve(result);
        else reject(new Error("Could not compress the image."));
      },
      "image/jpeg",
      0.72,
    );
  });

  return {
    blob,
    dataUrl: await blobToDataUrl(blob),
    mimeType: "image/jpeg",
  };
}

export function captureFromVideo(video: HTMLVideoElement): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth || 1280;
  canvas.height = video.videoHeight || 720;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("Could not capture a photo."));
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Could not capture a photo."));
      },
      "image/jpeg",
      0.9,
    );
  });
}
