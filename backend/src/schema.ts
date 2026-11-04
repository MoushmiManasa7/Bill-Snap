import { z } from "zod";

export const CATEGORIES = [
  "Food",
  "Groceries",
  "Utilities",
  "Shopping",
  "Travel",
  "Healthcare",
  "Entertainment",
  "Other",
] as const;

export const confidenceSchema = z.enum(["high", "medium", "low"]);

export const extractionSchema = z.object({
  isBill: z.boolean(),
  merchant: z.object({
    value: z.string().nullable().catch(null),
    confidence: confidenceSchema.catch("low"),
  }),
  date: z.object({
    value: z.string().nullable().catch(null),
    confidence: confidenceSchema.catch("low"),
  }),
  totalAmount: z.object({
    value: z.number().nullable().catch(null),
    currency: z.string().nullable().catch("INR"),
    confidence: confidenceSchema.catch("low"),
  }),
  category: z.object({
    value: z.string().nullable().catch(null),
    confidence: confidenceSchema.catch("low"),
  }),
  reason: z.string().catch(""),
});

export type ExtractionResult = z.infer<typeof extractionSchema>;

export const analyzeRequestSchema = z.object({
  imageBase64: z.string().min(1),
  mimeType: z.string().default("image/jpeg"),
  ocrText: z.string().default(""),
  ocrConfidence: z.number().min(0).max(100).optional(),
});
