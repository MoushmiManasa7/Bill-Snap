import { CATEGORIES, type ExpenseCategory } from "../types/bill";

const KEYWORDS: Array<{ category: ExpenseCategory; terms: string[] }> = [
  { category: "Groceries", terms: ["dmart", "d-mart", "big bazaar", "reliance fresh", "more supermarket", "grocery", "kirana", "supermarket", "blinkit", "zepto"] },
  { category: "Food", terms: ["swiggy", "zomato", "restaurant", "cafe", "coffee", "pizza", "burger", "hotel", "dining", "food"] },
  { category: "Utilities", terms: ["electric", "electricity", "bescom", "mseb", "bsnl", "airtel", "jio", "vi ", "water bill", "gas bill", "utility"] },
  { category: "Healthcare", terms: ["apollo", "pharmacy", "hospital", "clinic", "medical", "diagnostic", "chemist"] },
  { category: "Travel", terms: ["uber", "ola", "irctc", "petrol", "diesel", "fuel", "airport", "flight", "metro", "toll"] },
  { category: "Shopping", terms: ["amazon", "flipkart", "myntra", "ajio", "mall", "store", "boutique"] },
  { category: "Entertainment", terms: ["pvr", "inox", "bookmyshow", "netflix", "spotify", "cinema", "movie"] },
];

export function isCategory(value: string | null | undefined): value is ExpenseCategory {
  return Boolean(value && (CATEGORIES as readonly string[]).includes(value));
}

export function predictCategory(merchant: string, ocrText: string): ExpenseCategory | null {
  const haystack = `${merchant} ${ocrText}`.toLowerCase();
  for (const row of KEYWORDS) {
    if (row.terms.some((term) => haystack.includes(term))) return row.category;
  }
  return null;
}

export function normalizeCategory(value: string | null | undefined): ExpenseCategory | null {
  if (!value) return null;
  const match = CATEGORIES.find((category) => category.toLowerCase() === value.trim().toLowerCase());
  return match ?? null;
}
