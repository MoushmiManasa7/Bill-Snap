import { db } from "../database/db";
import type { ExpenseCategory, SavedBill } from "../types/bill";
import { blobFingerprint, createId, duplicateHash } from "../utils/text";

export async function listBills(): Promise<SavedBill[]> {
  return db.bills.orderBy("createdAt").reverse().toArray();
}

export async function getBill(id: string): Promise<SavedBill | undefined> {
  return db.bills.get(id);
}

export async function findDuplicate(merchant: string, date: string | null, amount: number, image: Blob) {
  const hash = duplicateHash(merchant, date, amount);
  const fingerprint = await blobFingerprint(image);
  const matches = await db.bills.where("duplicateHash").equals(hash).toArray();
  if (matches.length) return matches[0];
  const all = await db.bills.toArray();
  return all.find((bill) => bill.extractionNotes?.includes(fingerprint));
}

export async function saveBill(input: {
  merchant: string;
  date: string | null;
  totalAmount: number;
  currency: string;
  category: ExpenseCategory;
  image: Blob;
  userVerified: boolean;
}): Promise<SavedBill> {
  const bill: SavedBill = {
    id: createId(),
    merchant: input.merchant.trim(),
    date: input.date,
    totalAmount: input.totalAmount,
    currency: input.currency || "INR",
    category: input.category,
    image: input.image,
    createdAt: new Date().toISOString(),
    duplicateHash: duplicateHash(input.merchant, input.date, input.totalAmount),
    userVerified: input.userVerified,
    extractionNotes: await blobFingerprint(input.image),
  };
  await db.bills.put(bill);
  return bill;
}

export async function deleteBill(id: string): Promise<void> {
  await db.bills.delete(id);
}

export function filterBills(
  bills: SavedBill[],
  query: string,
  category: ExpenseCategory | "All",
  sort: "newest" | "oldest" | "amount",
): SavedBill[] {
  const needle = query.trim().toLowerCase();
  let rows = bills.filter((bill) => {
    const merchantMatch = !needle || bill.merchant.toLowerCase().includes(needle);
    const categoryMatch = category === "All" || bill.category === category;
    return merchantMatch && categoryMatch;
  });
  rows = [...rows].sort((a, b) => {
    if (sort === "amount") return b.totalAmount - a.totalAmount;
    const aDate = a.date || a.createdAt;
    const bDate = b.date || b.createdAt;
    return sort === "oldest" ? aDate.localeCompare(bDate) : bDate.localeCompare(aDate);
  });
  return rows;
}
