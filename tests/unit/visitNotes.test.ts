import { describe, expect, it } from "vitest";
import type { KeyValueStore } from "../../mobile/src/lib/localStore.js";
import {
  addVisitNote,
  cleanNoteText,
  editVisitNote,
  readVisitNotes,
  removeVisitNote,
  writeVisitNotes,
  type VisitNote,
} from "../../mobile/src/lib/visitNotes.js";

function memoryStore(): KeyValueStore {
  const data = new Map<string, string>();
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => { data.set(k, v); }, removeItem: (k) => { data.delete(k); } };
}
const blockedStore: KeyValueStore = {
  getItem: () => { throw new Error("blocked"); },
  setItem: () => { throw new Error("blocked"); },
  removeItem: () => { throw new Error("blocked"); },
};

const a: VisitNote = { id: "a", text: "Sleepy after dinner", updatedAt: "2026-10-14T10:00:00.000Z" };
const b: VisitNote = { id: "b", text: "Ask about the dry cough", updatedAt: "2026-10-15T10:00:00.000Z" };

describe("visit notes", () => {
  it("adds new notes on top and ignores empty text", () => {
    expect(addVisitNote([a], "Ask about the dry cough", b.updatedAt, "b")).toEqual([b, a]);
    expect(addVisitNote([a], "", b.updatedAt, "b")).toEqual([a]);
  });

  it("moves an edited note to the top; an emptied note is removed", () => {
    expect(editVisitNote([b, a], "a", "Sleepy after dinner, most days", "2026-10-16T09:00:00.000Z"))
      .toEqual([{ id: "a", text: "Sleepy after dinner, most days", updatedAt: "2026-10-16T09:00:00.000Z" }, b]);
    expect(editVisitNote([b, a], "a", "", "2026-10-16T09:00:00.000Z")).toEqual([b]);
  });

  it("removes by id", () => {
    expect(removeVisitNote([b, a], "b")).toEqual([a]);
  });

  it("trims and caps the text", () => {
    expect(cleanNoteText("  hello  ", 300)).toBe("hello");
    expect(cleanNoteText("abcdef", 3)).toBe("abc");
    expect(cleanNoteText("   ", 300)).toBe("");
  });

  it("round-trips through storage and drops unreadable data", () => {
    const store = memoryStore();
    expect(writeVisitNotes("k", [b, a], store)).toBe(true);
    expect(readVisitNotes("k", store)).toEqual([b, a]);
    store.setItem("k", "not json");
    expect(readVisitNotes("k", store)).toEqual([]);
    store.setItem("k", JSON.stringify([a, { id: 1 }]));
    expect(readVisitNotes("k", store)).toEqual([a]);
  });

  it("reports blocked storage so the caller keeps notes in memory", () => {
    expect(writeVisitNotes("k", [a], blockedStore)).toBe(false);
    expect(readVisitNotes("k", blockedStore)).toEqual([]);
  });
});
