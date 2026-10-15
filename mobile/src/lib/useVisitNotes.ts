import { useCallback, useEffect, useState } from "react";
import { VISIT_NOTES } from "../config/health";
import { addVisitNote, cleanNoteText, editVisitNote, readVisitNotes, removeVisitNote, writeVisitNotes, type VisitNote } from "./visitNotes";

/** "For my next visit" notes for this phone, newest first. Kept in state too, so they last the session if storage is blocked. */
export function useVisitNotes() {
  const [notes, setNotes] = useState<VisitNote[]>(() => readVisitNotes(VISIT_NOTES.storageKey));

  // Another tab of the app on this phone may change them.
  useEffect(() => {
    const sync = () => setNotes(readVisitNotes(VISIT_NOTES.storageKey));
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const save = useCallback((next: VisitNote[]) => {
    writeVisitNotes(VISIT_NOTES.storageKey, next);
    setNotes(next);
  }, []);

  const add = useCallback((text: string) => {
    save(addVisitNote(notes, cleanNoteText(text, VISIT_NOTES.maxLength), new Date().toISOString(), crypto.randomUUID()));
  }, [notes, save]);

  const edit = useCallback((id: string, text: string) => {
    save(editVisitNote(notes, id, cleanNoteText(text, VISIT_NOTES.maxLength), new Date().toISOString()));
  }, [notes, save]);

  const remove = useCallback((id: string) => save(removeVisitNote(notes, id)), [notes, save]);

  return { notes, latest: notes[0] ?? null, add, edit, remove, maxLength: VISIT_NOTES.maxLength };
}
