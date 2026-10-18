import type { MemoPhoto } from "./clinicMemo.js";
import type { VisitNote } from "./visitNotes.js";

/**
 * Reset to morning on the phone hides, never deletes (owner, 18 Oct), with the same meaning as the server's `reset_at`
 * (api/repository.ts `notReset`): an item with `resetAt` (the moment of the reset) is hidden; absent = it counts.
 * Only items from the reset's day (from `dayStart` on, the senior's local midnight) are hidden; earlier days stay.
 * The one rule for the phone; readers show `liveItems(…)` only.
 */
export interface Resettable {
  resetAt?: string;
}

export function isLive(item: Resettable): boolean {
  return !item.resetAt;
}

export function liveItems<T extends Resettable>(items: readonly T[]): T[] {
  return items.filter(isLive);
}

function onOrAfter(time: string, dayStart: number): boolean {
  const ms = Date.parse(time);
  return Number.isFinite(ms) && ms >= dayStart;
}

/**
 * Visit notes: a note written on the reset's day is hidden whole; a note written earlier but edited that day shows its
 * newest wording from before that day again, and that day's wordings move to `resetVersions` (kept, hidden).
 */
export function resetVisitNotes(notes: readonly VisitNote[], dayStart: number, stampedAt: string): VisitNote[] {
  return notes.map((note) => {
    if (!isLive(note)) return note;
    const versions = [{ text: note.text, updatedAt: note.updatedAt }, ...note.earlier];
    const today = versions.filter((version) => onOrAfter(version.updatedAt, dayStart));
    if (today.length === 0) return note;
    const before = versions.filter((version) => !onOrAfter(version.updatedAt, dayStart));
    if (before.length === 0) return { ...note, resetAt: stampedAt };
    return {
      ...note,
      text: before[0].text,
      updatedAt: before[0].updatedAt,
      earlier: before.slice(1),
      resetVersions: [...today.map((version) => ({ ...version, resetAt: stampedAt })), ...(note.resetVersions ?? [])],
    };
  });
}

/** Clinic memo photos added on the reset's day are hidden; earlier ones (and old photos with no time) stay. */
export function resetClinicMemos(photos: readonly MemoPhoto[], dayStart: number, stampedAt: string): MemoPhoto[] {
  return photos.map((photo) => (isLive(photo) && onOrAfter(photo.addedAt, dayStart) ? { ...photo, resetAt: stampedAt } : photo));
}
