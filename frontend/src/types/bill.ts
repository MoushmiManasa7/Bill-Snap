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

export type ExpenseCategory = (typeof CATEGORIES)[number];

export type ConfidenceLevel = "high" | "medium" | "low";

export interface SavedBill {
  id: string;
  merchant: string;
  date: string | null;
  totalAmount: number;
  currency: string;
  category: ExpenseCategory;
  image: Blob;
  createdAt: string;
  duplicateHash: string;
  userVerified: boolean;
  extractionNotes?: string;
}

export interface BillSummary {
  count: number;
  totalSpend: number;
  recent: SavedBill[];
}
