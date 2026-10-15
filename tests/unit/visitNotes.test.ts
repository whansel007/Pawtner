import { describe, expect, it } from "vitest";
import type { KeyValueStore } from "../../mobile/src/lib/localStore.js";
import {
  addVisitNote,
  cleanNoteText,
  doctorQuestionsForCare,
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

const a: VisitNote = { id: "a", text: "Sleepy after dinner", updatedAt: "2026-10-14T10:00:00.000Z", shared: false, earlier: [] };
const b: VisitNote = { id: "b", text: "Ask about the dry cough", updatedAt: "2026-10-15T10:00:00.000Z", shared: false, earlier: [] };

describe("visit notes", () => {
  it("adds new notes on top and ignores empty text", () => {
    expect(addVisitNote([a], "Ask about the dry cough", b.updatedAt, "b", false)).toEqual([b, a]);
    expect(addVisitNote([a], "", b.updatedAt, "b", false)).toEqual([a]);
  });

  it("moves an edited note to the top and keeps the earlier wording; empty or unchanged edits change nothing", () => {
    const once = editVisitNote([b, a], "a", "Sleepy after dinner, most days", "2026-10-16T09:00:00.000Z");
    expect(once).toEqual([{ id: "a", text: "Sleepy after dinner, most days", updatedAt: "2026-10-16T09:00:00.000Z", shared: false,
      earlier: [{ text: "Sleepy after dinner", updatedAt: "2026-10-14T10:00:00.000Z" }] }, b]);
    const twice = editVisitNote(once, "a", "Sleepy every evening", "2026-10-17T09:00:00.000Z");
    expect(twice[0].earlier.map((version) => version.text)).toEqual(["Sleepy after dinner, most days", "Sleepy after dinner"]);
    expect(editVisitNote([b, a], "a", "", "2026-10-16T09:00:00.000Z")).toEqual([b, a]);
    expect(editVisitNote([b, a], "a", "Sleepy after dinner", "2026-10-16T09:00:00.000Z")).toEqual([b, a]);
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

describe("shared visit notes", () => {
  const shared: VisitNote = { id: "s", text: "Ask about the cough", updatedAt: "2026-10-15T09:00:00.000Z", shared: true, earlier: [] };
  const mine: VisitNote = { id: "p", text: "Feeling low some evenings", updatedAt: "2026-10-15T12:00:00.000Z", shared: false, earlier: [] };

  it("keeps who can see a note when it is edited", () => {
    expect(editVisitNote([shared, mine], "s", "Ask about the dry cough", "2026-10-16T08:00:00.000Z")[0])
      .toEqual({ id: "s", text: "Ask about the dry cough", updatedAt: "2026-10-16T08:00:00.000Z", shared: true,
        earlier: [{ text: "Ask about the cough", updatedAt: "2026-10-15T09:00:00.000Z" }] });
  });

  it("treats notes saved before sharing existed as private", () => {
    const store = memoryStore();
    store.setItem("k", JSON.stringify([{ id: "old", text: "Old note", updatedAt: "2026-10-14T10:00:00.000Z" }]));
    expect(readVisitNotes("k", store)[0].shared).toBe(false);
  });

  it("gives /care only shared notes, merged with the API's questions, newest first", () => {
    const api = [{ note: "Ask a healthcare professional about: dizzy", occurredAt: "2026-10-15T10:00:00.000Z" }];
    expect(doctorQuestionsForCare([mine, shared], api)).toEqual([
      api[0],
      { note: "Ask about the cough", occurredAt: "2026-10-15T09:00:00.000Z" },
    ]);
  });
});

describe("blood pressure sharing switch", () => {
  it("is on by default for the demo, then follows what she chose", async () => {
    const { readShareBloodPressure, writeShareBloodPressure } = await import("../../mobile/src/lib/sharing.js");
    const store = memoryStore();
    expect(readShareBloodPressure(store)).toBe(true);
    expect(writeShareBloodPressure(false, store)).toBe(true);
    expect(readShareBloodPressure(store)).toBe(false);
    expect(writeShareBloodPressure(false, blockedStore)).toBe(false);
  });
});
