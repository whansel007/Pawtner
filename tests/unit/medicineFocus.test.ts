import { describe, expect, it } from "vitest";
import { focusedMedicine, visibleMedicines } from "../../mobile/src/lib/medicineFocus.js";
import type { StopRows } from "../../mobile/src/lib/stopMedicine.js";

const meds = [{ id: "a" }, { id: "b" }, { id: "c" }];
const none = { editingId: null, photoId: null, stopRows: {} as StopRows };
const row = (status: StopRows[string]["status"]) => ({ status, failed: false, openedAt: 0 });

describe("My medicines: one medicine at a time", () => {
  it("shows the full list when nothing is being worked on", () => {
    expect(focusedMedicine(none)).toBeNull();
    expect(visibleMedicines(meds, none).map((m) => m.id)).toEqual(["a", "b", "c"]);
  });

  it("shows only the medicine being edited, given a photo, or stopped", () => {
    expect(visibleMedicines(meds, { ...none, editingId: "b" }).map((m) => m.id)).toEqual(["b"]);
    expect(visibleMedicines(meds, { ...none, photoId: "c" }).map((m) => m.id)).toEqual(["c"]);
    for (const status of ["confirm", "stopping", "stopped", "undoing"] as const) {
      expect(visibleMedicines(meds, { ...none, stopRows: { a: row(status) } }).map((m) => m.id)).toEqual(["a"]);
    }
  });

  it("an ended Undo (gone) is not a focus and leaves the list", () => {
    const input = { ...none, stopRows: { a: row("gone") } };
    expect(focusedMedicine(input)).toBeNull();
    expect(visibleMedicines(meds, input).map((m) => m.id)).toEqual(["b", "c"]);
    // A newer stop on b focuses b while a stays gone.
    expect(visibleMedicines(meds, { ...none, stopRows: { a: row("gone"), b: row("stopped") } }).map((m) => m.id)).toEqual(["b"]);
  });
});
