import type { Photo } from "./photo";
type Draft = { photo: Photo; category: string };
let pending: Draft | null = null;
export function setDraft(draft: Draft) {
  pending = draft;
}
export function getDraft() {
  return pending;
}
export function clearDraft(expected?: Draft | null) {
  if (expected === undefined || pending === expected) pending = null;
}
