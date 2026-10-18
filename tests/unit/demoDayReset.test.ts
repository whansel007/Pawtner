import { describe, expect, it } from "vitest";
import { isLive, liveItems, resetClinicMemos, resetVisitNotes } from "../../mobile/src/lib/demoDayReset.js";
import { editVisitNote, readVisitNotes, writeVisitNotes, type VisitNote } from "../../mobile/src/lib/visitNotes.js";
import { readClinicMemos, type MemoPhoto } from "../../mobile/src/lib/clinicMemo.js";
import { resetDemoStorage } from "../../mobile/src/lib/demoReset.js";
import { CLINIC_MEMO, VISIT_NOTES } from "../../mobile/src/config/health.js";
import type { KeyValueStore } from "../../mobile/src/lib/localStore.js";

function memoryStore(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (key) => data.get(key) ?? null, setItem: (key, value) => { data.set(key, value); }, removeItem: (key) => { data.delete(key); } };
}

const TZ = "Asia/Singapore";
// 18 Oct, 17:00 in Singapore; the day starts at 18 Oct 00:00 SGT = 17 Oct 16:00Z.
const NOW = new Date("2026-10-18T09:00:00.000Z");
const DAY_START = Date.parse("2026-10-17T16:00:00.000Z");
const STAMP = NOW.toISOString();
const YESTERDAY = "2026-10-17T03:00:00.000Z";
const YESTERDAY_LATE = "2026-10-17T15:59:59.000Z";
const TODAY = "2026-10-18T01:00:00.000Z";
const TODAY_LATER = "2026-10-18T02:00:00.000Z";

const note = (id: string, text: string, updatedAt: string, earlier: VisitNote["earlier"] = []): VisitNote => ({ id, text, updatedAt, shared: false, earlier });
const photo = (id: string, addedAt: string): MemoPhoto => ({ id, dataUrl: "data:image/jpeg;base64,AA", addedAt });

describe("Reset to morning on the phone (hide, never delete)", () => {
  it("hides a note written today, keeps yesterday's", () => {
    const result = resetVisitNotes([note("t", "today", TODAY), note("y", "yesterday", YESTERDAY_LATE)], DAY_START, STAMP);
    expect(result).toHaveLength(2);
    expect(result[0].resetAt).toBe(STAMP);
    expect(result[1]).toEqual(note("y", "yesterday", YESTERDAY_LATE));
    expect(liveItems(result).map((item) => item.id)).toEqual(["y"]);
  });

  it("a note written earlier but edited today shows its newest wording from before today; today's wordings are kept, hidden", () => {
    const edited = note("n", "today v2", TODAY_LATER, [{ text: "today v1", updatedAt: TODAY }, { text: "yesterday v2", updatedAt: YESTERDAY_LATE }, { text: "yesterday v1", updatedAt: YESTERDAY }]);
    const [result] = resetVisitNotes([edited], DAY_START, STAMP);
    expect(isLive(result)).toBe(true);
    expect(result.text).toBe("yesterday v2");
    expect(result.updatedAt).toBe(YESTERDAY_LATE);
    expect(result.earlier).toEqual([{ text: "yesterday v1", updatedAt: YESTERDAY }]);
    expect(result.resetVersions).toEqual([
      { text: "today v2", updatedAt: TODAY_LATER, resetAt: STAMP },
      { text: "today v1", updatedAt: TODAY, resetAt: STAMP },
    ]);
  });

  it("a second reset never restamps hidden notes, and later edits keep the hidden wordings", () => {
    const once = resetVisitNotes([note("t", "today", TODAY), note("n", "today", TODAY, [{ text: "old", updatedAt: YESTERDAY }])], DAY_START, STAMP);
    const twice = resetVisitNotes(once, DAY_START, "2026-10-18T10:00:00.000Z");
    expect(twice).toEqual(once);
    const editedAgain = editVisitNote(twice, "n", "new today", TODAY_LATER);
    expect(editedAgain[0].resetVersions).toEqual(once[1].resetVersions);
  });

  it("hides photos added today; yesterday's and old photos with no time stay", () => {
    const result = resetClinicMemos([photo("t", TODAY), photo("y", YESTERDAY), photo("old", "")], DAY_START, STAMP);
    expect(liveItems(result).map((item) => item.id)).toEqual(["y", "old"]);
    expect(result[0].resetAt).toBe(STAMP);
  });

  it("resetDemoStorage keeps every note and photo in storage and the marks survive a read and a save", () => {
    const store = memoryStore();
    writeVisitNotes(VISIT_NOTES.storageKey, [note("t", "today", TODAY), note("y", "yesterday", YESTERDAY)], store);
    store.setItem(CLINIC_MEMO.storageKey, JSON.stringify([photo("t", TODAY), photo("y", YESTERDAY)]));
    resetDemoStorage(TZ, store, NOW);
    const notes = readVisitNotes(VISIT_NOTES.storageKey, store);
    expect(notes.map((item) => [item.id, item.resetAt ?? null])).toEqual([["t", STAMP], ["y", null]]);
    writeVisitNotes(VISIT_NOTES.storageKey, notes, store);
    expect(readVisitNotes(VISIT_NOTES.storageKey, store)).toEqual(notes);
    const photos = readClinicMemos(CLINIC_MEMO.storageKey, store);
    expect(photos.map((item) => [item.id, item.resetAt ?? null])).toEqual([["t", STAMP], ["y", null]]);
  });
});
