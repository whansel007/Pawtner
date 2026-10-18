import { describe, expect, it } from "vitest";
import { STOP_CONFIRM_GUARD_MS } from "../../mobile/src/config/medicines.js";
import { canConfirmStop, isStopBusy, stopRowsAfter, type StopEvent, type StopRows } from "../../mobile/src/lib/stopMedicine.js";

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
