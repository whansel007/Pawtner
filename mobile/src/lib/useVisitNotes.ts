import { useCallback, useEffect, useState } from "react";
import { VISIT_NOTES } from "../config/health";
import { api } from "./api";
import { liveItems } from "./demoDayReset";
import { addVisitNote, cleanNoteText, editVisitNote, readVisitNotes, removeVisitNote, writeVisitNotes, type VisitNote } from "./visitNotes";

/** Stored notes, kept in sync with other tabs of the same origin. */
function useStoredVisitNotes() {
  const [notes, setNotes] = useState<VisitNote[]>(() => readVisitNotes(VISIT_NOTES.storageKey));
  useEffect(() => {
    const sync = () => setNotes(readVisitNotes(VISIT_NOTES.storageKey));
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  return [notes, setNotes] as const;
}

/**
 * "For my next visit" notes for this phone, newest first; notes hidden by Reset to morning are kept in storage but not shown. Kept in state too, so they last the session if storage is blocked.
 * A note shared with the caretaker is mirrored to the server (PUT / DELETE /api/shared-notes/:id), so /care sees it from
 * any browser; private notes and earlier wordings never leave the phone. `onApiError` reports a failed mirror (the toast).
 */
export function useVisitNotes(onApiError: (error: unknown) => void) {
  const [notes, setNotes] = useStoredVisitNotes();

  const save = useCallback((next: VisitNote[]) => {
    writeVisitNotes(VISIT_NOTES.storageKey, next);
    setNotes(next);
  }, []);

  /** Mirror one shared note (its current text) to the server; private notes are never sent. */
  const mirror = useCallback((note: VisitNote | undefined) => {
    if (!note?.shared) return;
    api.putSharedNote(note.id, { text: note.text, updatedAt: note.updatedAt }).catch(onApiError);
  }, [onApiError]);

  const add = useCallback((text: string, shared: boolean) => {
    const next = addVisitNote(notes, cleanNoteText(text, VISIT_NOTES.maxLength), new Date().toISOString(), crypto.randomUUID(), shared);
    save(next);
    if (next !== notes) mirror(next[0]);
  }, [notes, save, mirror]);

  const edit = useCallback((id: string, text: string) => {
    const next = editVisitNote(notes, id, cleanNoteText(text, VISIT_NOTES.maxLength), new Date().toISOString());
    save(next);
    if (next !== notes) mirror(next.find((note) => note.id === id));
  }, [notes, save, mirror]);

  const remove = useCallback((id: string) => {
    const removed = notes.find((note) => note.id === id);
    save(removeVisitNote(notes, id));
    if (removed?.shared) api.deleteSharedNote(id).catch(onApiError);
  }, [notes, save, onApiError]);

  const shown = liveItems(notes);
  return { notes: shown, latest: shown[0] ?? null, add, edit, remove, maxLength: VISIT_NOTES.maxLength };
}
