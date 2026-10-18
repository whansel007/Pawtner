import { describe, expect, it } from "vitest";
import { STOP_CONFIRM_GUARD_MS } from "../../mobile/src/config/medicines.js";
import { canConfirmStop, isStopBusy, isStopGone, stopRowsAfter, type StopEvent, type StopRows } from "../../mobile/src/lib/stopMedicine.js";

const T = 10_000; // when the panel opens
const LATER = T + STOP_CONFIRM_GUARD_MS; // first moment "Yes, stop it" counts
const run = (events: Array<[string, StopEvent, number]>, start: StopRows = {}) =>
  events.reduce((rows, [id, event, now]) => stopRowsAfter(rows, id, event, now), start);
const opened = run([["a", "open", T]]);

describe("stop this medicine: row states", () => {
  it("needs two separate taps: open, then confirm", () => {
    expect(opened).toEqual({ a: { status: "confirm", failed: false, openedAt: T } });
    expect(stopRowsAfter(opened, "a", "confirm", LATER)).toEqual({ a: { status: "stopping", failed: false, openedAt: T } });
    // A confirm without an open panel does nothing.
    expect(run([["a", "confirm", LATER]])).toEqual({});
  });

  it("No, keep it closes the panel and the row shows normally", () => {
    expect(stopRowsAfter(opened, "a", "cancel", T + 50)).toEqual({});
  });

  it("keeps one confirm panel open at a time, but never hides a stopped row", () => {
    const rows = run([["a", "open", T], ["a", "confirm", LATER], ["a", "stopped", LATER], ["b", "open", LATER], ["c", "open", LATER]]);
    expect(rows).toEqual({ a: { status: "stopped", failed: false, openedAt: T }, c: { status: "confirm", failed: false, openedAt: LATER } });
  });

  it("Undo starts it again; a failed undo keeps the stopped row with the error", () => {
    const stopped = run([["a", "open", T], ["a", "confirm", LATER], ["a", "stopped", LATER]]);
    expect(run([["a", "undo", LATER], ["a", "undone", LATER]], stopped)).toEqual({});
    expect(run([["a", "undo", LATER], ["a", "undoFailed", LATER]], stopped)).toEqual({ a: { status: "stopped", failed: true, openedAt: T } });
    // Cancel never closes a stopped row (only the confirm panel).
    expect(stopRowsAfter(stopped, "a", "cancel", LATER)).toBe(stopped);
  });

  it("is busy only while a request is in flight", () => {
    expect(isStopBusy(undefined)).toBe(false);
    expect(isStopBusy({ status: "confirm", failed: false, openedAt: T })).toBe(false);
    expect(isStopBusy({ status: "stopping", failed: false, openedAt: T })).toBe(true);
    expect(isStopBusy({ status: "undoing", failed: false, openedAt: T })).toBe(true);
    expect(isStopBusy({ status: "stopped", failed: false, openedAt: T })).toBe(false);
  });
});

describe("stop this medicine: double-tap guard", () => {
  it("is one second long", () => {
    expect(STOP_CONFIRM_GUARD_MS).toBe(1000);
  });

  it("ignores Yes at +0 ms and +999 ms: the row stays on confirm and no API call is allowed", () => {
    for (const now of [T, T + 999]) {
      expect(canConfirmStop(opened.a, now)).toBe(false); // useStopMedicine returns before the API on false
      expect(stopRowsAfter(opened, "a", "confirm", now)).toBe(opened); // same object: nothing changes on screen
    }
  });

  it("stops at +1000 ms", () => {
    expect(canConfirmStop(opened.a, T + 1000)).toBe(true);
    expect(stopRowsAfter(opened, "a", "confirm", T + 1000).a.status).toBe("stopping");
  });

  it("does not restart after a failed stop: she can retry at once", () => {
    const failed = run([["a", "confirm", LATER], ["a", "stopFailed", LATER + 300]], opened);
    expect(failed.a).toEqual({ status: "confirm", failed: true, openedAt: T });
    expect(canConfirmStop(failed.a, LATER + 301)).toBe(true);
    expect(stopRowsAfter(failed, "a", "confirm", LATER + 301).a).toEqual({ status: "stopping", failed: false, openedAt: T });
  });

  it("restarts when the panel is opened again", () => {
    const reopened = run([["a", "cancel", T + 2000], ["a", "open", T + 3000]], opened);
    expect(canConfirmStop(reopened.a, T + 3500)).toBe(false);
    expect(canConfirmStop(reopened.a, T + 4000)).toBe(true);
  });
});

describe("stop this medicine: only the latest stop keeps its Undo", () => {
  const stopA = run([["a", "open", T], ["a", "confirm", LATER], ["a", "stopped", LATER]]);
  const stopB = (start: StopRows) => run([["b", "open", LATER + 10], ["b", "confirm", LATER + 1010], ["b", "stopped", LATER + 1100]], start);

  it("stop A, then stop B: A's row goes, B shows Undo", () => {
    const rows = stopB(stopA);
    expect(rows.a.status).toBe("gone");
    expect(isStopGone(rows.a)).toBe(true);
    expect(rows.b).toEqual({ status: "stopped", failed: false, openedAt: LATER + 10 });
    // A gone row can't be undone.
    expect(stopRowsAfter(rows, "a", "undo", LATER + 2000)).toBe(rows);
  });

  it("Undo on B brings B back; A stays stopped (gone from the list)", () => {
    const rows = run([["b", "undo", LATER + 2000], ["b", "undone", LATER + 2100]], stopB(stopA));
    expect(rows).toEqual({ a: { status: "gone", failed: false, openedAt: T } });
  });

  it("opening another row's panel keeps the current Undo; only a successful stop ends it", () => {
    const opened = stopRowsAfter(stopA, "b", "open", LATER + 10);
    expect(opened.a.status).toBe("stopped");
    const confirming = stopRowsAfter(opened, "b", "confirm", LATER + 1010);
    expect(confirming.a.status).toBe("stopped");
    const failed = stopRowsAfter(confirming, "b", "stopFailed", LATER + 1100);
    expect(failed.a.status).toBe("stopped");
  });

  it("does not interrupt an Undo still in flight on another row", () => {
    const undoingA = stopRowsAfter(stopA, "a", "undo", LATER + 5);
    const rows = stopB(undoingA);
    expect(rows.a.status).toBe("undoing");
    expect(stopRowsAfter(rows, "a", "undone", LATER + 1200).a).toBeUndefined();
  });
});
