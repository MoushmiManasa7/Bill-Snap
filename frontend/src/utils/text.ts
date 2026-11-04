export function normalizeToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function fuzzyIncludes(haystack: string, needle: string): boolean {
  const n = normalizeToken(needle);
  if (n.length < 3) return haystack.toLowerCase().includes(needle.toLowerCase());
  const h = normalizeToken(haystack);
  if (h.includes(n)) return true;
  const parts = needle
    .toLowerCase()
    .split(/\s+/)
    .filter((part) => part.length >= 3);
  return parts.length > 0 && parts.every((part) => haystack.toLowerCase().includes(part));
}

export function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function createId(): string {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `bill_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function duplicateHash(merchant: string, date: string | null, amount: number): string {
  return `${merchant.trim().toLowerCase()}|${date || "nodate"}|${amount.toFixed(2)}`;
}

export async function blobFingerprint(blob: Blob): Promise<string> {
  const buffer = await blob.slice(0, 64_000).arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let hash = blob.size;
  for (let i = 0; i < bytes.length; i += 17) {
    hash = (hash * 33 + bytes[i]) >>> 0;
  }
  return `${blob.size}-${hash}`;
}
