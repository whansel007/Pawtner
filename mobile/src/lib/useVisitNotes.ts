import { useCallback, useEffect, useState } from "react";
import { VISIT_NOTES } from "../config/health";
import { addVisitNote, cleanNoteText, editVisitNote, readVisitNotes, removeVisitNote, writeVisitNotes, type VisitNote } from "./visitNotes";

/** Stored notes, kept in sync with other tabs of the same origin (the phone app and /care open side by side). */
function useStoredVisitNotes() {
  const [notes, setNotes] = useState<VisitNote[]>(() => readVisitNotes(VISIT_NOTES.storageKey));
  useEffect(() => {
    const sync = () => setNotes(readVisitNotes(VISIT_NOTES.storageKey));
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  return [notes, setNotes] as const;
}

/** /care side: every stored note (the caller shows only shared ones, via doctorQuestionsForCare). */
export function useCareVisitNotes(): VisitNote[] {
  return useStoredVisitNotes()[0];
}

/** "For my next visit" notes for this phone, newest first. Kept in state too, so they last the session if storage is blocked. */
export function useVisitNotes() {
  const [notes, setNotes] = useStoredVisitNotes();

  const save = useCallback((next: VisitNote[]) => {
    writeVisitNotes(VISIT_NOTES.storageKey, next);
    setNotes(next);
  }, []);

  const add = useCallback((text: string, shared: boolean) => {
    save(addVisitNote(notes, cleanNoteText(text, VISIT_NOTES.maxLength), new Date().toISOString(), crypto.randomUUID(), shared));
  }, [notes, save]);

  const edit = useCallback((id: string, text: string) => {
    save(editVisitNote(notes, id, cleanNoteText(text, VISIT_NOTES.maxLength), new Date().toISOString()));
  }, [notes, save]);

  const remove = useCallback((id: string) => save(removeVisitNote(notes, id)), [notes, save]);

  return { notes, latest: notes[0] ?? null, add, edit, remove, maxLength: VISIT_NOTES.maxLength };
}
