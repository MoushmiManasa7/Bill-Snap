import type { ApiErrorBody, ExtractionResult, HealthStatus } from "../types/extraction";
import { normalizeCategory } from "../utils/category";

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as ApiErrorBody;
    return body.error || `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}

export async function getHealth(): Promise<HealthStatus> {
  try {
    const response = await fetch("/api/health");
    if (!response.ok) {
      return { ok: false, aiConfigured: false, model: "" };
    }
    return (await response.json()) as HealthStatus;
  } catch {
    return { ok: false, aiConfigured: false, model: "" };
  }
}

export async function analyzeImage(input: {
  imageBase64: string;
  mimeType: string;
  ocrText: string;
  ocrConfidence: number;
}): Promise<ExtractionResult> {
  let response: Response;
  try {
    response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(90_000),
    });
  } catch (err) {
    if (err instanceof DOMException && (err.name === "TimeoutError" || err.name === "AbortError")) {
      throw new Error("The AI check timed out. Please try again with a clearer, smaller photo.");
    }
    throw new Error("Network unavailable. Check your connection and make sure the Bill Snap API is running.");
  }

  if (response.status === 503) {
    throw new Error(await readError(response));
  }
  if (!response.ok) {
    throw new Error(await readError(response));
  }

  const raw = (await response.json()) as ExtractionResult;
  return {
    ...raw,
    category: {
      ...raw.category,
      value: normalizeCategory(raw.category?.value ?? null),
    },
    merchant: raw.merchant ?? { value: null, confidence: "low" },
    date: raw.date ?? { value: null, confidence: "low" },
    totalAmount: raw.totalAmount ?? { value: null, currency: "INR", confidence: "low" },
    reason: raw.reason ?? "",
    isBill: Boolean(raw.isBill),
  };
}
