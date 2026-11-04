import { createWorker } from "tesseract.js";
import type { OcrResult } from "../types/extraction";

export async function runOcr(
  image: Blob | string,
  onProgress?: (status: string, progress: number) => void,
): Promise<OcrResult> {
  const worker = await createWorker("eng", 1, {
    logger: (message) => {
      if (message.status && onProgress) {
        onProgress(message.status, message.progress ?? 0);
      }
    },
  });

  try {
    const { data } = await worker.recognize(image, undefined, { text: true, blocks: true });
    const words =
      data.blocks?.flatMap((block) =>
        block.paragraphs.flatMap((paragraph) =>
          paragraph.lines.flatMap((line) =>
            line.words.map((word) => ({
              text: word.text,
              confidence: word.confidence ?? 0,
            })),
          ),
        ),
      ) ?? [];
    return {
      text: data.text?.trim() ?? "",
      confidence: data.confidence ?? 0,
      words,
    };
  } catch {
    throw new Error("OCR failed. Please try a clearer, well-lit photo of the bill.");
  } finally {
    await worker.terminate();
  }
}
