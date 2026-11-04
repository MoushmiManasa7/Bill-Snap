import type { ConfidenceLevel } from "../types/bill";
import type { OcrResult } from "../types/extraction";
import { dateLooksPresentInOcr, normalizeDate } from "./dates";
import { findLikelyTotal, parseIndianAmount } from "./money";
import { average, fuzzyIncludes } from "./text";

export function rankConfidence(score: number): ConfidenceLevel {
  if (score >= 0.78) return "high";
  if (score >= 0.45) return "medium";
  return "low";
}

export function worseConfidence(a: ConfidenceLevel, b: ConfidenceLevel): ConfidenceLevel {
  const rank = { high: 3, medium: 2, low: 1 };
  return rank[a] <= rank[b] ? a : b;
}

export function wordEvidence(ocr: OcrResult, value: string | null): number {
  if (!value) return 0;
  const hits = ocr.words.filter((word) => fuzzyIncludes(value, word.text) || fuzzyIncludes(word.text, value));
  if (!hits.length) return fuzzyIncludes(ocr.text, value) ? 0.45 : 0.1;
  return Math.min(1, average(hits.map((word) => word.confidence / 100)) + 0.1);
}

export function merchantScore(value: string | null, ocr: OcrResult, ai: ConfidenceLevel): number {
  if (!value || value.trim().length < 2) return 0.05;
  const evidence = wordEvidence(ocr, value);
  const aiBoost = ai === "high" ? 0.25 : ai === "medium" ? 0.12 : 0;
  const ocrBoost = ocr.confidence / 400;
  return Math.min(1, evidence * 0.7 + aiBoost + ocrBoost);
}

export function dateScore(value: string | null, ocr: OcrResult, ai: ConfidenceLevel): number {
  const iso = normalizeDate(value);
  if (!iso) return 0.05;
  const present = dateLooksPresentInOcr(iso, ocr.text);
  const aiBoost = ai === "high" ? 0.2 : ai === "medium" ? 0.1 : 0;
  return Math.min(1, (present ? 0.7 : 0.25) + aiBoost + ocr.confidence / 500);
}

export function amountScore(
  value: number | null,
  ocr: OcrResult,
  ai: ConfidenceLevel,
): number {
  if (value === null || !Number.isFinite(value) || value <= 0) return 0.05;
  const likely = findLikelyTotal(ocr.text);
  const inText = ocr.text.includes(String(Math.round(value))) || ocr.text.includes(value.toFixed(2));
  let score = 0.2;
  if (inText) score += 0.35;
  if (likely !== null && Math.abs(likely - value) < 0.05) score += 0.3;
  else if (likely !== null && Math.abs(likely - value) / Math.max(value, 1) < 0.02) score += 0.2;
  if (ai === "high") score += 0.15;
  else if (ai === "medium") score += 0.08;
  score += ocr.confidence / 500;
  return Math.min(1, score);
}

export function categoryScore(
  value: string | null,
  predicted: string | null,
  ai: ConfidenceLevel,
): number {
  if (!value) return 0.1;
  let score = ai === "high" ? 0.7 : ai === "medium" ? 0.5 : 0.3;
  if (predicted && predicted === value) score += 0.2;
  return Math.min(1, score);
}

export function parseAmountField(value: number | string | null | undefined): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") return parseIndianAmount(value);
  return null;
}
