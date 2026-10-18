import type { StopRows } from "./stopMedicine.js";

/**
 * My medicines shows ONE medicine at a time while it is being worked on (owner, 18 Oct): its Edit form, its pill-photo
 * step, its Stop confirm panel, or its "is stopped." + Undo card. The other medicines are not rendered, and the back
 * button reads "Back to Medicine list". Pure: the screen passes in what is open.
 */
export interface MedicineFocusInput {
  editingId: string | null;
  photoId: string | null;
  stopRows: StopRows;
}

/** The medicine being worked on, or null for the full list. */
export function focusedMedicine({ editingId, photoId, stopRows }: MedicineFocusInput): string | null {
  if (editingId) return editingId;
  if (photoId) return photoId;
  const stopping = Object.entries(stopRows).find(([, row]) => row.status !== "gone");
  return stopping ? stopping[0] : null;
}

/** The medicines to render: only the focused one, or every medicine whose stop hasn't ended its Undo. */
export function visibleMedicines<T extends { id: string }>(medicines: readonly T[], input: MedicineFocusInput): T[] {
  const focus = focusedMedicine(input);
  return medicines.filter((med) => (focus ? med.id === focus : input.stopRows[med.id]?.status !== "gone"));
}
