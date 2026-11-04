import type { ReviewDraft } from "../types/extraction";

let pending: ReviewDraft | null = null;

export function setPendingReview(draft: ReviewDraft): void {
  pending = draft;
}

export function getPendingReview(): ReviewDraft | null {
  return pending;
}

export function clearPendingReview(): void {
  if (pending?.previewUrl) URL.revokeObjectURL(pending.previewUrl);
  pending = null;
}
