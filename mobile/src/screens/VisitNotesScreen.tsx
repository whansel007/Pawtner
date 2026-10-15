import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FullCard } from "../components/FullCard";
import type { BackAction } from "../lib/navigation";
import type { VisitNote } from "../lib/visitNotes";
import "./VisitNotesScreen.css";

/**
 * "For my next visit": the senior's own notes for the doctor, newest first. Add, edit, delete.
 * Presentational: notes and actions come from useVisitNotes (App.tsx). Kept on this phone only.
 */
export function VisitNotesScreen({
  back,
  notes,
  maxLength,
  onAdd,
  onEdit,
  onRemove,
}: {
  back: BackAction;
  notes: VisitNote[];
  maxLength: number;
  onAdd: (text: string) => void;
  onEdit: (id: string, text: string) => void;
  onRemove: (id: string) => void;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  const startEdit = (note: VisitNote) => {
    setEditingId(note.id);
    setEditDraft(note.text);
  };

  return (
    <FullCard back={back}>
      <h2>{t("visitNotes.title")}</h2>
      <p className="supporting">{t("visitNotes.empty")}</p>
      <form
        className="visit-notes__new"
        onSubmit={(event) => {
          event.preventDefault();
          onAdd(draft);
          setDraft("");
        }}
      >
        <textarea
          value={draft}
          maxLength={maxLength}
          rows={3}
          aria-label={t("visitNotes.inputLabel")}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button type="submit" className="primary-button" disabled={!draft.trim()}>{t("visitNotes.save")}</button>
      </form>
      <ul className="visit-notes__list">
        {notes.map((note) => (
          <li key={note.id} className="visit-notes__item">
            {editingId === note.id ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  onEdit(note.id, editDraft);
                  setEditingId(null);
                }}
              >
                <textarea
                  value={editDraft}
                  maxLength={maxLength}
                  rows={3}
                  aria-label={t("visitNotes.inputLabel")}
                  onChange={(event) => setEditDraft(event.target.value)}
                />
                <div className="visit-notes__actions">
                  <button type="submit" className="secondary-button" disabled={!editDraft.trim()}>{t("visitNotes.saveEdit")}</button>
                  <button type="button" className="text-button" onClick={() => setEditingId(null)}>{t("visitNotes.cancel")}</button>
                </div>
              </form>
            ) : (
              <>
                <p>{note.text}</p>
                <div className="visit-notes__actions">
                  <button type="button" className="secondary-button" onClick={() => startEdit(note)}>{t("visitNotes.edit")}</button>
                  <button type="button" className="text-button" onClick={() => onRemove(note.id)}>{t("visitNotes.delete")}</button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </FullCard>
  );
}
