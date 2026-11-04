import { extractionSchema, type ExtractionResult } from "./schema";

const SYSTEM_PROMPT = `You are Bill Snap's receipt analyst.

Task:
1. Decide whether the image is a genuine bill, receipt, or invoice.
2. If it is not a bill, set isBill to false and explain briefly in reason.
3. If it is a bill, extract merchant, transaction date, FINAL total amount, and expense category.

Accept as bills:
- Printed receipts, grocery bills, restaurant bills, electricity/utility bills, medical bills, shopping invoices, handwritten bills.

Reject as non-bills:
- Selfies, identity cards, unrelated screenshots, landscapes, random documents, memes, people photos.

Rules:
- Return ONLY valid JSON matching the schema. No markdown.
- Dates must be YYYY-MM-DD. If you cannot read a date, use null. Never invent a date.
- totalAmount.value must be a number (no currency symbols). Prefer the FINAL payable total, not subtotal, tax, or change/balance due unless that is the only total.
- Handle Indian formats: ₹, Rs, INR, 1,250.00 and 1,250.50.
- currency is usually INR for Indian receipts; otherwise ISO code.
- category must be one of: Food, Groceries, Utilities, Shopping, Travel, Healthcare, Entertainment, Other.
- Confidence must reflect evidence in the image AND the OCR text: high only if clearly readable, medium if partially readable, low if guessed.
- Use the OCR text as supporting evidence. If OCR and the image disagree, prefer the image but lower confidence.
- merchant.value should be the store/brand name, not a slogan.
- Never copy sample values. Never invent a merchant, date, amount, or category that is not visible in this image or OCR text. Use null when unknown.

JSON schema (example structure only; values must come from THIS image):
{
  "isBill": true,
  "merchant": { "value": null, "confidence": "low" },
  "date": { "value": null, "confidence": "low" },
  "totalAmount": { "value": null, "currency": "INR", "confidence": "low" },
  "category": { "value": null, "confidence": "low" },
  "reason": ""
}`;

const GEMINI_TIMEOUT_MS = 18_000;
const DEFAULT_FALLBACKS = ["gemini-3.5-flash-lite", "gemini-3.6-flash"];

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

function stripDataUrl(imageBase64: string): string {
  const comma = imageBase64.indexOf(",");
  if (imageBase64.startsWith("data:") && comma !== -1) {
    return imageBase64.slice(comma + 1);
  }
  return imageBase64;
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const payload = fenced ? fenced[1].trim() : trimmed;
  const start = payload.indexOf("{");
  const end = payload.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("The AI response did not contain JSON.");
  }
  return JSON.parse(payload.slice(start, end + 1));
}

function parseError(err: unknown): Error {
  if (err instanceof Error) {
    if (err.name === "AbortError" || err.name === "TimeoutError") {
      const timeout = new Error(
        "The AI took too long to respond. Check your internet connection and try a clearer, smaller photo.",
      );
      timeout.name = "TimeoutError";
      return timeout;
    }
    return err;
  }
  return new Error("Analysis failed.");
}

function isCapacityError(status: number, message: string): boolean {
  return (
    status === 429 ||
    status === 503 ||
    /high demand|unavailable|try again later|resource exhausted|overloaded/i.test(message)
  );
}

function modelList(): string[] {
  const primary = process.env.GEMINI_MODEL?.trim() || "gemini-3.8-flash";
  const extras = (process.env.GEMINI_FALLBACK_MODELS || DEFAULT_FALLBACKS.join(","))
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
  return [...new Set([primary, ...extras])];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateOnce(
  modelName: string,
  imageBase64: string,
  mimeType: string,
  prompt: string,
): Promise<{ status: number; payload: GeminiResponse; elapsed: number }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent`;
  console.log(`Gemini request starting (${modelName})`);
  const started = Date.now();
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": process.env.GEMINI_API_KEY!.trim(),
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: mimeType || "image/jpeg",
                data: stripDataUrl(imageBase64),
              },
            },
          ],
        },
      ],
      generationConfig: {
        maxOutputTokens: 1024,
        responseMimeType: "application/json",
        ...(modelName.includes("3.8") || modelName.includes("3.6")
          ? { thinkingConfig: { thinkingLevel: "low" } }
          : {}),
      },
    }),
    signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
  });
  const rawText = await response.text();
  const elapsed = Date.now() - started;
  console.log(`Gemini responded in ${elapsed}ms with HTTP ${response.status} (${modelName})`);
  let payload: GeminiResponse;
  try {
    payload = JSON.parse(rawText) as GeminiResponse;
  } catch {
    payload = { error: { message: "The AI returned an invalid JSON response." } };
  }
  return { status: response.status, payload, elapsed };
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  error?: { message?: string; status?: string };
}

export async function analyzeBill(input: {
  imageBase64: string;
  mimeType: string;
  ocrText: string;
  ocrConfidence?: number;
}): Promise<ExtractionResult> {
  if (!isGeminiConfigured()) {
    const error = new Error(
      "Gemini is not configured. Add GEMINI_API_KEY to backend/.env.",
    );
    error.name = "ConfigError";
    throw error;
  }

  const ocrNote =
    input.ocrText.trim().length > 0
      ? `OCR text (confidence ${input.ocrConfidence ?? "unknown"}):\n${input.ocrText.slice(0, 4000)}`
      : "OCR produced no readable text.";
  const prompt = `${SYSTEM_PROMPT}\n\n${ocrNote}`;

  let payload: GeminiResponse | null = null;
  let lastError = "Gemini is busy right now. Please try again in a minute.";

  for (const modelName of modelList()) {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        const result = await generateOnce(
          modelName,
          input.imageBase64,
          input.mimeType,
          prompt,
        );
        if (result.status >= 200 && result.status < 300) {
          payload = result.payload;
          break;
        }
        const message = result.payload.error?.message || `Gemini request failed (${result.status}).`;
        lastError = message;
        if (!isCapacityError(result.status, message)) {
          throw new Error(message);
        }
        console.log(`Capacity error on ${modelName} attempt ${attempt}: ${message}`);
      } catch (err) {
        const parsed = parseError(err);
        if (parsed.name === "TimeoutError") {
          lastError = parsed.message;
          console.log(`Timeout on ${modelName} attempt ${attempt}`);
        } else if (isCapacityError(503, parsed.message)) {
          lastError = parsed.message;
        } else {
          throw parsed;
        }
      }
      await sleep(800 * attempt);
    }
    if (payload) break;
  }

  if (!payload) {
    throw new Error(
      /high demand|try again later|busy/i.test(lastError)
        ? "Gemini is busy right now. Bill Snap retried and tried a backup model. Please process the bill again in a minute."
        : lastError,
    );
  }

  const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
  if (!text.trim()) {
    const error = new Error("The AI did not return any extraction result. Please try again.");
    error.name = "ParseError";
    throw error;
  }

  let parsed: unknown;
  try {
    parsed = extractJson(text);
  } catch {
    const error = new Error("The AI returned an invalid JSON response.");
    error.name = "ParseError";
    throw error;
  }

  const checked = extractionSchema.safeParse(parsed);
  if (!checked.success) {
    const error = new Error("The AI returned an invalid JSON response.");
    error.name = "ParseError";
    throw error;
  }
  const extraction = checked.data;

  if (!extraction.isBill) {
    return {
      ...extraction,
      reason:
        extraction.reason ||
        "This doesn't appear to be a bill. Please upload a clear image of a receipt or invoice.",
    };
  }

  return extraction;
}
