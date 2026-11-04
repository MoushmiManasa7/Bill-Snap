export function parseIndianAmount(raw: string): number | null {
  const cleaned = raw
    .replace(/[₹]/g, "")
    .replace(/\b(?:rs\.?|inr)\b/gi, "")
    .replace(/\s/g, "")
    .replace(/,/g, "");

  if (!cleaned || !/^-?\d+(\.\d{1,2})?$/.test(cleaned)) {
    return null;
  }

  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0 || value > 10_000_000) {
    return null;
  }
  return Math.round(value * 100) / 100;
}

export function formatMoney(amount: number, currency = "INR"): string {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function findLikelyTotal(ocrText: string): number | null {
  const lines = ocrText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const totalPattern =
    /\b(grand\s*total|net\s*payable|amount\s*payable|total\s*due|total\s*amount|amount\s*due|net\s*amount|^total)\b/i;
  const skipPattern = /\b(sub\s*total|subtotal|tax|gst|cgst|sgst|vat|change|balance|cash|paid)\b/i;

  const labeled: number[] = [];
  for (const line of lines) {
    if (skipPattern.test(line) && !totalPattern.test(line)) continue;
    if (!totalPattern.test(line)) continue;
    const amounts = [...line.matchAll(/[₹]?\s*[\d,]+(?:\.\d{1,2})?/g)]
      .map((match) => parseIndianAmount(match[0]))
      .filter((value): value is number => value !== null);
    if (amounts.length) labeled.push(amounts[amounts.length - 1]);
  }
  if (labeled.length) return labeled[labeled.length - 1];

  const all = [...ocrText.matchAll(/[₹]\s*[\d,]+(?:\.\d{1,2})?/g)]
    .map((match) => parseIndianAmount(match[0]))
    .filter((value): value is number => value !== null);
  if (all.length) return Math.max(...all);
  return null;
}
