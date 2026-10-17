import { describe, expect, it } from "vitest";
import { isStopBusy, stopRowsAfter, type StopEvent, type StopRows } from "../../mobile/src/lib/stopMedicine.js";

const run = (events: Array<[string, StopEvent]>, start: StopRows = {}) =>
  events.reduce((rows, [id, event]) => stopRowsAfter(rows, id, event), start);

describe("stop this medicine: row states", () => {
  it("needs two separate taps: open, then confirm", () => {
    expect(run([["a", "open"]])).toEqual({ a: { status: "confirm", failed: false } });
    expect(run([["a", "open"], ["a", "confirm"]])).toEqual({ a: { status: "stopping", failed: false } });
    // A confirm without an open panel does nothing.
    expect(run([["a", "confirm"]])).toEqual({});
  });

  it("No, keep it closes the panel and the row shows normally", () => {
    expect(run([["a", "open"], ["a", "cancel"]])).toEqual({});
  });

  it("keeps one confirm panel open at a time, but never hides a stopped row", () => {
    const rows = run([["a", "open"], ["a", "confirm"], ["a", "stopped"], ["b", "open"], ["c", "open"]]);
    expect(rows).toEqual({ a: { status: "stopped", failed: false }, c: { status: "confirm", failed: false } });
  });

  it("a failed stop goes back to the panel with the error; a retry clears it", () => {
    const failed = run([["a", "open"], ["a", "confirm"], ["a", "stopFailed"]]);
    expect(failed).toEqual({ a: { status: "confirm", failed: true } });
    expect(stopRowsAfter(failed, "a", "confirm")).toEqual({ a: { status: "stopping", failed: false } });
  });

  it("Undo starts it again; a failed undo keeps the stopped row with the error", () => {
    const stopped = run([["a", "open"], ["a", "confirm"], ["a", "stopped"]]);
    expect(run([["a", "undo"], ["a", "undone"]], stopped)).toEqual({});
    expect(run([["a", "undo"], ["a", "undoFailed"]], stopped)).toEqual({ a: { status: "stopped", failed: true } });
    // Cancel never closes a stopped row (only the confirm panel).
    expect(stopRowsAfter(stopped, "a", "cancel")).toBe(stopped);
  });

  it("is busy only while a request is in flight", () => {
    expect(isStopBusy(undefined)).toBe(false);
    expect(isStopBusy({ status: "confirm", failed: false })).toBe(false);
    expect(isStopBusy({ status: "stopping", failed: false })).toBe(true);
    expect(isStopBusy({ status: "undoing", failed: false })).toBe(true);
    expect(isStopBusy({ status: "stopped", failed: false })).toBe(false);
  });
});
