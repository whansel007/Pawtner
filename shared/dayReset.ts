/**
 * Reset to morning hides, never deletes (owner, 18 Oct). The one rule for items kept as lists (the phone's visit notes
 * and clinic memo photos, the server's refill requests and shared notes); database rows follow the same meaning with
 * their `reset_at` column (api/repository.ts `notReset`). An item with `resetAt` (the moment of the reset) is hidden;
 * absent = it counts. Only the reset day's items (from `dayStart`, the senior's local midnight, in ms) are touched;
 * earlier days stay as they are, and an item hidden by an earlier reset keeps its first stamp.
 */
export interface Resettable {
  resetAt?: string | null;
}

/** A wording of a note: the current one, or an earlier one. */
export interface Wording {
  text: string;
  updatedAt: string;
}

/** A note that keeps its earlier wordings (newest first) and the wordings a reset took back (kept, hidden). */
export interface VersionedNote extends Resettable, Wording {
  earlier: Wording[];
  resetVersions?: Array<Wording & { resetAt: string }>;
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

/** Items stamped by one time each (refill requests by `requestedAt`, memo photos by `addedAt`): the reset day's are hidden. */
export function resetItems<T extends Resettable>(items: readonly T[], timeOf: (item: T) => string, dayStart: number, stampedAt: string): T[] {
  return items.map((item) => (isLive(item) && onOrAfter(timeOf(item), dayStart) ? { ...item, resetAt: stampedAt } : item));
}

/**
 * Notes with wordings: a note written on the reset's day is hidden whole; a note written earlier but edited that day
 * shows its newest wording from before that day again, and that day's wordings move to `resetVersions` (kept, hidden).
 */
export function resetNotes<T extends VersionedNote>(notes: readonly T[], dayStart: number, stampedAt: string): T[] {
  return notes.map((note) => {
    if (!isLive(note)) return note;
    const wordings: Wording[] = [{ text: note.text, updatedAt: note.updatedAt }, ...(note.earlier ?? [])];
    const today = wordings.filter((wording) => onOrAfter(wording.updatedAt, dayStart));
    if (today.length === 0) return note;
    const before = wordings.filter((wording) => !onOrAfter(wording.updatedAt, dayStart));
    if (before.length === 0) return { ...note, resetAt: stampedAt };
    return {
      ...note,
      text: before[0].text,
      updatedAt: before[0].updatedAt,
      earlier: before.slice(1),
      resetVersions: [...today.map((wording) => ({ ...wording, resetAt: stampedAt })), ...(note.resetVersions ?? [])],
    };
  });
}
