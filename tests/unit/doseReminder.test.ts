import { describe, expect, it } from "vitest";
import { dosesDueForReminder, readGivenReminders, reminderKey, writeGivenReminders } from "../../mobile/src/lib/doseReminder.js";
import type { DerivedDose } from "../../shared/contract.js";
import type { KeyValueStore } from "../../mobile/src/lib/localStore.js";

const dose = (id: string, scheduledAt: string, status: DerivedDose["status"] = "upcoming"): DerivedDose => ({
  id, medicationId: `m-${id}`, medicationName: `Tablet ${id}`, strength: null, scheduledAt, status, eventAt: null, nudgeCount: 0, lastNudgeAt: null,
});
const at = (iso: string) => Date.parse(iso);

describe("dose-time reminder", () => {
  // Saved dose times (from the schedules), not fixed hours: 10:00 and 13:30 Singapore.
  const doses = [dose("A", "2026-10-16T02:00:00.000Z"), dose("B", "2026-10-16T05:30:00.000Z")];

  it("fires when the clock reaches a saved dose time, until the first nudge would be due", () => {
    expect(dosesDueForReminder(doses, at("2026-10-16T01:59:59.000Z"), new Set())).toEqual([]);
    expect(dosesDueForReminder(doses, at("2026-10-16T02:00:00.000Z"), new Set()).map((d) => d.id)).toEqual(["A"]);
    expect(dosesDueForReminder(doses, at("2026-10-16T02:59:00.000Z"), new Set()).map((d) => d.id)).toEqual(["A"]);
    expect(dosesDueForReminder(doses, at("2026-10-16T03:00:00.000Z"), new Set())).toEqual([]);
    expect(dosesDueForReminder(doses, at("2026-10-16T05:31:00.000Z"), new Set()).map((d) => d.id)).toEqual(["B"]);
  });

  it("fires once per dose, and never for a dose already taken or skipped", () => {
    const given = new Set([reminderKey(doses[0]!)]);
    expect(dosesDueForReminder(doses, at("2026-10-16T02:01:00.000Z"), given)).toEqual([]);
    expect(dosesDueForReminder([dose("A", "2026-10-16T02:00:00.000Z", "taken")], at("2026-10-16T02:01:00.000Z"), new Set())).toEqual([]);
    expect(dosesDueForReminder([dose("A", "2026-10-16T02:00:00.000Z", "skipped")], at("2026-10-16T02:01:00.000Z"), new Set())).toEqual([]);
    // The same schedule tomorrow is a new dose.
    expect(dosesDueForReminder([dose("A", "2026-10-17T02:00:00.000Z")], at("2026-10-17T02:00:30.000Z"), given).map((d) => d.id)).toEqual(["A"]);
  });

  it("remembers given reminders across a reload", () => {
    const data = new Map<string, string>();
    const store: KeyValueStore = { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => { data.set(k, v); }, removeItem: (k) => { data.delete(k); } };
    expect(readGivenReminders(store).size).toBe(0);
    writeGivenReminders(new Set(["a|1", "b|2"]), store);
    expect([...readGivenReminders(store)]).toEqual(["a|1", "b|2"]);
    store.setItem("pawtner.doseReminders", "not json");
    expect(readGivenReminders(store).size).toBe(0);
  });
});
