function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function toIsoDate(year: number, month: number, day: number): string | null {
  if (year < 1990 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function normalizeDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const text = raw.trim();
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    return toIsoDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  }

  const compact = text.match(/\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})\b/);
  if (compact) {
    const first = Number(compact[1]);
    const second = Number(compact[2]);
    let year = Number(compact[3]);
    if (year < 100) year += year >= 70 ? 1900 : 2000;
    // Indian receipts use day/month/year. Do not guess a US month/day swap.
    return toIsoDate(year, second, first);
  }

  return null;
}

export function dateLooksPresentInOcr(isoDate: string, ocrText: string): boolean {
  const [year, month, day] = isoDate.split("-");
  const dayNum = String(Number(day));
  const monthNum = String(Number(month));
  const patterns = [
    isoDate,
    `${day}/${month}/${year}`,
    `${day}-${month}-${year}`,
    `${day}.${month}.${year}`,
    `${dayNum}/${monthNum}/${year}`,
    `${dayNum}-${monthNum}-${year}`,
  ];
  const haystack = ocrText.toLowerCase();
  return patterns.some((pattern) => haystack.includes(pattern.toLowerCase()));
}
