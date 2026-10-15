import { browserStore, readItem, writeItem, type KeyValueStore } from "./localStore.js";

/**
 * "For my next visit" notes (pure helpers; no DOM). The senior's own words, kept on this phone only:
 * no upload, no caretaker view, no interpretation. Lists are newest first.
 */
export interface VisitNote {
  id: string;
  text: string;
  /** ISO time the note was written or last edited. */
  updatedAt: string;
}

function isNote(value: unknown): value is VisitNote {
  if (!value || typeof value !== "object") return false;
  const note = value as Record<string, unknown>;
  return typeof note.id === "string" && typeof note.text === "string" && typeof note.updatedAt === "string";
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
    return Array.isArray(parsed) ? parsed.filter(isNote) : [];
  } catch {
    return [];
  }
}

/** True when stored; false (full or blocked storage) means the caller keeps them in memory for this session. */
export function writeVisitNotes(key: string, notes: VisitNote[], store: KeyValueStore | null = browserStore()): boolean {
  return writeItem(key, JSON.stringify(notes), store);
}

/** New note on top. Returns the list unchanged when the text is empty. */
export function addVisitNote(notes: VisitNote[], text: string, now: string, id: string): VisitNote[] {
  return text ? [{ id, text, updatedAt: now }, ...notes] : notes;
}

/** Edited note moves to the top. An empty text removes it. */
export function editVisitNote(notes: VisitNote[], id: string, text: string, now: string): VisitNote[] {
  const rest = notes.filter((note) => note.id !== id);
  return text ? [{ id, text, updatedAt: now }, ...rest] : rest;
}

export function removeVisitNote(notes: VisitNote[], id: string): VisitNote[] {
  return notes.filter((note) => note.id !== id);
}
