import type { ExpenseCategory } from "../types/bill";
import type { ExtractionResult, OcrResult, ReviewDraft } from "../types/extraction";
import { normalizeCategory, predictCategory } from "./category";
import {
  amountScore,
  categoryScore,
  dateScore,
  merchantScore,
  parseAmountField,
  rankConfidence,
  worseConfidence,
} from "./confidence";
import { normalizeDate } from "./dates";

const REJECT_MESSAGE =
  "This doesn't appear to be a bill. Please upload a clear image of a receipt or invoice.";

export function mergeExtraction(
  raw: ExtractionResult,
  ocr: OcrResult,
): ReviewDraft | { rejected: true; reason: string } {
  if (!raw.isBill) {
    return { rejected: true, reason: raw.reason || REJECT_MESSAGE };
  }

  const merchant = raw.merchant.value?.trim() || "";
  const date = normalizeDate(raw.date.value);
  const amount = parseAmountField(raw.totalAmount.value);
  const predicted = predictCategory(merchant, ocr.text);
  const aiCategory = normalizeCategory(raw.category.value);
  const category = aiCategory ?? predicted;

  const merchantConfidence = worseConfidence(
    raw.merchant.confidence,
    rankConfidence(merchantScore(merchant || null, ocr, raw.merchant.confidence)),
  );
  const dateConfidence = worseConfidence(
    raw.date.confidence,
    rankConfidence(dateScore(date, ocr, raw.date.confidence)),
  );
  const amountConfidence = worseConfidence(
    raw.totalAmount.confidence,
    rankConfidence(amountScore(amount, ocr, raw.totalAmount.confidence)),
  );
  const categoryConfidence = worseConfidence(
    aiCategory ? raw.category.confidence : "low",
    rankConfidence(categoryScore(category, predicted, aiCategory ? raw.category.confidence : "low")),
  );

  const warnings: string[] = [];
  if (!merchant) warnings.push("Missing merchant name. Enter the store name before saving.");
  else if (merchantConfidence !== "high") warnings.push("Merchant name looks uncertain. Please verify it.");
  if (!date) warnings.push("Unclear transaction date. Add the date if you can read it.");
  else if (dateConfidence !== "high") warnings.push("Transaction date is unclear. Please check it.");
  if (amount === null) warnings.push("Uncertain total amount. Enter the final payable total.");
  else if (amountConfidence !== "high") warnings.push("Total amount may not be the final total. Please confirm.");
  if (!category || categoryConfidence !== "high") warnings.push("Expense category is uncertain. Choose the best match.");

  return {
    merchant,
    date: date ?? "",
    totalAmount: amount === null ? "" : String(amount),
    currency: raw.totalAmount.currency || "INR",
    category: (category ?? "Other") as ExpenseCategory,
    merchantConfidence: merchant ? merchantConfidence : "low",
    dateConfidence: date ? dateConfidence : "low",
    amountConfidence: amount === null ? "low" : amountConfidence,
    categoryConfidence: category ? categoryConfidence : "low",
    warnings,
    imageBlob: new Blob(),
    previewUrl: "",
    ocrText: ocr.text,
  };
}

export function draftWarnings(draft: ReviewDraft): string[] {
  const warnings: string[] = [];
  if (!draft.merchant.trim()) warnings.push("Missing merchant name. Enter the store name before saving.");
  else if (draft.merchantConfidence !== "high") warnings.push("Merchant name looks uncertain. Please verify it.");
  if (!draft.date) warnings.push("Unclear transaction date. Add the date if you can read it.");
  else if (draft.dateConfidence !== "high") warnings.push("Transaction date is unclear. Please check it.");
  if (!draft.totalAmount) warnings.push("Uncertain total amount. Enter the final payable total.");
  else if (draft.amountConfidence !== "high") warnings.push("Total amount may not be the final total. Please confirm.");
  if (draft.categoryConfidence !== "high") warnings.push("Expense category is uncertain. Choose the best match.");
  return warnings;
}

export { REJECT_MESSAGE };
