import { browserStore, readItem, writeItem, type KeyValueStore } from "./localStore.js";

/**
 * "For my next visit" notes (pure helpers; no DOM). The senior's own words, no interpretation. Lists are newest first.
 * Each note is either shared with the caretaker (shown on /care) or just for her.
 *
 * DEMO ONLY, WIRE-READY: notes live in localStorage, so /care sees shared notes only in the same browser
 * (same origin), like restock help. To share across devices, P1 adds a table and e.g.
 *   GET  /api/visit-notes?shared=true   (for /care)      POST / PUT / DELETE /api/visit-notes[/:id]
 * and the bodies of readVisitNotes / writeVisitNotes become API calls; callers keep the same shapes.
 */
export interface VisitNote {
  id: string;
  text: string;
  /** ISO time the note was written or last edited. */
  updatedAt: string;
  /** true = the caretaker can see it on /care; false = just for the senior. */
  shared: boolean;
  /** Earlier wordings, newest first: editing never loses what she wrote before. */
  earlier: Array<{ text: string; updatedAt: string }>;
}

/** A stored note; notes saved before sharing existed have no `shared` and stay private. */
function toNote(value: unknown): VisitNote | null {
  if (!value || typeof value !== "object") return null;
  const note = value as Record<string, unknown>;
  if (typeof note.id !== "string" || typeof note.text !== "string" || typeof note.updatedAt !== "string") return null;
  const earlier = Array.isArray(note.earlier)
    ? note.earlier.filter((item): item is { text: string; updatedAt: string } =>
      !!item && typeof item === "object" && typeof (item as Record<string, unknown>).text === "string"
      && typeof (item as Record<string, unknown>).updatedAt === "string")
    : [];
  return { id: note.id, text: note.text, updatedAt: note.updatedAt, shared: note.shared === true, earlier };
}

/** Trimmed and capped at `maxLength`; empty string when there is nothing to save. */
export function cleanNoteText(text: string, maxLength: number): string {
  return text.trim().slice(0, maxLength);
}

/** Stored notes, or [] (nothing stored, blocked storage, or unreadable data). */
export function readVisitNotes(key: string, store: KeyValueStore | null = browserStore()): VisitNote[] {
  const raw = readItem(key, store);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(toNote).filter((note): note is VisitNote => note !== null) : [];
  } catch {
    return [];
  }
}

/** True when stored; false (full or blocked storage) means the caller keeps them in memory for this session. */
export function writeVisitNotes(key: string, notes: VisitNote[], store: KeyValueStore | null = browserStore()): boolean {
  return writeItem(key, JSON.stringify(notes), store);
}

/** New note on top. Returns the list unchanged when the text is empty. */
export function addVisitNote(notes: VisitNote[], text: string, now: string, id: string, shared: boolean): VisitNote[] {
  return text ? [{ id, text, updatedAt: now, shared, earlier: [] }, ...notes] : notes;
}

/**
 * Edited note moves to the top, keeps who can see it, and keeps its previous wording in `earlier`.
 * Empty or unchanged text changes nothing (removing is only ever removeVisitNote).
 */
export function editVisitNote(notes: VisitNote[], id: string, text: string, now: string): VisitNote[] {
  const original = notes.find((note) => note.id === id);
  if (!original || !text || text === original.text) return notes;
  const rest = notes.filter((note) => note.id !== id);
  const earlier = [{ text: original.text, updatedAt: original.updatedAt }, ...original.earlier];
  return [{ ...original, text, updatedAt: now, earlier }, ...rest];
}

/**
 * /care "Questions for the doctor": the senior's shared notes plus the API's questions (from BP notes),
 * newest first. Private notes never appear here.
 */
export function doctorQuestionsForCare(
  notes: VisitNote[],
  apiQuestions: ReadonlyArray<{ note: string; occurredAt: string }>,
): Array<{ note: string; occurredAt: string }> {
  const shared = notes.filter((note) => note.shared).map((note) => ({ note: note.text, occurredAt: note.updatedAt }));
  return [...shared, ...apiQuestions].sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt));
}

export function removeVisitNote(notes: VisitNote[], id: string): VisitNote[] {
  return notes.filter((note) => note.id !== id);
}
