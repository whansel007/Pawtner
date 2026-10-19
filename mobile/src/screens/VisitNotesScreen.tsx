import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FullCard } from "../components/FullCard";
import type { BackAction } from "../lib/navigation";
import type { VisitNote } from "../lib/visitNotes";
import "./VisitNotesScreen.css";

/**
 * "For my next visit": the senior's own notes for the doctor, in two sections: shared with her caretakers
 * (shown on /care) and just for her. Newest first; add, edit, delete.
 * Presentational: notes and actions come from useVisitNotes (App.tsx).
 */
export function VisitNotesScreen({
  back,
  notes,
  caretakers,
  maxLength,
  onAdd,
  onEdit,
  onRemove,
}: {
  back: BackAction;
  notes: VisitNote[];
  /** Everyone caring for her, as one line (lib/caretakers.ts caretakersLine): every caretaker sees the shared notes on /care. */
  caretakers: string;
  maxLength: number;
  onAdd: (text: string, shared: boolean) => void;
  onEdit: (id: string, text: string) => void;
  onRemove: (id: string) => void;
}) {
  const { t } = useTranslation();
  const section = (shared: boolean) => (
    <NotesSection
      title={shared ? t("visitNotes.sharedTitle", { caretaker: caretakers }) : t("visitNotes.privateTitle")}
      hint={shared ? t("visitNotes.sharedHint", { caretaker: caretakers }) : t("visitNotes.privateHint")}
      tone={shared ? "shared" : "private"}
      notes={notes.filter((note) => note.shared === shared)}
      maxLength={maxLength}
      onAdd={(text) => onAdd(text, shared)}
      onEdit={onEdit}
      onRemove={onRemove}
    />
  );
  return (
    <FullCard back={back}>
      <h2>{t("visitNotes.title")}</h2>
      <p className="supporting">{t("visitNotes.empty")}</p>
      {section(true)}
      {section(false)}
    </FullCard>
  );
}

function NotesSection({
  title,
  hint,
  tone,
  notes,
  maxLength,
  onAdd,
  onEdit,
  onRemove,
}: {
  title: string;
  hint: string;
  tone: "shared" | "private";
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

  return (
    <section className={`visit-notes__section visit-notes__section--${tone}`} aria-label={title}>
      <h3>{title}</h3>
      <p className="visit-notes__hint">{hint}</p>
      <form
        className="visit-notes__new"
        onSubmit={(event) => {
          event.preventDefault();
          onAdd(draft);
          setDraft("");
        }}
      >
        <textarea value={draft} maxLength={maxLength} rows={2} aria-label={t("visitNotes.inputLabel")} onChange={(event) => setDraft(event.target.value)} />
        <button type="submit" className="primary-button" disabled={!draft.trim()}>{t("visitNotes.save")}</button>
      </form>
      {notes.length > 0 && (
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
                  <textarea value={editDraft} maxLength={maxLength} rows={3} aria-label={t("visitNotes.inputLabel")} onChange={(event) => setEditDraft(event.target.value)} />
                  <div className="visit-notes__actions">
                    <button type="submit" className="secondary-button" disabled={!editDraft.trim()}>{t("visitNotes.saveEdit")}</button>
                    <button type="button" className="text-button" onClick={() => setEditingId(null)}>{t("visitNotes.cancel")}</button>
                  </div>
                </form>
              ) : (
                <>
                  <p>{note.text}</p>
                  {note.earlier.length > 0 && (
                    <details className="visit-notes__earlier">
                      <summary>{t("visitNotes.earlier", { count: note.earlier.length })}</summary>
                      <ul>
                        {note.earlier.map((version) => <li key={version.updatedAt}>{version.text}</li>)}
                      </ul>
                    </details>
                  )}
                  <div className="visit-notes__actions">
                    <button type="button" className="secondary-button" onClick={() => { setEditingId(note.id); setEditDraft(note.text); }}>{t("visitNotes.edit")}</button>
                    <button type="button" className="text-button" onClick={() => onRemove(note.id)}>{t("visitNotes.delete")}</button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
