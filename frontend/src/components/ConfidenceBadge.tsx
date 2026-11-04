import type { ConfidenceLevel } from "../types/bill";

const styles: Record<ConfidenceLevel, string> = {
  high: "bg-emerald-100 text-emerald-800",
  medium: "bg-amber-100 text-amber-800",
  low: "bg-red-100 text-red-800",
};

const dots: Record<ConfidenceLevel, string> = {
  high: "bg-emerald-500",
  medium: "bg-amber-500",
  low: "bg-red-500",
};

export function ConfidenceBadge({ level }: { level: ConfidenceLevel }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${styles[level]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dots[level]}`} aria-hidden="true" />
      {level}
    </span>
  );
}
