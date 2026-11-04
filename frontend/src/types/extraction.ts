import type { ConfidenceLevel, ExpenseCategory } from "./bill";

export interface ExtractedField<T> {
  value: T;
  confidence: ConfidenceLevel;
}

export interface ExtractionResult {
  isBill: boolean;
  merchant: ExtractedField<string | null>;
  date: ExtractedField<string | null>;
  totalAmount: ExtractedField<number | null> & { currency: string | null };
  category: ExtractedField<ExpenseCategory | null>;
  reason: string;
}

export interface OcrResult {
  text: string;
  confidence: number;
  words: Array<{ text: string; confidence: number }>;
}

export interface ReviewDraft {
  merchant: string;
  date: string;
  totalAmount: string;
  currency: string;
  category: ExpenseCategory;
  merchantConfidence: ConfidenceLevel;
  dateConfidence: ConfidenceLevel;
  amountConfidence: ConfidenceLevel;
  categoryConfidence: ConfidenceLevel;
  warnings: string[];
  imageBlob: Blob;
  previewUrl: string;
  ocrText: string;
}

export interface HealthStatus {
  ok: boolean;
  aiConfigured: boolean;
  model: string;
}

export interface ApiErrorBody {
  error: string;
  code?: string;
}
